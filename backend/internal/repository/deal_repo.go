package repository

import (
	"fmt"
	"strings"
	"time"

	"octo-crm/backend/internal/domain"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"
)

type DealRepository struct {
	db *sqlx.DB
}

func NewDealRepository(db *sqlx.DB) *DealRepository {
	return &DealRepository{db: db}
}

// Pipeline operations
func (r *DealRepository) GetPipelines(workspaceID string) ([]domain.Pipeline, error) {
	var pipelines []domain.Pipeline
	query := `SELECT id, workspace_id, name, is_default, created_at, updated_at FROM pipelines WHERE workspace_id = $1 ORDER BY created_at ASC`
	err := r.db.Select(&pipelines, query, workspaceID)
	if err != nil {
		return nil, err
	}

	for i := range pipelines {
		stages, err := r.GetPipelineStages(pipelines[i].ID)
		if err != nil {
			return nil, err
		}
		pipelines[i].Stages = stages
	}

	return pipelines, nil
}

func (r *DealRepository) GetPipelineStages(pipelineID string) ([]domain.PipelineStage, error) {
	var stages []domain.PipelineStage
	query := `
		SELECT 
			s.id, s.pipeline_id, s.name, s.order_index, s.probability, s.is_won, s.is_lost,
			COUNT(d.id) AS deal_count,
			COALESCE(SUM(d.value), 0) AS total_value,
			s.created_at, s.updated_at
		FROM pipeline_stages s
		LEFT JOIN deals d ON s.id = d.stage_id
		WHERE s.pipeline_id = $1
		GROUP BY s.id
		ORDER BY s.order_index ASC
	`
	err := r.db.Select(&stages, query, pipelineID)
	return stages, err
}

func (r *DealRepository) CreatePipeline(p *domain.Pipeline) error {
	if p.ID == "" {
		p.ID = uuid.New().String()
	}
	now := time.Now()
	p.CreatedAt = now
	p.UpdatedAt = now

	query := `INSERT INTO pipelines (id, workspace_id, name, is_default, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)`
	_, err := r.db.Exec(query, p.ID, p.WorkspaceID, p.Name, p.IsDefault, p.CreatedAt, p.UpdatedAt)
	return err
}

// Deal CRUD
func (r *DealRepository) CreateDeal(d *domain.Deal) error {
	if d.ID == "" {
		d.ID = uuid.New().String()
	}
	now := time.Now()
	d.CreatedAt = now
	d.UpdatedAt = now

	if d.Currency == "" {
		d.Currency = "IDR"
	}
	if d.Status == "" {
		d.Status = domain.DealStatusOpen
	}
	if d.Tags == nil {
		d.Tags = pq.StringArray{}
	}

	query := `
		INSERT INTO deals (
			id, workspace_id, pipeline_id, stage_id, contact_id, company_id,
			owner_id, title, value, currency, expected_close_date, status,
			priority, probability, tags, is_lead,
			lost_reason, notes, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6,
			$7, $8, $9, $10, $11, $12,
			$13, $14, $15, $16,
			$17, $18, $19, $20
		)
	`
	_, err := r.db.Exec(
		query,
		d.ID, d.WorkspaceID, d.PipelineID, d.StageID, d.ContactID, d.CompanyID,
		d.OwnerID, d.Title, d.Value, d.Currency, d.ExpectedCloseDate, d.Status,
		d.Priority, d.Probability, d.Tags, d.IsLead,
		d.LostReason, d.Notes, d.CreatedAt, d.UpdatedAt,
	)
	return err
}

