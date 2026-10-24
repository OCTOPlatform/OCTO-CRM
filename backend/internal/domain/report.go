package domain

type DashboardSummary struct {
	OpenPipelineValue float64 `json:"open_pipeline_value"`
	WonDealValue      float64 `json:"won_deal_value"`
	TotalContacts     int     `json:"total_contacts"`
	OverdueTasksCount int     `json:"overdue_tasks_count"`
	DueTodayTasksCount int    `json:"due_today_tasks_count"`
	TotalDealsCount   int     `json:"total_deals_count"`
	ConversionRate    float64 `json:"conversion_rate"` // won / (won + lost) * 100
}

type StageFunnelItem struct {
	StageID    string  `json:"stage_id" db:"stage_id"`
	StageName  string  `json:"stage_name" db:"stage_name"`
	OrderIndex int     `json:"order_index" db:"order_index"`
	DealCount  int     `json:"deal_count" db:"deal_count"`
	TotalValue float64 `json:"total_value" db:"total_value"`
}

type LeadSourceReportItem struct {
	LeadSource string  `json:"lead_source" db:"lead_source"`
	Count      int     `json:"count" db:"count"`
	TotalValue float64 `json:"total_value" db:"total_value"`
}

type ActivitySummaryItem struct {
	Type  string `json:"type" db:"type"`
	Count int    `json:"count" db:"count"`
}
