package domain

import (
	"encoding/json"
	"time"

	"github.com/lib/pq"
)

type Company struct {
	ID          string    `json:"id" db:"id"`
	WorkspaceID string    `json:"workspace_id" db:"workspace_id"`
	Name        string    `json:"name" db:"name"`
	Industry    string    `json:"industry" db:"industry"`
	Website     string    `json:"website" db:"website"`
	Phone       string    `json:"phone" db:"phone"`
	Email       string    `json:"email" db:"email"`
	Address     string    `json:"address" db:"address"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}

type Contact struct {
	ID              string          `json:"id" db:"id"`
	WorkspaceID     string          `json:"workspace_id" db:"workspace_id"`
	CompanyID       *string         `json:"company_id" db:"company_id"`
	CompanyName     *string         `json:"company_name,omitempty" db:"company_name"`
	FirstName       string          `json:"first_name" db:"first_name"`
	LastName        string          `json:"last_name" db:"last_name"`
	FullName        string          `json:"full_name"`
	Email           string          `json:"email" db:"email"`
	Phone           string          `json:"phone" db:"phone"`
	NormalizedPhone string          `json:"normalized_phone" db:"normalized_phone"`
	JobTitle        string          `json:"job_title" db:"job_title"`
	LeadSource      string          `json:"lead_source" db:"lead_source"`
	Tags            pq.StringArray  `json:"tags" db:"tags"`
	Notes           string          `json:"notes" db:"notes"`
	ConsentStatus   string          `json:"consent_status" db:"consent_status"`
	IsArchived      bool            `json:"is_archived" db:"is_archived"`
	CustomFields    json.RawMessage `json:"custom_fields" db:"custom_fields"`
	OwnerID         *string         `json:"owner_id" db:"owner_id"`
	OwnerName       *string         `json:"owner_name,omitempty" db:"owner_name"`
	CreatedAt       time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time       `json:"updated_at" db:"updated_at"`
}

type ContactFilter struct {
	Query      string `form:"query"`
	Tag        string `form:"tag"`
	LeadSource string `form:"lead_source"`
	OwnerID    string `form:"owner_id"`
	IsArchived *bool  `form:"is_archived"`
	Page       int    `form:"page,default=1"`
	PerPage    int    `form:"per_page,default=20"`
	SortBy     string `form:"sort_by,default=created_at"`
	SortDir    string `form:"sort_dir,default=desc"`
}

type CreateContactRequest struct {
	CompanyID     *string         `json:"company_id"`
	FirstName     string          `json:"first_name" binding:"required"`
	LastName      string          `json:"last_name"`
	Email         string          `json:"email"`
	Phone         string          `json:"phone"`
	JobTitle      string          `json:"job_title"`
	LeadSource    string          `json:"lead_source"`
	Tags          []string        `json:"tags"`
	Notes         string          `json:"notes"`
	ConsentStatus string          `json:"consent_status"`
	CustomFields  json.RawMessage `json:"custom_fields"`
	OwnerID       *string         `json:"owner_id"`
}

type UpdateContactRequest struct {
	CompanyID     *string         `json:"company_id"`
	FirstName     *string         `json:"first_name"`
	LastName      *string         `json:"last_name"`
	Email         *string         `json:"email"`
	Phone         *string         `json:"phone"`
	JobTitle      *string         `json:"job_title"`
	LeadSource    *string         `json:"lead_source"`
	Tags          []string        `json:"tags"`
	Notes         *string         `json:"notes"`
	ConsentStatus *string         `json:"consent_status"`
	IsArchived    *bool           `json:"is_archived"`
	CustomFields  json.RawMessage `json:"custom_fields"`
	OwnerID       *string         `json:"owner_id"`
}

type DuplicateCandidate struct {
	PrimaryContact   Contact `json:"primary_contact"`
	SecondaryContact Contact `json:"secondary_contact"`
	MatchReason      string  `json:"match_reason"` // "same_email", "same_phone"
}

type MergeContactsRequest struct {
	PrimaryContactID   string   `json:"primary_contact_id" binding:"required"`
	SecondaryContactID string   `json:"secondary_contact_id" binding:"required"`
	CombineNotes       bool     `json:"combine_notes"`
	CombineTags        bool     `json:"combine_tags"`
	FieldsToKeep       []string `json:"fields_to_keep"` // list of field names to keep from secondary
}

type CSVImportRow struct {
	RowNumber int               `json:"row_number"`
	Data      map[string]string `json:"data"`
	Errors    []string          `json:"errors"`
	IsWarning bool              `json:"is_warning"`
}

type CSVPreviewResponse struct {
	TotalRows       int            `json:"total_rows"`
	DetectedHeaders []string       `json:"detected_headers"`
	PreviewRows     []CSVImportRow `json:"preview_rows"`
	ValidRowCount   int            `json:"valid_row_count"`
	ErrorRowCount   int            `json:"error_row_count"`
}

type CSVCommitRequest struct {
	ColumnMapping map[string]string   `json:"column_mapping"` // CSV header -> contact field
	Rows          []map[string]string `json:"rows"`
	SkipOnError   bool                `json:"skip_on_error"`
}
