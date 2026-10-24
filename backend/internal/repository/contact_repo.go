package repository

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
	"time"

	"octo-crm/backend/internal/domain"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"
)

type ContactRepository struct {
	db *sqlx.DB
}

func NewContactRepository(db *sqlx.DB) *ContactRepository {
	return &ContactRepository{db: db}
}

// NormalizePhone converts phone numbers like 08123... to 628123...
func NormalizePhone(phone string) string {
	// Remove all non-digits
	re := regexp.MustCompile(`\D`)
	digits := re.ReplaceAllString(phone, "")
	if strings.HasPrefix(digits, "0") {
		digits = "62" + digits[1:]
	} else if strings.HasPrefix(digits, "8") {
		digits = "628" + digits[1:]
	}
	return digits
}

// Contact CRUD
func (r *ContactRepository) CreateContact(c *domain.Contact) error {
	if c.ID == "" {
		c.ID = uuid.New().String()
	}
	now := time.Now()
	c.CreatedAt = now
	c.UpdatedAt = now

	if c.NormalizedPhone == "" && c.Phone != "" {
		c.NormalizedPhone = NormalizePhone(c.Phone)
	}
	if len(c.Tags) == 0 {
		c.Tags = pq.StringArray{}
	}
	if len(c.CustomFields) == 0 {
		c.CustomFields = json.RawMessage("{}")
	}
	if c.ConsentStatus == "" {
		c.ConsentStatus = "granted"
	}
	if c.LeadSource == "" {
		c.LeadSource = "Organic"
	}

	query := `
		INSERT INTO contacts (
			id, workspace_id, company_id, first_name, last_name, email,
			phone, normalized_phone, job_title, lead_source, tags, notes,
			consent_status, is_archived, custom_fields, owner_id, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6,
			$7, $8, $9, $10, $11, $12,
			$13, $14, $15, $16, $17, $18
		)
	`
	_, err := r.db.Exec(
		query,
		c.ID, c.WorkspaceID, c.CompanyID, c.FirstName, c.LastName, c.Email,
		c.Phone, c.NormalizedPhone, c.JobTitle, c.LeadSource, c.Tags, c.Notes,
		c.ConsentStatus, c.IsArchived, c.CustomFields, c.OwnerID, c.CreatedAt, c.UpdatedAt,
	)
	return err
}

func (r *ContactRepository) GetContactByID(workspaceID, contactID string) (*domain.Contact, error) {
	var c domain.Contact
	query := `
		SELECT 
			c.id, c.workspace_id, c.company_id, co.name AS company_name,
			c.first_name, c.last_name, c.email, c.phone, c.normalized_phone,
			c.job_title, c.lead_source, c.tags, c.notes, c.consent_status,
			c.is_archived, c.custom_fields, c.owner_id, u.full_name AS owner_name,
			c.created_at, c.updated_at
		FROM contacts c
		LEFT JOIN companies co ON c.company_id = co.id
		LEFT JOIN users u ON c.owner_id = u.id
		WHERE c.workspace_id = $1 AND c.id = $2
	`
	err := r.db.Get(&c, query, workspaceID, contactID)
	if err != nil {
		return nil, err
	}
	c.FullName = strings.TrimSpace(c.FirstName + " " + c.LastName)
	return &c, nil
}