func (r *DealRepository) GetDealByID(workspaceID, id string) (*domain.Deal, error) {
	var d domain.Deal
	query := `
		SELECT 
			d.id, d.workspace_id, d.pipeline_id, p.name AS pipeline_name,
			d.stage_id, s.name AS stage_name, s.probability AS stage_probability,
			d.contact_id, TRIM(CONCAT(c.first_name, ' ', c.last_name)) AS contact_name,
			c.email AS contact_email, c.phone AS contact_phone,
			d.company_id, co.name AS company_name,
			d.owner_id, u.full_name AS owner_name,
			d.title, d.value, d.currency,
			TO_CHAR(d.expected_close_date, 'YYYY-MM-DD') AS expected_close_date,
			d.status, d.priority, d.probability, d.tags, d.is_lead,
			d.lost_reason, d.handover_ticket_id, d.notes,
			d.created_at, d.updated_at
		FROM deals d
		JOIN pipelines p ON d.pipeline_id = p.id
		JOIN pipeline_stages s ON d.stage_id = s.id
		LEFT JOIN contacts c ON d.contact_id = c.id
		LEFT JOIN companies co ON d.company_id = co.id
		LEFT JOIN users u ON d.owner_id = u.id
		WHERE d.workspace_id = $1 AND d.id = $2
	`
	err := r.db.Get(&d, query, workspaceID, id)
	if err != nil {
		return nil, err
	}
	return &d, nil
}

func (r *DealRepository) ListDeals(workspaceID string, filter domain.DealFilter) ([]domain.Deal, error) {
	baseQuery := `
		SELECT 
			d.id, d.workspace_id, d.pipeline_id, p.name AS pipeline_name,
			d.stage_id, s.name AS stage_name, s.probability AS stage_probability,
			d.contact_id, TRIM(CONCAT(c.first_name, ' ', c.last_name)) AS contact_name,
			c.email AS contact_email, c.phone AS contact_phone,
			d.company_id, co.name AS company_name,
			d.owner_id, u.full_name AS owner_name,
			d.title, d.value, d.currency,
			TO_CHAR(d.expected_close_date, 'YYYY-MM-DD') AS expected_close_date,
			d.status, d.priority, d.probability, d.tags, d.is_lead,
			d.lost_reason, d.handover_ticket_id, d.notes,
			d.created_at, d.updated_at
		FROM deals d
		JOIN pipelines p ON d.pipeline_id = p.id
		JOIN pipeline_stages s ON d.stage_id = s.id
		LEFT JOIN contacts c ON d.contact_id = c.id
		LEFT JOIN companies co ON d.company_id = co.id
		LEFT JOIN users u ON d.owner_id = u.id
		WHERE d.workspace_id = $1
	`
	args := []interface{}{workspaceID}
	argIdx := 2

	if filter.PipelineID != "" {
		baseQuery += fmt.Sprintf(" AND d.pipeline_id = $%d", argIdx)
		args = append(args, filter.PipelineID)
		argIdx++
	}

	if filter.StageID != "" {
		baseQuery += fmt.Sprintf(" AND d.stage_id = $%d", argIdx)
		args = append(args, filter.StageID)
		argIdx++
	}

	if filter.Status != "" {
		baseQuery += fmt.Sprintf(" AND d.status = $%d", argIdx)
		args = append(args, filter.Status)
		argIdx++
	}

	if filter.OwnerID != "" {
		baseQuery += fmt.Sprintf(" AND d.owner_id = $%d", argIdx)
		args = append(args, filter.OwnerID)
		argIdx++
	}

	if filter.ContactID != "" {
		baseQuery += fmt.Sprintf(" AND d.contact_id = $%d", argIdx)
		args = append(args, filter.ContactID)
		argIdx++
	}

	if filter.CompanyID != "" {
		baseQuery += fmt.Sprintf(" AND d.company_id = $%d", argIdx)
		args = append(args, filter.CompanyID)
		argIdx++
	}

	if filter.Priority != nil {
		baseQuery += fmt.Sprintf(" AND d.priority = $%d", argIdx)
		args = append(args, *filter.Priority)
		argIdx++
	}

	if filter.IsLead != nil {
		baseQuery += fmt.Sprintf(" AND d.is_lead = $%d", argIdx)
		args = append(args, *filter.IsLead)
		argIdx++
	}

	if filter.Query != "" {
		searchTerm := "%" + strings.ToLower(filter.Query) + "%"
		baseQuery += fmt.Sprintf(" AND (LOWER(d.title) LIKE $%d OR LOWER(c.first_name) LIKE $%d OR LOWER(c.last_name) LIKE $%d)", argIdx, argIdx, argIdx)
		args = append(args, searchTerm)
		argIdx++
	}

	baseQuery += " ORDER BY s.order_index ASC, d.created_at DESC"

	var deals []domain.Deal
	err := r.db.Select(&deals, baseQuery, args...)
	if err != nil {
		return nil, err
	}
	return deals, nil
}

