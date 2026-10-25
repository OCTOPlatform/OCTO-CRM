package domain

type LeadIntakeRequest struct {
	FullName        string   `json:"full_name" binding:"required"`
	Email           string   `json:"email"`
	Phone           string   `json:"phone" binding:"required"`
	CompanyName     string   `json:"company_name"`
	CompanySize     string   `json:"company_size"`
	ProductInterest string   `json:"product_interest"`
	FormType        string   `json:"form_type"`
	Message         string   `json:"message"`
	PreferredDate   string   `json:"preferred_date"`
	PartnerType     string   `json:"partner_type"`
	Location        string   `json:"location"`
	UTMSource       string   `json:"utm_source"`
	UTMCampaign     string   `json:"utm_campaign"`
	ConsentGiven    bool     `json:"consent_given"`
	EstimatedValue  *float64 `json:"estimated_value"`
	AssigneeID      *string  `json:"assignee_id"`
}

type LeadIntakeResponse struct {
	ContactID string   `json:"contact_id"`
	CompanyID *string  `json:"company_id,omitempty"`
	DealID    *string  `json:"deal_id,omitempty"`
	TaskID    *string  `json:"task_id,omitempty"`
	Message   string   `json:"message"`
	Tags      []string `json:"tags"`
}
