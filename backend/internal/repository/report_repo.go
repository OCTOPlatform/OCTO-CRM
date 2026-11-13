package repository

import (
	"fmt"
	"strings"
	"time"

	"octo-crm/backend/internal/domain"

	"github.com/jmoiron/sqlx"
)

type ReportRepository struct {
	db *sqlx.DB
}

func NewReportRepository(db *sqlx.DB) *ReportRepository {
	return &ReportRepository{db: db}
}

func (r *ReportRepository) GetDashboardSummary(workspaceID string) (*domain.DashboardSummary, error) {
	var summary domain.DashboardSummary

	// 1. Pipeline Open & Won Value & Total Deals
	dealQuery := `
		SELECT 
			COALESCE(SUM(CASE WHEN status = 'open' THEN value ELSE 0 END), 0) AS open_val,
			COALESCE(SUM(CASE WHEN status = 'won' THEN value ELSE 0 END), 0) AS won_val,
			COUNT(id) AS total_deals,
			COUNT(CASE WHEN status = 'won' THEN 1 END) AS won_deals,
			COUNT(CASE WHEN status = 'lost' THEN 1 END) AS lost_deals
		FROM deals
		WHERE workspace_id = $1
	`
	var dealStats struct {
		OpenVal    float64 `db:"open_val"`
		WonVal     float64 `db:"won_val"`
		TotalDeals int     `db:"total_deals"`
		WonDeals   int     `db:"won_deals"`
		LostDeals  int     `db:"lost_deals"`
	}
	if err := r.db.Get(&dealStats, dealQuery, workspaceID); err != nil {
		return nil, err
	}
	summary.OpenPipelineValue = dealStats.OpenVal
	summary.WonDealValue = dealStats.WonVal
	summary.TotalDealsCount = dealStats.TotalDeals

	if dealStats.WonDeals+dealStats.LostDeals > 0 {
		summary.ConversionRate = float64(dealStats.WonDeals) / float64(dealStats.WonDeals+dealStats.LostDeals) * 100.0
	} else if dealStats.WonDeals > 0 {
		summary.ConversionRate = 100.0
	}

	// 2. Total active contacts
	var totalContacts int
	contactQuery := `SELECT COUNT(id) FROM contacts WHERE workspace_id = $1 AND is_archived = false`
	if err := r.db.Get(&totalContacts, contactQuery, workspaceID); err != nil {
		return nil, err
	}
	summary.TotalContacts = totalContacts

	// 3. Overdue & Due Today tasks
	taskQuery := `
		SELECT 
			COUNT(CASE WHEN status IN ('open', 'in_progress') AND due_date < NOW() THEN 1 END) AS overdue_count,
			COUNT(CASE WHEN status IN ('open', 'in_progress') AND due_date::date = CURRENT_DATE THEN 1 END) AS today_count
		FROM tasks
		WHERE workspace_id = $1
	`
	var taskStats struct {
		OverdueCount int `db:"overdue_count"`
		TodayCount   int `db:"today_count"`
	}
	if err := r.db.Get(&taskStats, taskQuery, workspaceID); err != nil {
		return nil, err
	}
	summary.OverdueTasksCount = taskStats.OverdueCount
	summary.DueTodayTasksCount = taskStats.TodayCount

	return &summary, nil
}

func (r *ReportRepository) GetPipelineFunnel(workspaceID string) ([]domain.StageFunnelItem, error) {
	query := `
		SELECT 
			s.id AS stage_id,
			s.name AS stage_name,
			s.order_index,
			COUNT(d.id) AS deal_count,
			COALESCE(SUM(d.value), 0) AS total_value
		FROM pipeline_stages s
		JOIN pipelines p ON s.pipeline_id = p.id
		LEFT JOIN deals d ON s.id = d.stage_id AND d.workspace_id = $1
		WHERE p.workspace_id = $1 AND p.is_default = true
		GROUP BY s.id, s.name, s.order_index
		ORDER BY s.order_index ASC
	`
	var items []domain.StageFunnelItem
	err := r.db.Select(&items, query, workspaceID)
	if items == nil {
		items = []domain.StageFunnelItem{}
	}
	return items, err
}

func (r *ReportRepository) GetLeadSources(workspaceID string) ([]domain.LeadSourceReportItem, error) {
	return r.GetLeadSourcesWithFilter(workspaceID, domain.ReportFilterParams{Period: "30d"})
}

