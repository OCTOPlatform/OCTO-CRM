package service

import (
	"bytes"
	"encoding/csv"
	"errors"
	"fmt"
	"io"
	"strings"

	"octo-crm/backend/internal/domain"
	"octo-crm/backend/internal/repository"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

type ContactService struct {
	contactRepo *repository.ContactRepository
	auditRepo   *repository.AuditRepository
}

func NewContactService(contactRepo *repository.ContactRepository, auditRepo *repository.AuditRepository) *ContactService {
	return &ContactService{
		contactRepo: contactRepo,
		auditRepo:   auditRepo,
	}
}

// Contact CRUD
func (s *ContactService) CreateContact(workspaceID, currentUserID string, req domain.CreateContactRequest) (*domain.Contact, error) {
	contact := domain.Contact{
		ID:            uuid.New().String(),
		WorkspaceID:   workspaceID,
		CompanyID:     req.CompanyID,
		FirstName:     strings.TrimSpace(req.FirstName),
		LastName:      strings.TrimSpace(req.LastName),
		Email:         strings.ToLower(strings.TrimSpace(req.Email)),
		Phone:         strings.TrimSpace(req.Phone),
		JobTitle:      strings.TrimSpace(req.JobTitle),
		LeadSource:    req.LeadSource,
		Tags:          pq.StringArray(req.Tags),
		Notes:         req.Notes,
		ConsentStatus: req.ConsentStatus,
		CustomFields:  req.CustomFields,
		OwnerID:       req.OwnerID,
	}

	if err := s.contactRepo.CreateContact(&contact); err != nil {
		return nil, err
	}

	_ = s.auditRepo.LogEvent(&domain.AuditEvent{
		WorkspaceID: workspaceID,
		UserID:      &currentUserID,
		Action:      "contact_created",
		EntityType:  "contact",
		EntityID:    contact.ID,
		Description: fmt.Sprintf("Created contact %s %s", contact.FirstName, contact.LastName),
	})

	return s.contactRepo.GetContactByID(workspaceID, contact.ID)
}

func (s *ContactService) GetContact(workspaceID, contactID string) (*domain.Contact, error) {
	return s.contactRepo.GetContactByID(workspaceID, contactID)
}

func (s *ContactService) ListContacts(workspaceID string, filter domain.ContactFilter) ([]domain.Contact, int, error) {
	return s.contactRepo.ListContacts(workspaceID, filter)
}

func (s *ContactService) UpdateContact(workspaceID, currentUserID, contactID string, req domain.UpdateContactRequest) (*domain.Contact, error) {
	contact, err := s.contactRepo.GetContactByID(workspaceID, contactID)
	if err != nil {
		return nil, err
	}

	if req.FirstName != nil {
		contact.FirstName = strings.TrimSpace(*req.FirstName)
	}
	if req.LastName != nil {
		contact.LastName = strings.TrimSpace(*req.LastName)
	}
	if req.Email != nil {
		contact.Email = strings.ToLower(strings.TrimSpace(*req.Email))
	}
	if req.Phone != nil {
		contact.Phone = strings.TrimSpace(*req.Phone)
	}
	if req.JobTitle != nil {
		contact.JobTitle = strings.TrimSpace(*req.JobTitle)
	}
	if req.LeadSource != nil {
		contact.LeadSource = *req.LeadSource
	}
	if req.Tags != nil {
		contact.Tags = pq.StringArray(req.Tags)
	}
	if req.Notes != nil {
		contact.Notes = *req.Notes
	}
	if req.ConsentStatus != nil {
		contact.ConsentStatus = *req.ConsentStatus
	}
	if req.IsArchived != nil {
		contact.IsArchived = *req.IsArchived
	}
	if req.CompanyID != nil {
		contact.CompanyID = req.CompanyID
	}
	if req.OwnerID != nil {
		contact.OwnerID = req.OwnerID
	}
	if len(req.CustomFields) > 0 {
		contact.CustomFields = req.CustomFields
	}

	if err := s.contactRepo.UpdateContact(workspaceID, contact); err != nil {
		return nil, err
	}

	_ = s.auditRepo.LogEvent(&domain.AuditEvent{
		WorkspaceID: workspaceID,
		UserID:      &currentUserID,
		Action:      "contact_updated",
		EntityType:  "contact",
		EntityID:    contact.ID,
		Description: fmt.Sprintf("Updated contact %s %s", contact.FirstName, contact.LastName),
	})

	return s.contactRepo.GetContactByID(workspaceID, contact.ID)
}

func (s *ContactService) DeleteContact(workspaceID, currentUserID, contactID string) error {
	if err := s.contactRepo.DeleteContact(workspaceID, contactID); err != nil {
		return err
	}

	_ = s.auditRepo.LogEvent(&domain.AuditEvent{
		WorkspaceID: workspaceID,
		UserID:      &currentUserID,
		Action:      "contact_deleted",
		EntityType:  "contact",
		EntityID:    contactID,
		Description: fmt.Sprintf("Deleted contact %s", contactID),
	})

	return nil
}

func (s *ContactService) FindDuplicates(workspaceID string) ([]domain.DuplicateCandidate, error) {
	return s.contactRepo.FindDuplicateCandidates(workspaceID)
}

func (s *ContactService) MergeContacts(workspaceID, currentUserID string, req domain.MergeContactsRequest) error {
	if req.PrimaryContactID == req.SecondaryContactID {
		return errors.New("cannot merge contact with itself")
	}

	if err := s.contactRepo.MergeContacts(workspaceID, req); err != nil {
		return err
	}

	_ = s.auditRepo.LogEvent(&domain.AuditEvent{
		WorkspaceID: workspaceID,
		UserID:      &currentUserID,
		Action:      "contacts_merged",
		EntityType:  "contact",
		EntityID:    req.PrimaryContactID,
		Description: fmt.Sprintf("Merged secondary contact %s into primary %s", req.SecondaryContactID, req.PrimaryContactID),
	})

	return nil
}

// CSV Preview and Import
func (s *ContactService) PreviewCSV(fileReader io.Reader) (*domain.CSVPreviewResponse, error) {
	reader := csv.NewReader(fileReader)
	records, err := reader.ReadAll()
	if err != nil {
		return nil, fmt.Errorf("invalid CSV format: %w", err)
	}

	if len(records) < 2 {
		return nil, errors.New("CSV must contain a header row and at least one data row")
	}

	headers := records[0]
	for i := range headers {
		headers[i] = strings.TrimSpace(headers[i])
	}

	var previewRows []domain.CSVImportRow
	validCount := 0
	errorCount := 0

	for i := 1; i < len(records); i++ {
		row := records[i]
		rowMap := make(map[string]string)
		for j, val := range row {
			if j < len(headers) {
				rowMap[headers[j]] = strings.TrimSpace(val)
			}
		}

		var rowErrors []string
		// Check required fields (e.g., name or first_name)
		hasName := false
		for k, v := range rowMap {
			lk := strings.ToLower(k)
			if (strings.Contains(lk, "name") || strings.Contains(lk, "nama")) && strings.TrimSpace(v) != "" {
				hasName = true
				break
			}
		}

		if !hasName {
			rowErrors = append(rowErrors, "Missing contact name")
			errorCount++
		} else {
			validCount++
		}

		if len(previewRows) < 10 {
			previewRows = append(previewRows, domain.CSVImportRow{
				RowNumber: i,
				Data:      rowMap,
				Errors:    rowErrors,
				IsWarning: len(rowErrors) > 0,
			})
		}
	}

	return &domain.CSVPreviewResponse{
		TotalRows:       len(records) - 1,
		DetectedHeaders: headers,
		PreviewRows:     previewRows,
		ValidRowCount:   validCount,
		ErrorRowCount:   errorCount,
	}, nil
}

func (s *ContactService) CommitCSVImport(workspaceID, currentUserID string, req domain.CSVCommitRequest) (int, int, error) {
	successCount := 0
	failedCount := 0

	for _, row := range req.Rows {
		firstName := ""
		lastName := ""
		email := ""
		phone := ""
		jobTitle := ""
		leadSource := "CSV Import"

		for header, mappedField := range req.ColumnMapping {
			val := row[header]
			switch mappedField {
			case "first_name":
				firstName = val
			case "last_name":
				lastName = val
			case "name", "full_name":
				parts := strings.SplitN(val, " ", 2)
				firstName = parts[0]
				if len(parts) > 1 {
					lastName = parts[1]
				}
			case "email":
				email = val
			case "phone":
				phone = val
			case "job_title":
				jobTitle = val
			case "lead_source":
				if val != "" {
					leadSource = val
				}
			}
		}

		if firstName == "" {
			failedCount++
			if !req.SkipOnError {
				return successCount, failedCount, errors.New("contact first name is required")
			}
			continue
		}

		contact := domain.Contact{
			WorkspaceID:   workspaceID,
			FirstName:     firstName,
			LastName:      lastName,
			Email:         strings.ToLower(strings.TrimSpace(email)),
			Phone:         strings.TrimSpace(phone),
			JobTitle:      jobTitle,
			LeadSource:    leadSource,
			Tags:          pq.StringArray{"Imported"},
			ConsentStatus: "granted",
		}

		if err := s.contactRepo.CreateContact(&contact); err != nil {
			failedCount++
			if !req.SkipOnError {
				return successCount, failedCount, err
			}
		} else {
			successCount++
		}
	}

	_ = s.auditRepo.LogEvent(&domain.AuditEvent{
		WorkspaceID: workspaceID,
		UserID:      &currentUserID,
		Action:      "contacts_imported_csv",
		EntityType:  "contact",
		EntityID:    workspaceID,
		Description: fmt.Sprintf("Imported %d contacts (%d failed) from CSV", successCount, failedCount),
	})

	return successCount, failedCount, nil
}

func (s *ContactService) ExportContactsCSV(workspaceID, currentUserID string) ([]byte, error) {
	contacts, _, err := s.contactRepo.ListContacts(workspaceID, domain.ContactFilter{
		PerPage: 10000,
	})
	if err != nil {
		return nil, err
	}

	buf := new(bytes.Buffer)
	writer := csv.NewWriter(buf)

	// Write header
	header := []string{"ID", "First Name", "Last Name", "Email", "Phone", "Company", "Job Title", "Lead Source", "Tags", "Notes", "Created At"}
	if err := writer.Write(header); err != nil {
		return nil, err
	}

	for _, c := range contacts {
		company := ""
		if c.CompanyName != nil {
			company = *c.CompanyName
		}
		tagsStr := strings.Join(c.Tags, "; ")

		row := []string{
			c.ID,
			c.FirstName,
			c.LastName,
			c.Email,
			c.Phone,
			company,
			c.JobTitle,
			c.LeadSource,
			tagsStr,
			c.Notes,
			c.CreatedAt.Format("2006-01-02 15:04:05"),
		}
		if err := writer.Write(row); err != nil {
			return nil, err
		}
	}

	writer.Flush()
	if err := writer.Error(); err != nil {
		return nil, err
	}

	_ = s.auditRepo.LogEvent(&domain.AuditEvent{
		WorkspaceID: workspaceID,
		UserID:      &currentUserID,
		Action:      "contacts_exported_csv",
		EntityType:  "contact",
		EntityID:    workspaceID,
		Description: fmt.Sprintf("Exported %d contacts to CSV", len(contacts)),
	})

	return buf.Bytes(), nil
}

// Company CRUD
func (s *ContactService) CreateCompany(workspaceID, currentUserID string, req domain.Company) (*domain.Company, error) {
	req.WorkspaceID = workspaceID
	if err := s.contactRepo.CreateCompany(&req); err != nil {
		return nil, err
	}
	return s.contactRepo.GetCompanyByID(workspaceID, req.ID)
}

func (s *ContactService) ListCompanies(workspaceID string) ([]domain.Company, error) {
	return s.contactRepo.ListCompanies(workspaceID)
}

func (s *ContactService) GetCompany(workspaceID, id string) (*domain.Company, error) {
	return s.contactRepo.GetCompanyByID(workspaceID, id)
}

func (s *ContactService) UpdateCompany(workspaceID, currentUserID string, req domain.Company) (*domain.Company, error) {
	if err := s.contactRepo.UpdateCompany(workspaceID, &req); err != nil {
		return nil, err
	}
	return s.contactRepo.GetCompanyByID(workspaceID, req.ID)
}

func (s *ContactService) DeleteCompany(workspaceID, currentUserID, id string) error {
	return s.contactRepo.DeleteCompany(workspaceID, id)
}