func (r *ContactRepository) ListContacts(workspaceID string, filter domain.ContactFilter) ([]domain.Contact, int, error) {
	baseQuery := `
		FROM contacts c
		LEFT JOIN companies co ON c.company_id = co.id
		LEFT JOIN users u ON c.owner_id = u.id
		WHERE c.workspace_id = $1
	`
	args := []interface{}{workspaceID}
	argIdx := 2

	if filter.IsArchived != nil {
		baseQuery += fmt.Sprintf(" AND c.is_archived = $%d", argIdx)
		args = append(args, *filter.IsArchived)
		argIdx++
	} else {
		baseQuery += " AND c.is_archived = false"
	}

	if filter.Query != "" {
		searchTerm := "%" + strings.ToLower(filter.Query) + "%"
		baseQuery += fmt.Sprintf(" AND (LOWER(c.first_name) LIKE $%d OR LOWER(c.last_name) LIKE $%d OR LOWER(c.email) LIKE $%d OR c.phone LIKE $%d OR LOWER(co.name) LIKE $%d)", argIdx, argIdx, argIdx, argIdx, argIdx)
		args = append(args, searchTerm)
		argIdx++
	}

	if filter.Tag != "" {
		baseQuery += fmt.Sprintf(" AND $%d = ANY(c.tags)", argIdx)
		args = append(args, filter.Tag)
		argIdx++
	}

	if filter.LeadSource != "" {
		baseQuery += fmt.Sprintf(" AND c.lead_source = $%d", argIdx)
		args = append(args, filter.LeadSource)
		argIdx++
	}

	if filter.OwnerID != "" {
		baseQuery += fmt.Sprintf(" AND c.owner_id = $%d", argIdx)
		args = append(args, filter.OwnerID)
		argIdx++
	}

	// Count total
	countQuery := "SELECT COUNT(*) " + baseQuery
	var total int
	err := r.db.Get(&total, countQuery, args...)
	if err != nil {
		return nil, 0, err
	}

	// Pagination & Sorting
	sortBy := "c.created_at"
	switch filter.SortBy {
	case "name":
		sortBy = "c.first_name"
	case "email":
		sortBy = "c.email"
	case "updated_at":
		sortBy = "c.updated_at"
	}

	sortDir := "DESC"
	if strings.ToLower(filter.SortDir) == "asc" {
		sortDir = "ASC"
	}

	if filter.PerPage <= 0 {
		filter.PerPage = 20
	}
	if filter.Page <= 0 {
		filter.Page = 1
	}
	offset := (filter.Page - 1) * filter.PerPage

	selectQuery := fmt.Sprintf(`
		SELECT 
			c.id, c.workspace_id, c.company_id, co.name AS company_name,
			c.first_name, c.last_name, c.email, c.phone, c.normalized_phone,
			c.job_title, c.lead_source, c.tags, c.notes, c.consent_status,
			c.is_archived, c.custom_fields, c.owner_id, u.full_name AS owner_name,
			c.created_at, c.updated_at
		%s
		ORDER BY %s %s
		LIMIT $%d OFFSET $%d
	`, baseQuery, sortBy, sortDir, argIdx, argIdx+1)

	args = append(args, filter.PerPage, offset)

	contacts := make([]domain.Contact, 0)
	err = r.db.Select(&contacts, selectQuery, args...)
	if err != nil {
		return nil, 0, err
	}

	for i := range contacts {
		contacts[i].FullName = strings.TrimSpace(contacts[i].FirstName + " " + contacts[i].LastName)
	}

	return contacts, total, nil
}

func (r *ContactRepository) UpdateContact(workspaceID string, c *domain.Contact) error {
	c.UpdatedAt = time.Now()
	if c.Phone != "" {
		c.NormalizedPhone = NormalizePhone(c.Phone)
	}

	query := `
		UPDATE contacts SET
			company_id = $1, first_name = $2, last_name = $3, email = $4,
			phone = $5, normalized_phone = $6, job_title = $7, lead_source = $8,
			tags = $9, notes = $10, consent_status = $11, is_archived = $12,
			custom_fields = $13, owner_id = $14, updated_at = $15
		WHERE workspace_id = $16 AND id = $17
	`
	_, err := r.db.Exec(
		query,
		c.CompanyID, c.FirstName, c.LastName, c.Email,
		c.Phone, c.NormalizedPhone, c.JobTitle, c.LeadSource,
		c.Tags, c.Notes, c.ConsentStatus, c.IsArchived,
		c.CustomFields, c.OwnerID, c.UpdatedAt,
		workspaceID, c.ID,
	)
	return err
}

func (r *ContactRepository) DeleteContact(workspaceID, contactID string) error {
	query := `DELETE FROM contacts WHERE workspace_id = $1 AND id = $2`
	_, err := r.db.Exec(query, workspaceID, contactID)
	return err
}

func (r *ContactRepository) ArchiveContact(workspaceID, contactID string, archive bool) error {
	query := `UPDATE contacts SET is_archived = $1, updated_at = NOW() WHERE workspace_id = $2 AND id = $3`
	_, err := r.db.Exec(query, archive, workspaceID, contactID)
	return err
}

