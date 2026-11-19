export type Role = 'owner' | 'admin' | 'supervisor' | 'member' | 'viewer';

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  is_superadmin?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  currency: string;
  status?: 'active' | 'suspended' | 'pending_whitelist' | string;
  subscription_plan?: 'starter' | 'pro' | 'enterprise' | string;
  max_users?: number;
  max_channels?: number;
  expires_at?: string;
  role?: Role;
  department?: string;
  created_at: string;
  updated_at: string;
}

export interface MasterWorkspaceSummary extends Workspace {
  owner_name: string;
  owner_email: string;
  total_members: number;
  total_deals: number;
  total_tickets: number;
  total_channels: number;
}

export interface ProvisionCompanyRequest {
  company_name: string;
  subscription_plan?: string;
  max_users?: number;
  max_channels?: number;
  owner_full_name: string;
  owner_email: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: Role;
  department?: 'sales' | 'support' | 'management' | 'all' | string;
  joined_at: string;
}

export interface WorkspaceInvitation {
  id: string;
  workspace_id: string;
  workspace_name?: string;
  email: string;
  full_name: string;
  role: Role;
  department: string;
  token: string;
  invited_by_id?: string;
  invited_by_name?: string;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  expires_at: string;
  accepted_at?: string;
  created_at: string;
  updated_at: string;
  invite_url?: string;
}

export interface Company {
  id: string;
  workspace_id: string;
  name: string;
  industry?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  workspace_id: string;
  company_id?: string;
  company_name?: string;
  first_name: string;
  last_name?: string;
  full_name: string;
  email?: string;
  phone?: string;
  normalized_phone?: string;
  job_title?: string;
  lead_source: string;
  tags: string[];
  notes?: string;
  consent_status?: string;
  is_archived: boolean;
  custom_fields?: Record<string, any>;
  owner_id?: string;
  owner_name?: string;
  created_at: string;
  updated_at: string;
}

export interface DuplicateCandidate {
  primary_contact: Contact;
  secondary_contact: Contact;
  match_reason: 'same_email' | 'same_phone';
}

export interface PipelineStage {
  id: string;
  pipeline_id: string;
  name: string;
  order_index: number;
  probability: number;
  is_won: boolean;
  is_lost: boolean;
  deal_count?: number;
  total_value?: number;
}

export interface Pipeline {
  id: string;
  workspace_id: string;
  name: string;
  is_default: boolean;
  stages?: PipelineStage[];
  created_at: string;
  updated_at: string;
}

export type DealStatus = 'open' | 'won' | 'lost';