func (r *DealRepository) UpdateDeal(workspaceID string, d *domain.Deal) error {
	d.UpdatedAt = time.Now()
	query := `
		UPDATE deals SET
			pipeline_id = $1, stage_id = $2, contact_id = $3, company_id = $4,
			owner_id = $5, title = $6, value = $7, currency = $8,
			expected_close_date = $9, status = $10, priority = $11, probability = $12,
			tags = $13, is_lead = $14, lost_reason = $15, notes = $16, updated_at = $17
		WHERE workspace_id = $18 AND id = $19
	`
	_, err := r.db.Exec(
		query,
		d.PipelineID, d.StageID, d.ContactID, d.CompanyID,
		d.OwnerID, d.Title, d.Value, d.Currency,
		d.ExpectedCloseDate, d.Status, d.Priority, d.Probability,
		d.Tags, d.IsLead, d.LostReason, d.Notes, d.UpdatedAt,
		workspaceID, d.ID,
	)
	return err
}

func (r *DealRepository) UpdateDealPriority(workspaceID, dealID string, priority int) error {
	query := `UPDATE deals SET priority = $1, updated_at = NOW() WHERE workspace_id = $2 AND id = $3`
	_, err := r.db.Exec(query, priority, workspaceID, dealID)
	return err
}

func (r *DealRepository) UpdateDealStage(workspaceID, dealID, stageID string, status *domain.DealStatus, lostReason *string) error {
	// First check if stage is won or lost
	var stage domain.PipelineStage
	err := r.db.Get(&stage, `SELECT id, is_won, is_lost FROM pipeline_stages WHERE id = $1`, stageID)
	if err != nil {
		return fmt.Errorf("invalid stage: %w", err)
	}

	computedStatus := domain.DealStatusOpen
	if stage.IsWon {
		computedStatus = domain.DealStatusWon
	} else if stage.IsLost {
		computedStatus = domain.DealStatusLost
	} else if status != nil {
		computedStatus = *status
	}

	reason := ""
	if computedStatus == domain.DealStatusLost && lostReason != nil {
		reason = *lostReason
	}

	query := `
		UPDATE deals SET
			stage_id = $1,
			status = $2,
			lost_reason = $3,
			updated_at = NOW()
		WHERE workspace_id = $4 AND id = $5
	`
	_, err = r.db.Exec(query, stageID, string(computedStatus), reason, workspaceID, dealID)
	return err
}

func (r *DealRepository) DeleteDeal(workspaceID, id string) error {
	query := `DELETE FROM deals WHERE workspace_id = $1 AND id = $2`
	_, err := r.db.Exec(query, workspaceID, id)
	return err
}

// IsPresalesMember checks if a user belongs to the Pre-Sales department (or is owner/admin)
func (r *DealRepository) IsPresalesMember(workspaceID, userID string) (bool, error) {
	var count int
	query := `
		SELECT COUNT(*) 
		FROM workspace_members 
		WHERE workspace_id = $1 AND user_id = $2
		AND (COALESCE(department, 'sales') != 'support' OR role IN ('owner', 'admin'))
	`
	err := r.db.Get(&count, query, workspaceID, userID)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}
