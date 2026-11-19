package main

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"octo-crm/backend/internal/config"
	"octo-crm/backend/internal/domain"
	"octo-crm/backend/internal/handler"
	"octo-crm/backend/internal/middleware"
	"octo-crm/backend/internal/repository"
	"octo-crm/backend/internal/service"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
)

func main() {
	cfg := config.Load()

	// Connect to database
	db, err := sqlx.Open("postgres", cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to initialize database connection: %v", err)
	}
	defer db.Close()

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(10)
	db.SetConnMaxLifetime(5 * time.Minute)

	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}
	log.Println("✓ Connected to PostgreSQL database successfully.")

	// Repositories
	userRepo := repository.NewUserRepository(db)
	contactRepo := repository.NewContactRepository(db)
	dealRepo := repository.NewDealRepository(db)
	taskRepo := repository.NewTaskRepository(db)
	activityRepo := repository.NewActivityRepository(db)
	reportRepo := repository.NewReportRepository(db)
	auditRepo := repository.NewAuditRepository(db)
	inboxRepo := repository.NewInboxRepository(db)
	ticketRepo := repository.NewTicketRepository(db)
	pillarRepo := repository.NewPillarRepository(db)
	notificationRepo := repository.NewNotificationRepo(db)
	unifiedOpsRepo := repository.NewUnifiedOpsRepository(db)
	commercialOpsRepo := repository.NewCommercialOpsRepository(db)
	commissionRepo := repository.NewCommissionRepository(db)

	// Services
	authService := service.NewAuthService(userRepo, auditRepo, cfg)
	workspaceService := service.NewWorkspaceService(userRepo, auditRepo, inboxRepo, cfg)
	contactService := service.NewContactService(contactRepo, auditRepo)
	dealService := service.NewDealService(dealRepo, activityRepo, auditRepo)
	taskService := service.NewTaskService(taskRepo, activityRepo, auditRepo)
	activityService := service.NewActivityService(activityRepo, auditRepo)
	reportService := service.NewReportService(reportRepo, auditRepo)
	integrationService := service.NewIntegrationService(contactService, dealService, taskService, dealRepo, auditRepo)
	inboxService := service.NewInboxService(inboxRepo, contactRepo, dealService, activityRepo, userRepo, auditRepo, cfg)
	ticketService := service.NewTicketService(ticketRepo, inboxRepo, auditRepo)
	pillarService := service.NewPillarService(pillarRepo, contactRepo, ticketRepo, inboxRepo, userRepo, auditRepo, activityRepo, cfg)
	masterService := service.NewMasterService(userRepo, auditRepo, cfg)
	notificationService := service.NewNotificationService(notificationRepo)
	unifiedOpsService := service.NewUnifiedOpsService(unifiedOpsRepo, userRepo, dealRepo)
	commissionService := service.NewCommissionService(commissionRepo, userRepo, dealRepo)
	commercialOpsService := service.NewCommercialOpsService(commercialOpsRepo, commissionService)

	// Wire cross-pillar services
	dealService.SetPillarService(pillarService)
	dealService.SetCommissionService(commissionService)
	inboxService.SetPillarService(pillarService)
	inboxService.SetNotificationRepo(notificationRepo)
	inboxService.SetTicketRepo(ticketRepo)
	integrationService.SetPillarService(pillarService)
	pillarService.SetDealRepo(dealRepo)
	pillarService.SetTaskService(taskService)

	// Handlers
	authHandler := handler.NewAuthHandler(authService)
	workspaceHandler := handler.NewWorkspaceHandler(workspaceService, authService)
	contactHandler := handler.NewContactHandler(contactService)
	companyHandler := handler.NewCompanyHandler(contactService)
	dealHandler := handler.NewDealHandler(dealService)
	taskHandler := handler.NewTaskHandler(taskService)
	activityHandler := handler.NewActivityHandler(activityService)
	reportHandler := handler.NewReportHandler(reportService)
	integrationHandler := handler.NewIntegrationHandler(integrationService, userRepo, cfg.JWTSecret)
	inboxHandler := handler.NewInboxHandler(inboxService, cfg)
	ticketHandler := handler.NewTicketHandler(ticketService)
	pillarHandler := handler.NewPillarHandler(pillarService)
	masterHandler := handler.NewMasterHandler(masterService)
	notificationHandler := handler.NewNotificationHandler(notificationService)
	unifiedOpsHandler := handler.NewUnifiedOpsHandler(unifiedOpsService)
	commercialOpsHandler := handler.NewCommercialOpsHandler(commercialOpsService)
	commissionHandler := handler.NewCommissionHandler(commissionService)

	// Setup Gin Engine
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}
	router := gin.Default()

	// CORS Configuration
	corsConfig := cors.DefaultConfig()
	corsConfig.AllowAllOrigins = true
	corsConfig.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Workspace-ID"}
	corsConfig.AllowMethods = []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}
	router.Use(cors.New(corsConfig))

	// Health Check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":    "ok",
			"timestamp": time.Now().Format(time.RFC3339),
			"version":   "1.0.0",
			"service":   "OCTO CRM API",
		})
	})

	// Static Files (Uploaded media, documents, images)
	router.Static("/uploads", "./uploads")

	api := router.Group("/api/v1")
	{
		// 1. Auth routes (Public)
		authRoutes := api.Group("/auth")
		{
			authRoutes.POST("/register", authHandler.Register)
			authRoutes.POST("/login", authHandler.Login)
		}

		// Public WhatsApp Webhook (Meta Cloud API, Fonnte, Wablas, Waha, etc.)
		api.GET("/webhooks/whatsapp", inboxHandler.VerifyWhatsAppWebhook)
		api.POST("/webhooks/whatsapp", inboxHandler.ReceiveWhatsAppWebhook)

		// Public Member Onboarding via Magic Token (Model 2)
		api.GET("/invitations/:token", workspaceHandler.GetInvitation)
		api.POST("/invitations/:token/accept", workspaceHandler.AcceptInvitation)

		// Public Inbound Lead Intake Webhook (Ecosystem from OCTO-WEB / OCTO-TAP / Third-Party Forms)
		api.POST("/workspaces/:workspace_id/integrations/lead-intake", integrationHandler.IngestLead)

		// Public Meta Ads (Facebook & Instagram Lead Generation Instant Forms) Webhooks
		api.GET("/workspaces/:workspace_id/integrations/meta/webhook", integrationHandler.VerifyMetaWebhook)
		api.POST("/workspaces/:workspace_id/integrations/meta/webhook", integrationHandler.ReceiveMetaWebhook)
		api.GET("/webhooks/meta-leads", integrationHandler.VerifyMetaWebhook)
		api.POST("/webhooks/meta-leads", integrationHandler.ReceiveMetaWebhook)

		// Public TikTok Ads Lead Generation Webhooks
		api.GET("/workspaces/:workspace_id/integrations/tiktok/webhook", integrationHandler.VerifyTikTokWebhook)
		api.POST("/workspaces/:workspace_id/integrations/tiktok/webhook", integrationHandler.ReceiveTikTokWebhook)

		// Public AutoGoPay (GoPay Merchant QRIS) Webhook Callback
		api.POST("/workspaces/:workspace_id/integrations/autogopay/webhook", commercialOpsHandler.HandleAutoGopayWebhook)

		// Public WebChat Widget Endpoints (Website Live Chat from OCTO-WEB)
		api.POST("/workspaces/:workspace_id/inbox/webchat/send", inboxHandler.PublicWebChatSend)
		api.GET("/workspaces/:workspace_id/inbox/webchat/messages", inboxHandler.PublicWebChatMessages)

		// 2. Authenticated user routes
		userAuth := api.Group("")
		userAuth.Use(middleware.AuthMiddleware(cfg.JWTSecret))
		{
			userAuth.GET("/auth/me", authHandler.GetMe)
			userAuth.PATCH("/auth/profile", authHandler.UpdateProfile)
			userAuth.GET("/workspaces", workspaceHandler.ListUserWorkspaces)
			userAuth.POST("/workspaces", workspaceHandler.CreateWorkspace)
		}

		// 3. Workspace-scoped routes (Requires Auth + Workspace membership)
		wsRoutes := api.Group("/workspaces/:workspace_id")
		wsRoutes.Use(middleware.AuthMiddleware(cfg.JWTSecret))
		wsRoutes.Use(middleware.WorkspaceMiddleware(userRepo))
		{
			// Workspace settings & members
			wsRoutes.GET("", workspaceHandler.GetWorkspace)
			wsRoutes.PATCH("", middleware.RequireRole(domain.RoleOwner, domain.RoleAdmin), workspaceHandler.UpdateWorkspace)
			wsRoutes.GET("/members", workspaceHandler.ListMembers)
			wsRoutes.POST("/members", middleware.RequireRole(domain.RoleOwner, domain.RoleAdmin), workspaceHandler.InviteMember)
			wsRoutes.PATCH("/members/:member_id", middleware.RequireRole(domain.RoleOwner, domain.RoleAdmin), workspaceHandler.UpdateMemberRole)
			wsRoutes.DELETE("/members/:member_id", middleware.RequireRole(domain.RoleOwner, domain.RoleAdmin), workspaceHandler.RemoveMember)
			wsRoutes.GET("/invitations", workspaceHandler.ListInvitations)
			wsRoutes.POST("/invitations", middleware.RequireRole(domain.RoleOwner, domain.RoleAdmin), workspaceHandler.InviteMember)
			wsRoutes.DELETE("/invitations/:invitation_id", middleware.RequireRole(domain.RoleOwner, domain.RoleAdmin), workspaceHandler.RevokeInvitation)
			wsRoutes.POST("/invitations/:invitation_id/resend", middleware.RequireRole(domain.RoleOwner, domain.RoleAdmin), workspaceHandler.ResendInvitation)

			// Contacts
			wsRoutes.GET("/contacts", contactHandler.ListContacts)
			wsRoutes.POST("/contacts", contactHandler.CreateContact)
			wsRoutes.GET("/contacts/duplicates", contactHandler.FindDuplicates)
			wsRoutes.POST("/contacts/merge", middleware.RequireRole(domain.RoleOwner, domain.RoleAdmin), contactHandler.MergeContacts)
			wsRoutes.POST("/contacts/import-preview", contactHandler.PreviewCSV)
			wsRoutes.POST("/contacts/import-commit", contactHandler.CommitCSV)
			wsRoutes.GET("/contacts/export", contactHandler.ExportCSV)
			wsRoutes.GET("/contacts/:contact_id", contactHandler.GetContact)
			wsRoutes.PATCH("/contacts/:contact_id", contactHandler.UpdateContact)
			wsRoutes.DELETE("/contacts/:contact_id", contactHandler.DeleteContact)
			wsRoutes.GET("/contacts/:contact_id/activities", activityHandler.ListContactActivities)

			// Companies
			wsRoutes.GET("/companies", companyHandler.ListCompanies)
			wsRoutes.POST("/companies", companyHandler.CreateCompany)
			wsRoutes.GET("/companies/:company_id", companyHandler.GetCompany)
			wsRoutes.PATCH("/companies/:company_id", companyHandler.UpdateCompany)
			wsRoutes.DELETE("/companies/:company_id", companyHandler.DeleteCompany)

			// Pipelines & Deals
			wsRoutes.GET("/pipelines", dealHandler.ListPipelines)
			wsRoutes.POST("/pipelines", middleware.RequireRole(domain.RoleOwner, domain.RoleAdmin), dealHandler.CreatePipeline)
			wsRoutes.GET("/deals", dealHandler.ListDeals)
			wsRoutes.POST("/deals", dealHandler.CreateDeal)
			wsRoutes.GET("/deals/:deal_id", dealHandler.GetDeal)
			wsRoutes.PATCH("/deals/:deal_id", dealHandler.UpdateDeal)
			wsRoutes.PATCH("/deals/:deal_id/stage", dealHandler.UpdateDealStage)
			wsRoutes.DELETE("/deals/:deal_id", dealHandler.DeleteDeal)
			wsRoutes.GET("/deals/:deal_id/activities", activityHandler.ListDealActivities)
			wsRoutes.POST("/deals/:deal_id/whatsapp-outreach", pillarHandler.SendDealOutreachWhatsApp)

			// Tasks
			wsRoutes.GET("/tasks", taskHandler.ListTasks)
			wsRoutes.POST("/tasks", taskHandler.CreateTask)
			wsRoutes.GET("/tasks/:task_id", taskHandler.GetTask)
			wsRoutes.PATCH("/tasks/:task_id", taskHandler.UpdateTask)
			wsRoutes.PATCH("/tasks/:task_id/toggle", taskHandler.ToggleComplete)
			wsRoutes.DELETE("/tasks/:task_id", taskHandler.DeleteTask)

			// Activities
			wsRoutes.GET("/activities/recent", activityHandler.ListRecentActivities)
			wsRoutes.POST("/activities", activityHandler.CreateActivity)

			// Reports & Analytics
			wsRoutes.GET("/reports/summary", reportHandler.GetDashboardSummary)
			wsRoutes.GET("/reports/funnel", reportHandler.GetPipelineFunnel)
			wsRoutes.GET("/reports/lead-sources", reportHandler.GetLeadSources)
			wsRoutes.GET("/reports/activities", reportHandler.GetActivitySummary)
			wsRoutes.GET("/reports/audit-logs", middleware.RequireRole(domain.RoleOwner, domain.RoleAdmin), reportHandler.ListAuditLogs)

			// Omnichannel Live Chat & Inbox (WhatsApp + Email)
			wsRoutes.GET("/conversations", inboxHandler.ListConversations)
			wsRoutes.GET("/conversations/:conversation_id", inboxHandler.GetConversation)
			wsRoutes.GET("/conversations/:conversation_id/messages", inboxHandler.ListMessages)
			wsRoutes.GET("/inbox/events", inboxHandler.StreamEvents)
			wsRoutes.POST("/conversations/:conversation_id/messages", inboxHandler.SendReply)
			wsRoutes.DELETE("/conversations/:conversation_id", inboxHandler.DeleteConversation)
			wsRoutes.PATCH("/conversations/:conversation_id/status", inboxHandler.UpdateStatus)
			wsRoutes.PATCH("/conversations/:conversation_id/assign", inboxHandler.UpdateAssignment)
			wsRoutes.PATCH("/conversations/:conversation_id/bot", inboxHandler.ToggleBot)
			wsRoutes.POST("/conversations/:conversation_id/takeover", inboxHandler.TakeoverConversation)
			wsRoutes.POST("/conversations/:conversation_id/escalate", inboxHandler.EscalateConversation)
			wsRoutes.POST("/conversations/:conversation_id/log-access", inboxHandler.LogConversationAccess)
			wsRoutes.PATCH("/conversations/:conversation_id/priority", inboxHandler.UpdatePriority)
			wsRoutes.GET("/inbox/monitoring-stats", inboxHandler.GetMonitoringStats)
			wsRoutes.GET("/inbox/audit-trail", inboxHandler.ListInboxAuditTrail)
			wsRoutes.GET("/notifications", notificationHandler.ListNotifications)
			wsRoutes.PATCH("/notifications/:notification_id/read", notificationHandler.MarkAsRead)
			wsRoutes.POST("/notifications/mark-all-read", notificationHandler.MarkAllAsRead)
			wsRoutes.POST("/conversations/:conversation_id/convert-to-deal", inboxHandler.ConvertToDeal)
			wsRoutes.POST("/inbox/clear-all", inboxHandler.ClearAllConversations)
			wsRoutes.GET("/bot/settings", inboxHandler.GetBotSettings)
			wsRoutes.PUT("/bot/settings", middleware.RequireRole(domain.RoleOwner, domain.RoleAdmin), inboxHandler.UpdateBotSettings)
			wsRoutes.GET("/bot-settings", inboxHandler.GetBotSettings)
			wsRoutes.PUT("/bot-settings", middleware.RequireRole(domain.RoleOwner, domain.RoleAdmin), inboxHandler.UpdateBotSettings)
			wsRoutes.POST("/inbox/webhook/incoming", inboxHandler.IncomingWebhook)
			wsRoutes.GET("/inbox/whatsapp-config", inboxHandler.GetWhatsAppConfig)
			wsRoutes.PATCH("/inbox/whatsapp-config", inboxHandler.UpdateWhatsAppConfig)
			wsRoutes.GET("/inbox/whatsapp-qr", inboxHandler.GetWhatsAppQR)
			wsRoutes.GET("/inbox/whatsapp-status", inboxHandler.GetWhatsAppStatus)
			wsRoutes.POST("/inbox/whatsapp-restart", inboxHandler.RestartWhatsAppSession)
			wsRoutes.POST("/inbox/whatsapp-sync-history", inboxHandler.SyncWhatsAppHistory)
			wsRoutes.POST("/inbox/upload", inboxHandler.UploadAttachment)

			// Tickets (Support & After-Sales Helpdesk - Exclusively for After-Sales CS & Owner/Admin)
			ticketRoutes := wsRoutes.Group("/tickets", middleware.RequireAfterSalesDepartment())
			{
				ticketRoutes.GET("", ticketHandler.ListTickets)
				ticketRoutes.POST("", ticketHandler.CreateTicket)
				ticketRoutes.GET("/:ticket_id", ticketHandler.GetTicket)
				ticketRoutes.PATCH("/:ticket_id", ticketHandler.UpdateTicket)
				ticketRoutes.POST("/:ticket_id/claim", ticketHandler.ClaimTicket)
				ticketRoutes.POST("/:ticket_id/notes", ticketHandler.AddTicketNote)
				ticketRoutes.POST("/check-sla", pillarHandler.CheckSLAEscalation)
			}
			wsRoutes.GET("/reports/support", middleware.RequireAfterSalesDepartment(), ticketHandler.GetSupportStats)

			// Workspace Channels (Multi-Account / Multi-Session)
			wsRoutes.GET("/channels", inboxHandler.ListChannels)
			wsRoutes.POST("/channels", inboxHandler.CreateChannel)
			wsRoutes.DELETE("/channels/:channel_id", inboxHandler.DeleteChannel)
			wsRoutes.GET("/channels/:channel_id/qr", inboxHandler.GetChannelQR)

			// Pilar 3: CPQ & Quotations (Official PDF & WA Send)
			wsRoutes.POST("/quotations", pillarHandler.CreateQuotation)
			wsRoutes.GET("/quotations", pillarHandler.ListQuotations)
			wsRoutes.GET("/quotations/:quotation_id", pillarHandler.GetQuotation)
			wsRoutes.PATCH("/quotations/:quotation_id/status", pillarHandler.UpdateQuotationStatus)
			wsRoutes.POST("/quotations/:quotation_id/send-whatsapp", pillarHandler.SendQuotationWhatsApp)

			// Pilar 2: WhatsApp Broadcast & Blast Campaigns
			wsRoutes.POST("/broadcasts", pillarHandler.CreateBroadcast)
			wsRoutes.GET("/broadcasts", pillarHandler.ListBroadcasts)
			wsRoutes.GET("/broadcasts/:campaign_id", pillarHandler.GetBroadcast)

			// Pilar 1: Workflow Automation & Triggers
			wsRoutes.GET("/automations", pillarHandler.ListAutomations)
			wsRoutes.PUT("/automations", pillarHandler.UpdateAutomation)

			// Pilar 5: AI Sales & CS Copilot (Summarize & Smart Replies)
			wsRoutes.POST("/ai/summarize-chat", pillarHandler.SummarizeChat)
			wsRoutes.POST("/ai/suggest-replies", pillarHandler.SuggestReplies)

			// ================= UNIFIED OPERATIONS: INVENTORY, ATTENDANCE & PAYROLL =================
			// 1. Inventory & Products
			wsRoutes.GET("/products", unifiedOpsHandler.ListProducts)
			wsRoutes.POST("/products", unifiedOpsHandler.CreateProduct)
			wsRoutes.GET("/products/:id", unifiedOpsHandler.GetProduct)
			wsRoutes.PATCH("/products/:id", unifiedOpsHandler.UpdateProduct)
			wsRoutes.POST("/products/:id/adjust-stock", unifiedOpsHandler.AdjustStock)
			wsRoutes.GET("/products/:id/movements", unifiedOpsHandler.ListStockMovements)

			// 2. Workforce Attendance & GPS
			wsRoutes.POST("/attendances/check-in", unifiedOpsHandler.CheckIn)
			wsRoutes.POST("/attendances/check-out", unifiedOpsHandler.CheckOut)
			wsRoutes.GET("/attendances/today", unifiedOpsHandler.GetTodayAttendance)
			wsRoutes.GET("/attendances", unifiedOpsHandler.ListAttendances)
			wsRoutes.GET("/attendances/summary", unifiedOpsHandler.GetAttendanceSummary)

			// 3. Dynamic Payroll & Formula Engine
			wsRoutes.GET("/payroll/components", unifiedOpsHandler.ListPayrollComponents)
			wsRoutes.POST("/payroll/components", unifiedOpsHandler.CreatePayrollComponent)
			wsRoutes.PATCH("/payroll/components/:id", unifiedOpsHandler.UpdatePayrollComponent)
			wsRoutes.DELETE("/payroll/components/:id", unifiedOpsHandler.DeletePayrollComponent)
			wsRoutes.POST("/payroll/simulate", unifiedOpsHandler.SimulateFormula)
			wsRoutes.GET("/payroll/slips", unifiedOpsHandler.ListPayrollSlips)
			wsRoutes.POST("/payroll/generate", unifiedOpsHandler.GenerateMonthlyPayrollRun)

			// ================= COMMERCIAL OPS: INVOICES, QUOTATIONS & DRIP AUTOMATIONS =================
			// 1. Invoices & Quotations & Payment Simulation
			wsRoutes.GET("/invoices", commercialOpsHandler.ListInvoices)
			wsRoutes.POST("/invoices", commercialOpsHandler.CreateInvoice)
			wsRoutes.GET("/invoices/:id", commercialOpsHandler.GetInvoiceByID)
			wsRoutes.POST("/invoices/:id/pay", commercialOpsHandler.PayInvoice)
			wsRoutes.POST("/invoices/:id/autogopay-qris", commercialOpsHandler.GenerateAutoGopayQRIS)
			wsRoutes.GET("/invoices/:id/autogopay-status", commercialOpsHandler.CheckAutoGopayQRISStatus)

			// 2. WhatsApp Drip Marketing & Follow-up Workflows
			wsRoutes.GET("/drip-automations", commercialOpsHandler.ListWorkflows)
			wsRoutes.POST("/drip-automations", commercialOpsHandler.CreateWorkflow)
			wsRoutes.PUT("/drip-automations/:id", commercialOpsHandler.UpdateWorkflow)
			wsRoutes.DELETE("/drip-automations/:id", commercialOpsHandler.DeleteWorkflow)
			wsRoutes.POST("/drip-automations/:id/trigger", commercialOpsHandler.TriggerWorkflow)
			wsRoutes.GET("/drip-automations/logs", commercialOpsHandler.ListAutomationLogs)

			// ================= SALES COMMISSION & WAR-ROOM LEADERBOARD =================
			// 1. Commission Plans
			wsRoutes.GET("/commissions/plans", commissionHandler.ListPlans)
			wsRoutes.POST("/commissions/plans", commissionHandler.CreatePlan)
			wsRoutes.PUT("/commissions/plans/:id", commissionHandler.UpdatePlan)

			// 2. Sales Commissions & Approvals
			wsRoutes.GET("/commissions", commissionHandler.ListCommissions)
			wsRoutes.GET("/commissions/summary", commissionHandler.GetCommissionSummary)
			wsRoutes.PUT("/commissions/:id/status", commissionHandler.UpdateCommissionStatus)

			// 3. Live Sales War-Room & Leaderboard TV Mode
			wsRoutes.GET("/war-room/stats", commissionHandler.GetWarRoomStats)
			wsRoutes.POST("/war-room/target", commissionHandler.SetTeamTarget)

			// 4. Company Payment & Real QRIS Settings
			wsRoutes.GET("/payment-settings", commercialOpsHandler.GetPaymentSettings)
			wsRoutes.PUT("/payment-settings", commercialOpsHandler.UpdatePaymentSettings)
			wsRoutes.POST("/payment-settings/upload-qris", commercialOpsHandler.UploadQRISImage)
		}

		// 4. Platform Master Admin routes (Requires Super Admin)
		masterRoutes := api.Group("/master")
		masterRoutes.Use(middleware.AuthMiddleware(cfg.JWTSecret))
		masterRoutes.Use(middleware.RequireSuperAdmin(userRepo))
		{
			masterRoutes.GET("/workspaces", masterHandler.ListWorkspaces)
			masterRoutes.POST("/workspaces", masterHandler.ProvisionCompany)
			masterRoutes.PATCH("/workspaces/:id/status", masterHandler.UpdateCompanyStatus)
			masterRoutes.DELETE("/workspaces/:id", masterHandler.DeleteCompany)
		}
	}

	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("🚀 OCTO CRM Backend API server listening on %s", addr)
	if err := router.Run(addr); err != nil {
		log.Fatalf("Server failed to run: %v", err)
	}
}