export interface Deal {
  id: string;
  workspace_id: string;
  pipeline_id: string;
  pipeline_name?: string;
  stage_id: string;
  stage_name?: string;
  stage_probability?: number;
  contact_id?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  company_id?: string;
  company_name?: string;
  owner_id?: string;
  owner_name?: string;
  title: string;
  value: number;
  currency: string;
  expected_close_date?: string;
  status: DealStatus;
  priority?: number; // 0: None, 1: Normal, 2: High, 3: Very High (Odoo stars)
  probability?: number; // 0-100%
  tags?: string[];
  is_lead?: boolean;
  lost_reason?: string;
  handover_ticket_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';

export interface Task {
  id: string;
  workspace_id: string;
  contact_id?: string;
  contact_name?: string;
  deal_id?: string;
  deal_title?: string;
  assigned_to_id?: string;
  assigned_to_name?: string;
  title: string;
  description?: string;
  due_date?: string;
  priority: TaskPriority;
  status: TaskStatus;
  is_overdue?: boolean;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export type ActivityType = 'call' | 'meeting' | 'email' | 'note' | 'whatsapp' | 'status_change';

export interface Activity {
  id: string;
  workspace_id: string;
  contact_id: string;
  contact_name?: string;
  deal_id?: string;
  deal_title?: string;
  user_id?: string;
  user_name?: string;
  user_avatar?: string;
  type: ActivityType;
  subject: string;
  description?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface DashboardSummary {
  open_pipeline_value: number;
  won_deal_value: number;
  total_contacts: number;
  overdue_tasks_count: number;
  due_today_tasks_count: number;
  total_deals_count: number;
  conversion_rate: number;
}

export interface StageFunnelItem {
  stage_id: string;
  stage_name: string;
  order_index: number;
  deal_count: number;
  total_value: number;
}

export interface LeadSourceItem {
  lead_source: string;
  count: number;
  total_deals?: number;
  won_deals?: number;
  total_value: number;
  conversion_rate?: number;
  previous_count?: number;
  growth_pct?: number;
}

export interface ActivitySummaryItem {
  type: string;
  count: number;
}

// ================= UNIFIED OPERATIONS: INVENTORY, ATTENDANCE & PAYROLL =================

export interface Product {
  id: string;
  workspace_id: string;
  sku: string;
  name: string;
  category: string;
  description: string;
  cost_price: number;
  sale_price: number;
  stock_quantity: number;
  min_stock_alert: number;
  unit: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductStockMovement {
  id: string;
  workspace_id: string;
  product_id: string;
  product_name?: string;
  product_sku?: string;
  deal_id?: string;
  type: string;
  quantity: number;
  notes: string;
  created_by?: string;
  created_at: string;
}

export interface Attendance {
  id: string;
  workspace_id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  date: string;
  check_in?: string;
  check_out?: string;
  gps_lat?: number;
  gps_lng?: number;
  location_name: string;
  status: 'present' | 'late' | 'absent' | 'on_leave';
  overtime_hours: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface AttendanceSummary {
  total_days_present: number;
  total_late_count: number;
  total_overtime: number;
  total_absent: number;
}

export interface PayrollComponent {
  id: string;
  workspace_id: string;
  name: string;
  code: string;
  type: 'allowance' | 'deduction' | 'commission' | 'tax';
  formula_expression: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PayrollSlip {
  id: string;
  workspace_id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  period_month: string;
  base_salary: number;
  total_allowances: number;
  total_deductions: number;
  total_commissions: number;
  net_salary: number;
  status: 'draft' | 'approved' | 'paid';
  calculation_breakdown: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface FormulaSimulationResponse {
  formula_expression: string;
  evaluated_result: number;
  variables_used: Record<string, number>;
  error?: string;
}

export interface AuditEvent {
  id: string;
  workspace_id: string;
  user_id?: string;
  user_name?: string;
  action: string;
  entity_type: string;
  entity_id: string;
  description: string;
  metadata?: Record<string, any>;
  ip_address?: string;
  created_at: string;
}

export type ConversationChannel = 'whatsapp' | 'email' | 'webchat';
export type ConversationStatus = 'open' | 'pending' | 'closed';

export interface Conversation {
  id: string;
  workspace_id: string;
  contact_id?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  company_name?: string;
  channel: ConversationChannel;
  channel_identifier: string;
  channel_id?: string;
  department?: 'sales' | 'support' | string;
  subject?: string;
  status: ConversationStatus;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  is_sla_breached?: boolean;
  frt_due_at?: string;
  first_responded_at?: string;
  sla_due_at?: string;
  escalated_to_id?: string;
  escalated_to_name?: string;
  escalated_by_id?: string;
  escalated_by_name?: string;
  escalation_reason?: string;
  escalated_at?: string;
  bot_active?: boolean;
  bot_handoff_reason?: string;
  assigned_to_id?: string;
  assigned_to_name?: string;
  unread_count: number;
  sentiment?: 'positive' | 'neutral' | 'negative' | 'critical' | string;
  ai_summary?: string;
  last_message_content?: string;
  last_message_at: string;
  created_at: string;
  updated_at: string;
}

export interface AgentWorkload {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  department: string;
  active_chats: number;
  pending_chats: number;
  resolved_chats: number;
  avg_response_min: number;
  sla_breached: number;
}

export interface MonitoringStats {
  total_conversations: number;
  open_conversations: number;
  pending_conversations: number;
  resolved_conversations: number;
  unassigned_count: number;
  sla_breached_count: number;
  complaints_count: number;
  escalated_count: number;
  exceptions_count?: number;
  avg_first_response_minutes: number;
  sla_compliance_rate: number;
  agent_workloads: AgentWorkload[];
}

export interface InboxAuditEvent {
  id: string;
  workspace_id: string;
  user_id?: string;
  user_name?: string;
  action: string;
  entity_type: string;
  entity_id: string;
  description: string;
  metadata?: any;
  ip_address?: string;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  workspace_id: string;
  user_id: string;
  type: 'conversation_escalated' | 'conversation_assigned' | 'conversation_takeover' | 'sla_breached' | 'system' | string;
  title: string;
  message: string;
  data?: {
    conversation_id?: string;
    priority?: string;
    escalated_by?: string;
    assigned_by?: string;
    taken_by?: string;
    contact_name?: string;
    reason?: string;
    [key: string]: any;
  };
  is_read: boolean;
  created_at: string;
  read_at?: string;
}

export interface NotificationListResponse {
  notifications: NotificationItem[];
  unread_count: number;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_type: 'customer' | 'agent' | 'bot' | string;
  sender_id?: string;
  sender_name: string;
  content: string;
  channel: ConversationChannel;
  status: 'sent' | 'delivered' | 'read';
  metadata?: Record<string, any>;
  created_at: string;
}

export interface APIResponse<T = any> {
  success: boolean;
  message?: string;
  data: T;
  error?: string;
  meta?: {
    current_page: number;
    per_page: number;
    total_items: number;
    total_pages: number;
  };
}

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketStatus = 'open' | 'in_progress' | 'escalated' | 'resolved' | 'closed';

export interface TicketActivity {
  id: string;
  ticket_id: string;
  user_id?: string;
  user_name?: string;
  activity_type: 'note' | 'status_change' | 'assignment_change' | 'escalation';
  note: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface Ticket {
  id: string;
  workspace_id: string;
  ticket_number: string;
  conversation_id?: string;
  contact_id?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  subject: string;
  description: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  assigned_to_id?: string;
  assigned_to_name?: string;
  created_by_id?: string;
  created_by_name?: string;
  department: string;
  sla_due_at?: string;
  frt_due_at?: string;
  first_responded_at?: string;
  is_sla_breached?: boolean;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
  activities?: TicketActivity[];
}

export interface WorkspaceChannel {
  id: string;
  workspace_id: string;
  channel_name: string;
  channel_type: string;
  department: string;
  phone_number: string;
  session_name: string;
  assigned_user_id?: string;
  assigned_user_name?: string;
  qr_code?: string;
  status: string;
  is_active: boolean;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface SupportReportResponse {
  total_tickets: number;
  open_tickets: number;
  in_progress_tickets: number;
  escalated_tickets: number;
  resolved_tickets: number;
  resolution_rate: number;
  avg_resolution_hours: number;
  category_breakdown: Record<string, number>;
  priority_breakdown: Record<string, number>;
  department_breakdown: Record<string, number>;
}

export interface WorkspaceInvitation {
  id: string;
  workspace_id: string;
  workspace_name?: string;
  email: string;
  full_name: string;
  role: Role;
  department: string;
  token: string;
  invited_by_id?: string;
  invited_by_name?: string;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  expires_at: string;
  accepted_at?: string;
  created_at: string;
  updated_at: string;
  invite_url?: string;
}

export interface InvitationDetailResponse {
  invitation: WorkspaceInvitation;
  workspace: Workspace;
}

// --- Pilar 3: CPQ & Quotation ---
export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';

export interface QuotationItem {
  id?: string;
  quotation_id?: string;
  item_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  order_index?: number;
}

export interface Quotation {
  id: string;
  workspace_id: string;
  deal_id?: string;
  deal_title?: string;
  contact_id?: string;
  quote_number: string;
  title: string;
  status: QuotationStatus;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  company_name?: string;
  subtotal: number;
  discount_percentage: number;
  discount_amount: number;
  tax_percentage: number;
  tax_amount: number;
  grand_total: number;
  valid_until?: string;
  notes?: string;
  terms_conditions?: string;
  created_by_id?: string;
  created_by_name?: string;
  items?: QuotationItem[];
  created_at: string;
  updated_at: string;
}

export interface CreateQuotationRequest {
  deal_id?: string;
  contact_id?: string;
  title: string;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  company_name?: string;
  discount_percentage: number;
  tax_percentage: number;
  valid_until?: string;
  notes?: string;
  terms_conditions?: string;
  items: Array<{
    item_name: string;
    description?: string;
    quantity: number;
    unit_price: number;
  }>;
}

// --- Pilar 2: WhatsApp Broadcast Engine ---
export type BroadcastStatus = 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed';

export interface BroadcastCampaign {
  id: string;
  workspace_id: string;
  channel_id?: string;
  channel_name?: string;
  created_by_id?: string;
  created_by_name?: string;
  name: string;
  message_template: string;
  department: string;
  target_filter?: Record<string, any>;
  status: BroadcastStatus;
  scheduled_at?: string;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
  updated_at: string;
}

export interface BroadcastRecipient {
  id: string;
  campaign_id: string;
  contact_id?: string;
  phone_number: string;
  recipient_name: string;
  interpolated_message: string;
  status: 'pending' | 'sent' | 'failed';
  sent_at?: string;
  error_message?: string;
  created_at: string;
}

export interface CreateBroadcastRequest {
  name: string;
  channel_id?: string;
  department?: string;
  message_template: string;
  target_filter?: Record<string, any>;
  contact_ids?: string[];
  send_now?: boolean;
}

// --- Pilar 1: Workflow Automations ---
export interface WorkspaceAutomation {
  id: string;
  workspace_id: string;
  automation_type: string;
  is_enabled: boolean;
  config?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// --- Pilar 5: AI Copilot ---
export interface AISummarizeResponse {
  conversation_id: string;
  summary: string;
  key_points: string[];
  sentiment: 'positive' | 'neutral' | 'negative' | 'critical' | string;
  sentiment_score: number;
  next_action: string;
}

export interface AISmartReplyOption {
  title: string;
  tone: string;
  content: string;
}

export interface AISuggestionResponse {
  conversation_id: string;
  suggestions: AISmartReplyOption[];
  detected_intent: string;
}

export interface CustomFAQItem {
  keywords: string;
  response: string;
}

export interface WorkspaceBotSettings {
  id: string;
  workspace_id: string;
  bot_enabled: boolean;
  bot_name: string;
  greeting_message: string;
  menu_1_title: string;
  menu_1_keywords: string;
  menu_1_response: string;
  menu_2_title: string;
  menu_2_keywords: string;
  menu_2_response: string;
  menu_3_title: string;
  menu_3_keywords: string;
  menu_3_response: string;
  menu_4_title: string;
  menu_4_keywords: string;
  menu_4_response: string;
  handoff_message: string;
  custom_faqs?: CustomFAQItem[] | any;
  created_at: string;
  updated_at: string;
}

// Commercial Ops: Invoices, Quotations, Payments & Drip Automations
export interface InvoiceItem {
  id?: string;
  invoice_id?: string;
  product_id?: string;
  item_name: string;
  sku?: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total_price: number;
  created_at?: string;
}

export interface Invoice {
  id: string;
  workspace_id: string;
  deal_id?: string;
  contact_id?: string;
  company_id?: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  type: 'quotation' | 'invoice';
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  notes?: string;
  terms?: string;
  payment_method?: string;
  payment_reference?: string;
  paid_at?: string;
  created_at: string;
  updated_at: string;
  items?: InvoiceItem[];
  contact_name?: string;
  contact_phone?: string;
  company_name?: string;
  deal_title?: string;
}

export interface CreateInvoiceRequest {
  deal_id?: string;
  contact_id?: string;
  company_id?: string;
  invoice_number?: string;
  issue_date?: string;
  due_date?: string;
  type: 'quotation' | 'invoice';
  notes?: string;
  terms?: string;
  payment_method?: string;
  discount_amount?: number;
  tax_amount?: number;
  items: {
    product_id?: string;
    item_name: string;
    sku?: string;
    quantity: number;
    unit_price: number;
    discount: number;
    total_price: number;
  }[];
}

export interface AutomationWorkflow {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  trigger_type: string;
  trigger_config: Record<string, any>;
  action_type: string;
  action_config: Record<string, any>;
  is_active: boolean;
  execution_count: number;
  last_triggered_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AutomationLog {
  id: string;
  workflow_id: string;
  workspace_id: string;
  workflow_name?: string;
  target_type: string;
  target_id: string;
  target_name?: string;
  status: 'success' | 'failed';
  action_details: string;
  created_at: string;
}

// ==============================================================================
// Sales Commission & War Room Types
// ==============================================================================

export interface SalesCommissionPlan {
  id: string;
  workspace_id: string;
  name: string;
  calculation_type: 'percentage_deal' | 'fixed_amount' | 'tiered_threshold';
  base_rate: number;
  threshold_amount: number;
  bonus_rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCommissionPlanRequest {
  name: string;
  calculation_type: 'percentage_deal' | 'fixed_amount' | 'tiered_threshold';
  base_rate: number;
  threshold_amount?: number;
  bonus_rate?: number;
  is_active?: boolean;
}

export interface SalesCommission {
  id: string;
  workspace_id: string;
  user_id: string;
  deal_id?: string;
  invoice_id?: string;
  plan_id?: string;
  deal_title: string;
  deal_amount: number;
  commission_rate: number;
  commission_amount: number;
  status: 'pending' | 'approved' | 'paid_in_payroll' | 'rejected';
  period: string;
  approved_by?: string;
  approved_at?: string;
  paid_payroll_slip_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  user_name?: string;
  user_email?: string;
  plan_name?: string;
}

export interface CommissionSummary {
  total_accrued: number;
  total_pending: number;
  total_approved: number;
  total_paid_in_payroll: number;
  top_earner_name: string;
  top_earner_amount: number;
}

export interface WarRoomLeaderboardItem {
  rank: number;
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string;
  deals_won: number;
  total_revenue: number;
  total_commission: number;
  target_amount: number;
  achievement_percentage: number;
}

export interface RecentCelebration {
  deal_id: string;
  deal_title: string;
  amount: number;
  rep_name: string;
  commission_amount: number;
  closed_at: string;
}

export interface WarRoomStats {
  period: string;
  team_target: number;
  total_revenue_won: number;
  total_deals_won: number;
  total_commission_accrued: number;
  achievement_percentage: number;
  leaderboard: WarRoomLeaderboardItem[];
  recent_celebrations: RecentCelebration[];
}

export interface WorkspacePaymentSettings {
  id: string;
  workspace_id: string;
  bank_name: string;
  bank_account_number: string;
  bank_account_holder: string;
  qris_image_url: string;
  qris_payload: string;
  payment_gateway_provider: 'manual' | 'midtrans' | 'xendit' | 'autogopay' | string;
  payment_gateway_client_key?: string;
  payment_gateway_server_key?: string;
  payment_gateway_is_production?: boolean;
  autogopay_api_key?: string;
  autogopay_merchant_name?: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceQRISTransaction {
  id: string;
  workspace_id: string;
  invoice_id: string;
  provider: string;
  transaction_id: string;
  order_id: string;
  amount: number;
  qr_string: string;
  qr_url: string;
  checkout_url?: string;
  status: string; // 'pending' | 'settlement' | 'expire' | 'cancel'
  generate_count: number;
  transaction_time: string;
  expiry_time: string;
  paid_at?: string;
  created_at: string;
  updated_at: string;
}