// FindDuplicateCandidates finds pairs of contacts with matching emails or phone numbers
func (r *ContactRepository) FindDuplicateCandidates(workspaceID string) ([]domain.DuplicateCandidate, error) {
	query := `
		SELECT 
			c1.id as "primary_contact.id", c1.workspace_id as "primary_contact.workspace_id",
			c1.first_name as "primary_contact.first_name", c1.last_name as "primary_contact.last_name",
			c1.email as "primary_contact.email", c1.phone as "primary_contact.phone",
			c1.normalized_phone as "primary_contact.normalized_phone", c1.lead_source as "primary_contact.lead_source",
			c1.created_at as "primary_contact.created_at", c1.updated_at as "primary_contact.updated_at",
			c2.id as "secondary_contact.id", c2.workspace_id as "secondary_contact.workspace_id",
			c2.first_name as "secondary_contact.first_name", c2.last_name as "secondary_contact.last_name",
			c2.email as "secondary_contact.email", c2.phone as "secondary_contact.phone",
			c2.normalized_phone as "secondary_contact.normalized_phone", c2.lead_source as "secondary_contact.lead_source",
			c2.created_at as "secondary_contact.created_at", c2.updated_at as "secondary_contact.updated_at",
			CASE 
				WHEN c1.email != '' AND c1.email = c2.email THEN 'same_email'
				ELSE 'same_phone'
			END as match_reason
		FROM contacts c1
		JOIN contacts c2 ON c1.workspace_id = c2.workspace_id AND c1.id < c2.id
		WHERE c1.workspace_id = $1 
		  AND c1.is_archived = false 
		  AND c2.is_archived = false
		  AND (
			(c1.email != '' AND c1.email = c2.email) 
			OR 
			(c1.normalized_phone != '' AND c1.normalized_phone = c2.normalized_phone)
		  )
		ORDER BY c1.created_at ASC
	`
	rows, err := r.db.Query(query, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	duplicates := make([]domain.DuplicateCandidate, 0)
	for rows.Next() {
		var d domain.DuplicateCandidate
		err := rows.Scan(
			&d.PrimaryContact.ID, &d.PrimaryContact.WorkspaceID,
			&d.PrimaryContact.FirstName, &d.PrimaryContact.LastName,
			&d.PrimaryContact.Email, &d.PrimaryContact.Phone,
			&d.PrimaryContact.NormalizedPhone, &d.PrimaryContact.LeadSource,
			&d.PrimaryContact.CreatedAt, &d.PrimaryContact.UpdatedAt,
			&d.SecondaryContact.ID, &d.SecondaryContact.WorkspaceID,
			&d.SecondaryContact.FirstName, &d.SecondaryContact.LastName,
			&d.SecondaryContact.Email, &d.SecondaryContact.Phone,
			&d.SecondaryContact.NormalizedPhone, &d.SecondaryContact.LeadSource,
			&d.SecondaryContact.CreatedAt, &d.SecondaryContact.UpdatedAt,
			&d.MatchReason,
		)
		if err != nil {
			return nil, err
		}
		d.PrimaryContact.FullName = strings.TrimSpace(d.PrimaryContact.FirstName + " " + d.PrimaryContact.LastName)
		d.SecondaryContact.FullName = strings.TrimSpace(d.SecondaryContact.FirstName + " " + d.SecondaryContact.LastName)
		duplicates = append(duplicates, d)
	}

	return duplicates, nil
}

// MergeContacts reassigns deals, tasks, activities to primary and archives secondary
func (r *ContactRepository) MergeContacts(workspaceID string, req domain.MergeContactsRequest) error {
	tx, err := r.db.Beginx()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// 1. Fetch both contacts
	var primary, secondary domain.Contact
	if err := tx.Get(&primary, `SELECT * FROM contacts WHERE workspace_id = $1 AND id = $2`, workspaceID, req.PrimaryContactID); err != nil {
		return fmt.Errorf("primary contact not found: %w", err)
	}
	if err := tx.Get(&secondary, `SELECT * FROM contacts WHERE workspace_id = $1 AND id = $2`, workspaceID, req.SecondaryContactID); err != nil {
		return fmt.Errorf("secondary contact not found: %w", err)
	}

	// 2. Reassign deals
	if _, err := tx.Exec(`UPDATE deals SET contact_id = $1 WHERE workspace_id = $2 AND contact_id = $3`, primary.ID, workspaceID, secondary.ID); err != nil {
		return fmt.Errorf("reassigning deals: %w", err)
	}

	// 3. Reassign tasks
	if _, err := tx.Exec(`UPDATE tasks SET contact_id = $1 WHERE workspace_id = $2 AND contact_id = $3`, primary.ID, workspaceID, secondary.ID); err != nil {
		return fmt.Errorf("reassigning tasks: %w", err)
	}

	// 4. Reassign activities
	if _, err := tx.Exec(`UPDATE activities SET contact_id = $1 WHERE workspace_id = $2 AND contact_id = $3`, primary.ID, workspaceID, secondary.ID); err != nil {
		return fmt.Errorf("reassigning activities: %w", err)
	}

	// 5. Optionally combine notes & tags
	updatedNotes := primary.Notes
	if req.CombineNotes && secondary.Notes != "" {
		if updatedNotes != "" {
			updatedNotes += "\n\n[Merged Notes from " + secondary.FirstName + " " + secondary.LastName + "]:\n" + secondary.Notes
		} else {
			updatedNotes = secondary.Notes
		}
	}

	tagMap := make(map[string]bool)
	for _, t := range primary.Tags {
		tagMap[t] = true
	}
	if req.CombineTags {
		for _, t := range secondary.Tags {
			tagMap[t] = true
		}
	}
	mergedTags := make(pq.StringArray, 0, len(tagMap))
	for t := range tagMap {
		mergedTags = append(mergedTags, t)
	}

	// Update primary
	updatePrimaryQuery := `
		UPDATE contacts SET notes = $1, tags = $2, updated_at = NOW()
		WHERE workspace_id = $3 AND id = $4
	`
	if _, err := tx.Exec(updatePrimaryQuery, updatedNotes, mergedTags, workspaceID, primary.ID); err != nil {
		return err
	}

	// Archive secondary contact
	archiveSecondaryQuery := `
		UPDATE contacts SET is_archived = true, notes = notes || ' [MERGED INTO ' || $1 || ']', updated_at = NOW()
		WHERE workspace_id = $2 AND id = $3
	`
	if _, err := tx.Exec(archiveSecondaryQuery, primary.ID, workspaceID, secondary.ID); err != nil {
		return err
	}

	return tx.Commit()
}

// Company CRUD
func (r *ContactRepository) CreateCompany(c *domain.Company) error {
	if c.ID == "" {
		c.ID = uuid.New().String()
	}
	now := time.Now()
	c.CreatedAt = now
	c.UpdatedAt = now

	query := `
		INSERT INTO companies (id, workspace_id, name, industry, website, phone, email, address, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`
	_, err := r.db.Exec(query, c.ID, c.WorkspaceID, c.Name, c.Industry, c.Website, c.Phone, c.Email, c.Address, c.CreatedAt, c.UpdatedAt)
	return err
}

func (r *ContactRepository) ListCompanies(workspaceID string) ([]domain.Company, error) {
	var companies []domain.Company
	query := `
		SELECT id, workspace_id, name, industry, website, phone, email, address, created_at, updated_at
		FROM companies
		WHERE workspace_id = $1
		ORDER BY name ASC
	`
	err := r.db.Select(&companies, query, workspaceID)
	return companies, err
}

func (r *ContactRepository) GetCompanyByID(workspaceID, id string) (*domain.Company, error) {
	var c domain.Company
	query := `SELECT id, workspace_id, name, industry, website, phone, email, address, created_at, updated_at FROM companies WHERE workspace_id = $1 AND id = $2`
	err := r.db.Get(&c, query, workspaceID, id)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *ContactRepository) FindContactByEmail(workspaceID, email string) (*domain.Contact, error) {
	var c domain.Contact
	query := `SELECT id, workspace_id, first_name, last_name, email, phone, company_id FROM contacts WHERE workspace_id = $1 AND LOWER(email) = LOWER($2) AND is_archived = false LIMIT 1`
	err := r.db.Get(&c, query, workspaceID, email)
	if err != nil {
		return nil, err
	}
	c.FullName = strings.TrimSpace(c.FirstName + " " + c.LastName)
	return &c, nil
}

func (r *ContactRepository) FindContactByPhone(workspaceID, phone string) (*domain.Contact, error) {
	norm := NormalizePhone(phone)
	var c domain.Contact
	query := `SELECT id, workspace_id, first_name, last_name, email, phone, company_id FROM contacts WHERE workspace_id = $1 AND (normalized_phone = $2 OR phone = $3) AND is_archived = false LIMIT 1`
	err := r.db.Get(&c, query, workspaceID, norm, phone)
	if err != nil {
		return nil, err
	}
	c.FullName = strings.TrimSpace(c.FirstName + " " + c.LastName)
	return &c, nil
}

func (r *ContactRepository) UpdateCompany(workspaceID string, c *domain.Company) error {
	c.UpdatedAt = time.Now()
	query := `
		UPDATE companies SET name = $1, industry = $2, website = $3, phone = $4, email = $5, address = $6, updated_at = $7
		WHERE workspace_id = $8 AND id = $9
	`
	_, err := r.db.Exec(query, c.Name, c.Industry, c.Website, c.Phone, c.Email, c.Address, c.UpdatedAt, workspaceID, c.ID)
	return err
}

func (r *ContactRepository) DeleteCompany(workspaceID, id string) error {
	query := `DELETE FROM companies WHERE workspace_id = $1 AND id = $2`
	_, err := r.db.Exec(query, workspaceID, id)
	return err
}
