package service

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"octo-crm/backend/internal/domain"
	"octo-crm/backend/internal/repository"
)

type IntegrationService struct {
	contactService *ContactService
	dealService    *DealService
	taskService    *TaskService
	dealRepo       *repository.DealRepository
	auditRepo      *repository.AuditRepository
	pillarService  *PillarService
}

func (s *IntegrationService) SetPillarService(ps *PillarService) {
	s.pillarService = ps
}

func NewIntegrationService(
	contactService *ContactService,
	dealService *DealService,
	taskService *TaskService,
	dealRepo *repository.DealRepository,
	auditRepo *repository.AuditRepository,
) *IntegrationService {
	return &IntegrationService{
		contactService: contactService,
		dealService:    dealService,
		taskService:    taskService,
		dealRepo:       dealRepo,
		auditRepo:      auditRepo,
	}
}

func (s *IntegrationService) IngestLead(workspaceID, currentUserID string, req domain.LeadIntakeRequest) (*domain.LeadIntakeResponse, error) {
	// 1. Parse name
	fullName := strings.TrimSpace(req.FullName)
	parts := strings.SplitN(fullName, " ", 2)
	firstName := parts[0]
	lastName := ""
	if len(parts) > 1 {
		lastName = parts[1]
	}

	// 2. Company creation / mapping if provided
	var companyID *string
	if strings.TrimSpace(req.CompanyName) != "" {
		comp, err := s.contactService.CreateCompany(workspaceID, currentUserID, domain.Company{
			Name: strings.TrimSpace(req.CompanyName),
		})
		if err == nil && comp != nil {
			companyID = &comp.ID
		}
	}

	// 3. Lead Source & Tags
	leadSource := "Website Form"
	if strings.TrimSpace(req.LeadSource) != "" {
		leadSource = strings.TrimSpace(req.LeadSource)
	} else if strings.TrimSpace(req.UTMSource) != "" {
		u := strings.ToLower(strings.TrimSpace(req.UTMSource))
		if strings.Contains(u, "ig") || strings.Contains(u, "instagram") {
			leadSource = "Meta Ads (Instagram)"
		} else if strings.Contains(u, "fb") || strings.Contains(u, "facebook") || strings.Contains(u, "meta") {
			leadSource = "Meta Ads (Facebook)"
		} else if strings.Contains(u, "google") || strings.Contains(u, "gads") {
			leadSource = "Google Ads"
		} else if strings.Contains(u, "tiktok") {
			leadSource = "TikTok Ads"
		} else if strings.Contains(u, "wa") || strings.Contains(u, "whatsapp") || strings.Contains(u, "ctwa") {
			leadSource = "WhatsApp CTWA"
		} else {
			leadSource = req.UTMSource
		}
	} else if strings.Contains(strings.ToLower(req.FormType), "tap") || strings.Contains(strings.ToLower(req.ProductInterest), "tap") {
		leadSource = "OCTO Tap"
	} else if req.FormType != "" {
		leadSource = req.FormType
	}

	tags := []string{"Lead Intake"}
	if leadSource != "" {
		tags = append(tags, leadSource)
	}
	if req.ProductInterest != "" {
		tags = append(tags, req.ProductInterest)
	}
	if req.UTMCampaign != "" {
		tags = append(tags, "Campaign:"+req.UTMCampaign)
	}

	consentStatus := "pending"
	if req.ConsentGiven {
		consentStatus = "opted_in"
	}

	customData := map[string]interface{}{}
	if req.CompanySize != "" {
		customData["company_size"] = req.CompanySize
	}
	if req.PreferredDate != "" {
		customData["preferred_date"] = req.PreferredDate
	}
	if req.PartnerType != "" {
		customData["partner_type"] = req.PartnerType
	}
	if req.Location != "" {
		customData["location"] = req.Location
	}
	if req.UTMSource != "" {
		customData["utm_source"] = req.UTMSource
	}
	if req.UTMMedium != "" {
		customData["utm_medium"] = req.UTMMedium
	}
	if req.UTMCampaign != "" {
		customData["utm_campaign"] = req.UTMCampaign
	}
	if req.UTMContent != "" {
		customData["utm_content"] = req.UTMContent
	}
	if req.UTMTerm != "" {
		customData["utm_term"] = req.UTMTerm
	}
	if req.Platform != "" {
		customData["platform"] = req.Platform
	}
	if req.AdID != "" {
		customData["ad_id"] = req.AdID
	}
	if req.FormID != "" {
		customData["form_id"] = req.FormID
	}
	customBytes, _ := json.Marshal(customData)

	notes := req.Message
	if req.PreferredDate != "" {
		notes = fmt.Sprintf("Preferensi Jadwal: %s. %s", req.PreferredDate, notes)
	}

	// 4. Create Contact & Sales Assignee (Pre-Sales department only)
	var ownerID *string
	if strings.TrimSpace(currentUserID) != "" {
		clean := strings.TrimSpace(currentUserID)
		if isPresales, err := s.dealRepo.IsPresalesMember(workspaceID, clean); err == nil && isPresales {
			ownerID = &clean
		}
	} else if req.AssigneeID != nil && strings.TrimSpace(*req.AssigneeID) != "" {
		clean := strings.TrimSpace(*req.AssigneeID)
		if isPresales, err := s.dealRepo.IsPresalesMember(workspaceID, clean); err == nil && isPresales {
			ownerID = &clean
			currentUserID = clean
		}
	}

	contact, err := s.contactService.CreateContact(workspaceID, currentUserID, domain.CreateContactRequest{
		CompanyID:     companyID,
		FirstName:     firstName,
		LastName:      lastName,
		Email:         req.Email,
		Phone:         req.Phone,
		JobTitle:      req.PartnerType,
		LeadSource:    leadSource,
		Tags:          tags,
		Notes:         notes,
		ConsentStatus: consentStatus,
		CustomFields:  customBytes,
		OwnerID:       ownerID,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create contact: %w", err)
	}

	resp := &domain.LeadIntakeResponse{
		ContactID: contact.ID,
		CompanyID: companyID,
		Message:   "Lead ingested successfully",
		Tags:      tags,
	}

	// 5. Deal Creation in Default Pipeline ("Lead Masuk" Stage)
	pipelines, err := s.dealRepo.GetPipelines(workspaceID)
	if err == nil && len(pipelines) > 0 {
		var defaultPipeline *domain.Pipeline
		for i := range pipelines {
			if pipelines[i].IsDefault {
				defaultPipeline = &pipelines[i]
				break
			}
		}
		if defaultPipeline == nil {
			defaultPipeline = &pipelines[0]
		}

		if len(defaultPipeline.Stages) > 0 {
			firstStage := defaultPipeline.Stages[0]

			// Nilai kesepakatan default 0 (dapat di-update setelah follow-up/menghubungi calon klien)
			dealVal := 0.0
			if req.EstimatedValue != nil && *req.EstimatedValue > 0 {
				dealVal = *req.EstimatedValue
			}

			dealTitle := fmt.Sprintf("Peluang %s", req.FullName)
			if req.ProductInterest != "" {
				dealTitle = fmt.Sprintf("Minat %s - %s", req.ProductInterest, req.FullName)
			}
			if req.CompanyName != "" {
				dealTitle = fmt.Sprintf("%s (%s)", dealTitle, req.CompanyName)
			}

			deal, err := s.dealService.CreateDeal(workspaceID, currentUserID, domain.CreateDealRequest{
				PipelineID: defaultPipeline.ID,
				StageID:    firstStage.ID,
				ContactID:  &contact.ID,
				CompanyID:  companyID,
				OwnerID:    ownerID,
				Title:      dealTitle,
				Value:      dealVal,
				Currency:   "IDR",
				Status:     domain.DealStatusOpen,
				Notes:      fmt.Sprintf("Inbound intake dari %s", req.FormType),
			})
			if err == nil && deal != nil {
				resp.DealID = &deal.ID
			}
		}
	}

	// 6. Task Creation (Due Today with SLA)
	todayDue := time.Now().Add(4 * time.Hour)
	taskTitle := fmt.Sprintf("Hubungi Calon Klien: %s", req.FullName)
	taskDesc := fmt.Sprintf("Tindak lanjut formulir %s (%s). Catatan: %s", req.FormType, req.ProductInterest, req.Message)

	task, err := s.taskService.CreateTask(workspaceID, currentUserID, domain.CreateTaskRequest{
		ContactID:    &contact.ID,
		DealID:       resp.DealID,
		AssignedToID: ownerID,
		Title:        taskTitle,
		Description:  taskDesc,
		DueDate:      &todayDue,
		Priority:     domain.TaskPriorityHigh,
		Status:       domain.TaskStatusOpen,
	})
	if err == nil && task != nil {
		resp.TaskID = &task.ID
	}

	_ = s.auditRepo.LogEvent(&domain.AuditEvent{
		WorkspaceID: workspaceID,
		UserID:      ownerID,
		Action:      "lead_intake_processed",
		EntityType:  "integration",
		EntityID:    contact.ID,
		Description: fmt.Sprintf("Ecosystem Lead Intake processed for %s (source: %s)", req.FullName, leadSource),
	})

	return resp, nil
}