func (r *ReportRepository) GetLeadSourcesWithFilter(workspaceID string, params domain.ReportFilterParams) ([]domain.LeadSourceReportItem, error) {
	var currentStart, currentEnd, prevStart, prevEnd *time.Time
	now := time.Now()

	period := strings.ToLower(strings.TrimSpace(params.Period))
	if period == "" {
		period = "30d"
	}

	switch period {
	case "7d":
		cs := now.AddDate(0, 0, -7)
		ce := now
		ps := now.AddDate(0, 0, -14)
		pe := cs
		currentStart, currentEnd, prevStart, prevEnd = &cs, &ce, &ps, &pe
	case "30d":
		cs := now.AddDate(0, 0, -30)
		ce := now
		ps := now.AddDate(0, 0, -60)
		pe := cs
		currentStart, currentEnd, prevStart, prevEnd = &cs, &ce, &ps, &pe
	case "custom":
		if params.StartDate != "" && params.EndDate != "" {
			s, err1 := time.Parse("2006-01-02", params.StartDate)
			e, err2 := time.Parse("2006-01-02", params.EndDate)
			if err1 == nil && err2 == nil {
				e = e.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
				duration := e.Sub(s)
				ps := s.Add(-duration)
				pe := s
				currentStart, currentEnd, prevStart, prevEnd = &s, &e, &ps, &pe
			}
		}
	case "all":
		// No date filters
	}

	args := []interface{}{workspaceID}
	prevFilter := "1 = 0"
	if prevStart != nil && prevEnd != nil {
		args = append(args, *prevStart, *prevEnd)
		prevFilter = fmt.Sprintf("created_at >= $%d AND created_at <= $%d", len(args)-1, len(args))
	}

	currFilter := ""
	if currentStart != nil && currentEnd != nil {
		args = append(args, *currentStart, *currentEnd)
		currFilter = fmt.Sprintf("AND c.created_at >= $%d AND c.created_at <= $%d", len(args)-1, len(args))
	}

	query := fmt.Sprintf(`
		SELECT 
			COALESCE(NULLIF(c.lead_source, ''), 'Unspecified') AS lead_source,
			COUNT(DISTINCT c.id) AS count,
			COUNT(DISTINCT d.id) AS total_deals,
			COUNT(DISTINCT CASE WHEN d.status = 'won' THEN d.id END) AS won_deals,
			COALESCE(SUM(CASE WHEN d.status = 'won' THEN d.value ELSE 0 END), 0.0) AS total_value,
			CASE 
				WHEN COUNT(DISTINCT d.id) > 0 THEN 
					ROUND((COUNT(DISTINCT CASE WHEN d.status = 'won' THEN d.id END)::numeric / COUNT(DISTINCT d.id)::numeric) * 100.0, 1)
				ELSE 0.0 
			END AS conversion_rate,
			COALESCE(prev.prev_count, 0) AS previous_count,
			CASE 
				WHEN COALESCE(prev.prev_count, 0) > 0 THEN
					ROUND(((COUNT(DISTINCT c.id) - prev.prev_count)::numeric / prev.prev_count::numeric) * 100.0, 1)
				ELSE 0.0
			END AS growth_pct
		FROM contacts c
		LEFT JOIN deals d ON d.contact_id = c.id AND d.workspace_id = c.workspace_id
		LEFT JOIN (
			SELECT COALESCE(NULLIF(lead_source, ''), 'Unspecified') AS ls, COUNT(id) AS prev_count
			FROM contacts
			WHERE workspace_id = $1 AND is_archived = false AND %s
			GROUP BY ls
		) prev ON prev.ls = COALESCE(NULLIF(c.lead_source, ''), 'Unspecified')
		WHERE c.workspace_id = $1 AND c.is_archived = false %s
		GROUP BY c.lead_source, prev.prev_count
		ORDER BY count DESC
	`, prevFilter, currFilter)

	var items []domain.LeadSourceReportItem
	err := r.db.Select(&items, query, args...)
	if items == nil {
		items = []domain.LeadSourceReportItem{}
	}
	return items, err
}

func (r *ReportRepository) GetActivitySummary(workspaceID string) ([]domain.ActivitySummaryItem, error) {
	query := `
		SELECT type, COUNT(id) AS count
		FROM activities
		WHERE workspace_id = $1
		GROUP BY type
		ORDER BY count DESC
	`
	var items []domain.ActivitySummaryItem
	err := r.db.Select(&items, query, workspaceID)
	if items == nil {
		items = []domain.ActivitySummaryItem{}
	}
	return items, err
}
