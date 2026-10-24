import {
  APIResponse,
  Activity,
  AuditEvent,
  ChatMessage,
  Company,
  Contact,
  Conversation,
  DashboardSummary,
  Deal,
  DuplicateCandidate,
  Pipeline,
  StageFunnelItem,
  LeadSourceItem,
  ActivitySummaryItem,
  Task,
  User,
  Workspace,
  WorkspaceMember,
  WorkspaceInvitation,
  Ticket,
  TicketActivity,
  WorkspaceChannel,
  SupportReportResponse,
  Quotation,
  QuotationStatus,
  CreateQuotationRequest,
  BroadcastCampaign,
  CreateBroadcastRequest,
  WorkspaceAutomation,
  AISummarizeResponse,
  AISuggestionResponse,
  MasterWorkspaceSummary,
  ProvisionCompanyRequest,
  MonitoringStats,
  InboxAuditEvent,
  NotificationItem,
  NotificationListResponse,
  WorkspaceBotSettings,
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

class ApiClient {
  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('octo_token');
    }
    return null;
  }

  private getWorkspaceId(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('octo_workspace_id');
    }
    return null;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const workspaceId = this.getWorkspaceId();

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (workspaceId) {
      headers['X-Workspace-ID'] = workspaceId;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401 && typeof window !== 'undefined') {
      // Don't auto-redirect on login/register endpoints
      if (!endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
        localStorage.removeItem('octo_token');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }

    // Handle CSV or file downloads
    if (options.headers && (options.headers as any)['Accept'] === 'text/csv') {
      return (await response.blob()) as unknown as T;
    }

    const data: APIResponse<T> = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || data.message || 'Request failed');
    }

    return data.data;
  }

  // --- Auth ---
  async login(email: string, password: string) {
    const res = await this.request<{
      token: string;
      user: User;
      workspaces: Workspace[];
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (typeof window !== 'undefined') {
      localStorage.setItem('octo_token', res.token);
      localStorage.setItem('octo_user', JSON.stringify(res.user));
      if (res.workspaces && res.workspaces.length > 0) {
        localStorage.setItem('octo_workspace_id', res.workspaces[0].id);
        localStorage.setItem('octo_workspace', JSON.stringify(res.workspaces[0]));
      }
    }
    return res;
  }

  async register(full_name: string, email: string, password: string, workspace_name: string) {
    const res = await this.request<{
      token: string;
      user: User;
      workspaces: Workspace[];
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ full_name, email, password, workspace_name }),
    });

    if (typeof window !== 'undefined') {
      localStorage.setItem('octo_token', res.token);
      localStorage.setItem('octo_user', JSON.stringify(res.user));
      if (res.workspaces && res.workspaces.length > 0) {
        localStorage.setItem('octo_workspace_id', res.workspaces[0].id);
        localStorage.setItem('octo_workspace', JSON.stringify(res.workspaces[0]));
      }
    }
    return res;
  }

  async getMe() {
    return this.request<{ user: User; workspaces: Workspace[] }>('/auth/me');
  }

  // --- Workspaces ---
  async listWorkspaces() {
    const res = await this.request<Workspace[]>('/workspaces');
    return res ?? [];
  }

  async createWorkspace(name: string, timezone = 'Asia/Jakarta', currency = 'IDR') {
    return this.request<Workspace>('/workspaces', {
      method: 'POST',
      body: JSON.stringify({ name, timezone, currency }),
    });
  }

  async getWorkspace(wsId: string) {
    return this.request<Workspace>(`/workspaces/${wsId}`);
  }

  async updateWorkspace(wsId: string, data: Partial<Workspace>) {
    return this.request<Workspace>(`/workspaces/${wsId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async listMembers(wsId: string) {
    const res = await this.request<WorkspaceMember[]>(`/workspaces/${wsId}/members`);
    return res ?? [];
  }

  async inviteMember(wsId: string, data: { email: string; full_name?: string; role: string; department?: string }) {
    return this.request<WorkspaceInvitation>(`/workspaces/${wsId}/invitations`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listInvitations(wsId: string) {
    const res = await this.request<WorkspaceInvitation[]>(`/workspaces/${wsId}/invitations`);
    return res ?? [];
  }

  async revokeInvitation(wsId: string, invitationId: string) {
    return this.request<void>(`/workspaces/${wsId}/invitations/${invitationId}`, {
      method: 'DELETE',
    });
  }

  async resendInvitation(wsId: string, invitationId: string) {
    return this.request<WorkspaceInvitation>(`/workspaces/${wsId}/invitations/${invitationId}/resend`, {
      method: 'POST',
    });
  }

  async getInvitationByToken(token: string) {
    return this.request<{
      invitation: WorkspaceInvitation;
      workspace: { id: string; name: string; slug: string };
    }>(`/invitations/${token}`);
  }

  async acceptInvitation(token: string, data: { full_name?: string; password: string }) {
    return this.request<{
      token: string;
      user: { id: string; email: string; full_name: string; avatar_url: string };
      workspace: { id: string; name: string; slug: string };
    }>(`/invitations/${token}/accept`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMemberRole(wsId: string, memberId: string, role?: string, department?: string) {
    return this.request<void>(`/workspaces/${wsId}/members/${memberId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role, department }),
    });
  }

  async removeMember(wsId: string, memberId: string) {
    return this.request<void>(`/workspaces/${wsId}/members/${memberId}`, {
      method: 'DELETE',
    });
  }

  // --- Platform Master Admin (Provisioning & Whitelist Tenants) ---
  async listMasterWorkspaces() {
    return this.request<MasterWorkspaceSummary[]>('/master/workspaces');
  }

  async provisionCompany(data: ProvisionCompanyRequest) {
    return this.request<{ company: MasterWorkspaceSummary; invite_url: string }>('/master/workspaces', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCompanyMasterStatus(wsId: string, data: { status: string; subscription_plan?: string; max_users?: number; max_channels?: number }) {
    return this.request<void>(`/master/workspaces/${wsId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteMasterWorkspace(wsId: string) {
    return this.request<void>(`/master/workspaces/${wsId}`, {
      method: 'DELETE',
    });
  }

  // --- Contacts ---
  async listContacts(wsId: string, params: { page?: number; per_page?: number; query?: string; lead_source?: string; tag?: string } = {}) {
    const q = new URLSearchParams();
    if (params.page) q.append('page', params.page.toString());
    if (params.per_page) q.append('per_page', params.per_page.toString());
    if (params.query) q.append('query', params.query);
    if (params.lead_source) q.append('lead_source', params.lead_source);
    if (params.tag) q.append('tag', params.tag);

    const res = await this.request<Contact[]>(`/workspaces/${wsId}/contacts?${q.toString()}`);
    return res ?? [];
  }

  async getContact(wsId: string, contactId: string) {
    return this.request<Contact>(`/workspaces/${wsId}/contacts/${contactId}`);
  }

  async createContact(wsId: string, data: Partial<Contact>) {
    return this.request<Contact>(`/workspaces/${wsId}/contacts`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateContact(wsId: string, contactId: string, data: Partial<Contact>) {
    return this.request<Contact>(`/workspaces/${wsId}/contacts/${contactId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteContact(wsId: string, contactId: string) {
    return this.request<void>(`/workspaces/${wsId}/contacts/${contactId}`, {
      method: 'DELETE',
    });
  }

  async findDuplicates(wsId: string) {
    const res = await this.request<DuplicateCandidate[]>(`/workspaces/${wsId}/contacts/duplicates`);
    return res ?? [];
  }

  async mergeContacts(wsId: string, primaryId: string, secondaryId: string, combineNotes = true, combineTags = true) {
    return this.request<void>(`/workspaces/${wsId}/contacts/merge`, {
      method: 'POST',
      body: JSON.stringify({
        primary_contact_id: primaryId,
        secondary_contact_id: secondaryId,
        combine_notes: combineNotes,
        combine_tags: combineTags,
      }),
    });
  }

  async previewCSV(wsId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.request<any>(`/workspaces/${wsId}/contacts/import-preview`, {
      method: 'POST',
      body: formData,
    });
  }

  async commitCSV(wsId: string, columnMapping: Record<string, string>, rows: any[]) {
    return this.request<{ success_count: number; failed_count: number }>(`/workspaces/${wsId}/contacts/import-commit`, {
      method: 'POST',
      body: JSON.stringify({ column_mapping: columnMapping, rows, skip_on_error: true }),
    });
  }

  getExportContactsCSVUrl(wsId: string) {
    return `${API_BASE_URL}/workspaces/${wsId}/contacts/export`;
  }

  // --- Companies ---
  async listCompanies(wsId: string) {
    const res = await this.request<Company[]>(`/workspaces/${wsId}/companies`);
    return res ?? [];
  }

  async createCompany(wsId: string, data: Partial<Company>) {
    return this.request<Company>(`/workspaces/${wsId}/companies`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // --- Pipelines & Deals ---
  async listPipelines(wsId: string) {
    const res = await this.request<Pipeline[]>(`/workspaces/${wsId}/pipelines`);
    return res ?? [];
  }

  async listDeals(wsId: string, params: { pipeline_id?: string; stage_id?: string; status?: string; contact_id?: string; company_id?: string } = {}) {
    const q = new URLSearchParams();
    if (params.pipeline_id) q.append('pipeline_id', params.pipeline_id);
    if (params.stage_id) q.append('stage_id', params.stage_id);
    if (params.status) q.append('status', params.status);
    if (params.contact_id) q.append('contact_id', params.contact_id);
    if (params.company_id) q.append('company_id', params.company_id);

    const res = await this.request<Deal[]>(`/workspaces/${wsId}/deals?${q.toString()}`);
    return res ?? [];
  }

  async getDeal(wsId: string, dealId: string) {
    return this.request<Deal>(`/workspaces/${wsId}/deals/${dealId}`);
  }

  async createDeal(wsId: string, data: Partial<Deal>) {
    return this.request<Deal>(`/workspaces/${wsId}/deals`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateDeal(wsId: string, dealId: string, data: Partial<Deal>) {
    return this.request<Deal>(`/workspaces/${wsId}/deals/${dealId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async updateDealStage(wsId: string, dealId: string, stageId: string, status?: string, lostReason?: string) {
    return this.request<Deal>(`/workspaces/${wsId}/deals/${dealId}/stage`, {
      method: 'PATCH',
      body: JSON.stringify({ stage_id: stageId, status, lost_reason: lostReason }),
    });
  }

  async updateDealPriority(wsId: string, dealId: string, priority: number) {
    return this.request<Deal>(`/workspaces/${wsId}/deals/${dealId}`, {
      method: 'PATCH',
      body: JSON.stringify({ priority }),
    });
  }

  async deleteDeal(wsId: string, dealId: string) {
    return this.request<void>(`/workspaces/${wsId}/deals/${dealId}`, {
      method: 'DELETE',
    });
  }

  // --- Tasks ---
  async listTasks(wsId: string, params: { due_filter?: string; status?: string; priority?: string; contact_id?: string; deal_id?: string } = {}) {
    const q = new URLSearchParams();
    if (params.due_filter) q.append('due_filter', params.due_filter);
    if (params.status) q.append('status', params.status);
    if (params.priority) q.append('priority', params.priority);
    if (params.contact_id) q.append('contact_id', params.contact_id);
    if (params.deal_id) q.append('deal_id', params.deal_id);

    const res = await this.request<Task[]>(`/workspaces/${wsId}/tasks?${q.toString()}`);
    return res ?? [];
  }

  async createTask(wsId: string, data: Partial<Task>) {
    return this.request<Task>(`/workspaces/${wsId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async toggleCompleteTask(wsId: string, taskId: string) {
    return this.request<Task>(`/workspaces/${wsId}/tasks/${taskId}/toggle`, {
      method: 'PATCH',
    });
  }

  async deleteTask(wsId: string, taskId: string) {
    return this.request<void>(`/workspaces/${wsId}/tasks/${taskId}`, {
      method: 'DELETE',
    });
  }

  // --- Activities ---
  async listRecentActivities(wsId: string, limit = 10) {
    const res = await this.request<Activity[]>(`/workspaces/${wsId}/activities/recent?limit=${limit}`);
    return res ?? [];
  }

  async listContactActivities(wsId: string, contactId: string) {
    const res = await this.request<Activity[]>(`/workspaces/${wsId}/contacts/${contactId}/activities`);
    return res ?? [];
  }

  async listDealActivities(wsId: string, dealId: string) {
    const res = await this.request<Activity[]>(`/workspaces/${wsId}/deals/${dealId}/activities`);
    return res ?? [];
  }

  async createActivity(wsId: string, data: Partial<Activity>) {
    return this.request<Activity>(`/workspaces/${wsId}/activities`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // --- Reports ---
  async getDashboardSummary(wsId: string) {
    return this.request<DashboardSummary>(`/workspaces/${wsId}/reports/summary`);
  }

  async getPipelineFunnel(wsId: string) {
    const res = await this.request<StageFunnelItem[]>(`/workspaces/${wsId}/reports/funnel`);
    return res ?? [];
  }

  async getLeadSources(wsId: string) {
    const res = await this.request<LeadSourceItem[]>(`/workspaces/${wsId}/reports/lead-sources`);
    return res ?? [];
  }

  async getActivitySummary(wsId: string) {
    const res = await this.request<ActivitySummaryItem[]>(`/workspaces/${wsId}/reports/activities`);
    return res ?? [];
  }

  async listAuditLogs(wsId: string, limit = 50) {
    const res = await this.request<AuditEvent[]>(`/workspaces/${wsId}/reports/audit-logs?limit=${limit}`);
    return res ?? [];
  }

  // --- Ecosystem Integrations ---
  async ingestLead(wsId: string, data: Record<string, any>) {
    return this.request<{ contact_id: string; company_id?: string; deal_id?: string; task_id?: string; message: string }>(
      `/workspaces/${wsId}/integrations/lead-intake`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  // --- Omnichannel Live Chat & Inbox ---
  async listConversations(wsId: string, params: { channel?: string; channel_id?: string; department?: string; status?: string; query?: string } = {}) {
    const q = new URLSearchParams();
    if (params.channel) q.append('channel', params.channel);
    if (params.channel_id) q.append('channel_id', params.channel_id);
    if (params.department) q.append('department', params.department);
    if (params.status) q.append('status', params.status);
    if (params.query) q.append('query', params.query);

    const res = await this.request<Conversation[]>(`/workspaces/${wsId}/conversations?${q.toString()}`);
    return res ?? [];
  }

  async getConversation(wsId: string, convId: string) {
    return this.request<Conversation>(`/workspaces/${wsId}/conversations/${convId}`);
  }

  async listMessages(wsId: string, convId: string) {
    const res = await this.request<ChatMessage[]>(`/workspaces/${wsId}/conversations/${convId}/messages`);
    return res ?? [];
  }

  async sendReply(
    wsId: string,
    convId: string,
    content: string,
    channel?: string,
    attachment?: {
      url: string;
      name: string;
      type: string;
      mime_type: string;
      size: number;
    }
  ) {
    return this.request<ChatMessage>(`/workspaces/${wsId}/conversations/${convId}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        content,
        channel,
        attachment_url: attachment?.url,
        attachment_name: attachment?.name,
        attachment_type: attachment?.type,
        mime_type: attachment?.mime_type,
        file_size: attachment?.size,
      }),
    });
  }

  async uploadInboxAttachment(wsId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const token = typeof window !== 'undefined' ? localStorage.getItem('octo_token') : null;
    const res = await fetch(`${API_BASE_URL}/workspaces/${wsId}/inbox/upload`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Gagal mengunggah berkas');
    }

    return data.data as {
      url: string;
      file_name: string;
      file_type: 'image' | 'video' | 'document';
      mime_type: string;
      file_size: number;
    };
  }

  async updateConversationStatus(wsId: string, convId: string, status: string) {
    return this.request<void>(`/workspaces/${wsId}/conversations/${convId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async deleteConversation(wsId: string, convId: string) {
    return this.request<void>(`/workspaces/${wsId}/conversations/${convId}`, {
      method: 'DELETE',
    });
  }

  async clearAllConversations(wsId: string, clearContacts: boolean = true) {
    return this.request<{
      deleted_conversations: number;
      deleted_contacts: number;
      message: string;
    }>(`/workspaces/${wsId}/inbox/clear-all?clear_contacts=${clearContacts}`, {
      method: 'POST',
    });
  }

  async updateConversationAssignment(wsId: string, convId: string, assignedToId?: string) {
    return this.request<void>(`/workspaces/${wsId}/conversations/${convId}/assign`, {
      method: 'PATCH',
      body: JSON.stringify({ assigned_to_id: assignedToId || null }),
    });
  }

  async convertConversationToDeal(wsId: string, convId: string, data: { pipeline_id: string; stage_id: string; title: string; value: number }) {
    return this.request<Deal>(`/workspaces/${wsId}/conversations/${convId}/convert-to-deal`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getInboxMonitoringStats(wsId: string, department?: string) {
    const q = department && department !== 'all' ? `?department=${encodeURIComponent(department)}` : '';
    return this.request<MonitoringStats>(`/workspaces/${wsId}/inbox/monitoring-stats${q}`);
  }

  async takeoverConversation(wsId: string, convId: string, reason: string) {
    return this.request<Conversation>(`/workspaces/${wsId}/conversations/${convId}/takeover`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async toggleConversationBot(wsId: string, convId: string, botActive: boolean, reason?: string) {
    return this.request<void>(`/workspaces/${wsId}/conversations/${convId}/bot`, {
      method: 'PATCH',
      body: JSON.stringify({ bot_active: botActive, reason }),
    });
  }

  async getBotSettings(wsId: string): Promise<WorkspaceBotSettings> {
    return this.request<WorkspaceBotSettings>(`/workspaces/${wsId}/bot/settings`);
  }

  async updateBotSettings(wsId: string, data: Partial<WorkspaceBotSettings>): Promise<WorkspaceBotSettings> {
    return this.request<WorkspaceBotSettings>(`/workspaces/${wsId}/bot/settings`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async escalateConversation(wsId: string, convId: string, data: { escalate_to_id: string; reason: string; priority?: string }) {
    return this.request<Conversation>(`/workspaces/${wsId}/conversations/${convId}/escalate`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async logConversationAccess(wsId: string, convId: string, data: { reason: string; purpose?: string }) {
    return this.request<void>(`/workspaces/${wsId}/conversations/${convId}/log-access`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateConversationPriority(wsId: string, convId: string, priority: string) {
    return this.request<void>(`/workspaces/${wsId}/conversations/${convId}/priority`, {
      method: 'PATCH',
      body: JSON.stringify({ priority }),
    });
  }

  async getInboxAuditTrail(wsId: string, limit: number = 50) {
    const res = await this.request<InboxAuditEvent[]>(`/workspaces/${wsId}/inbox/audit-trail?limit=${limit}`);
    return res ?? [];
  }

  async listNotifications(wsId: string, limit: number = 30) {
    const res = await this.request<NotificationListResponse>(`/workspaces/${wsId}/notifications?limit=${limit}`);
    return res ?? { notifications: [], unread_count: 0 };
  }

  async markNotificationRead(wsId: string, notificationId: string) {
    return this.request<{ status: string }>(`/workspaces/${wsId}/notifications/${notificationId}/read`, {
      method: 'PATCH',
    });
  }

  async markAllNotificationsRead(wsId: string) {
    return this.request<{ status: string }>(`/workspaces/${wsId}/notifications/mark-all-read`, {
      method: 'POST',
    });
  }

  async getWhatsAppConfig(wsId: string, channelId?: string) {
    const q = channelId ? `?channel_id=${channelId}` : '';
    return this.request<{
      channel_id?: string;
      channel_name?: string;
      department?: string;
      business_number: string;
      session_name: string;
      status: string;
      verify_token: string;
      waha_url: string;
      is_live_configured: boolean;
    }>(`/workspaces/${wsId}/inbox/whatsapp-config${q}`);
  }

  async updateWhatsAppConfig(wsId: string, data: { phone_number: string; session_name?: string; channel_id?: string }) {
    return this.request<{
      phone_number: string;
      session_name: string;
      status: string;
    }>(`/workspaces/${wsId}/inbox/whatsapp-config`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async getWhatsAppStatus(wsId: string, channelId?: string, sessionName?: string) {
    const q = new URLSearchParams();
    if (channelId) q.append('channel_id', channelId);
    if (sessionName) q.append('session', sessionName);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return this.request<{
      session: string;
      status: string;
      phone?: string;
      push_name?: string;
      error?: string;
    }>(`/workspaces/${wsId}/inbox/whatsapp-status${qs}`);
  }

  async restartWhatsAppSession(wsId: string, channelId?: string, sessionName?: string) {
    const q = new URLSearchParams();
    if (channelId) q.append('channel_id', channelId);
    if (sessionName) q.append('session', sessionName);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return this.request<void>(`/workspaces/${wsId}/inbox/whatsapp-restart${qs}`, {
      method: 'POST',
    });
  }

  async syncWhatsAppHistory(wsId: string, limit?: number, channelId?: string, sessionName?: string) {
    const q = new URLSearchParams();
    if (channelId) q.append('channel_id', channelId);
    if (sessionName) q.append('session', sessionName);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return this.request<{
      total_chats: number;
      synced_chats: number;
      synced_messages: number;
      message: string;
    }>(`/workspaces/${wsId}/inbox/whatsapp-sync-history${qs}`, {
      method: 'POST',
      body: JSON.stringify({ limit: limit || 50 }),
    });
  }

  // --- Support Tickets (Helpdesk After-Sales) ---
  async listTickets(
    wsId: string,
    params: {
      status?: string;
      priority?: string;
      category?: string;
      department?: string;
      assigned_to_id?: string;
      query?: string;
    } = {}
  ) {
    const q = new URLSearchParams();
    if (params.status) q.append('status', params.status);
    if (params.priority) q.append('priority', params.priority);
    if (params.category) q.append('category', params.category);
    if (params.department) q.append('department', params.department);
    if (params.assigned_to_id) q.append('assigned_to_id', params.assigned_to_id);
    if (params.query) q.append('query', params.query);

    const res = await this.request<Ticket[]>(`/workspaces/${wsId}/tickets?${q.toString()}`);
    return res ?? [];
  }

  async getTicket(wsId: string, ticketId: string) {
    return this.request<Ticket>(`/workspaces/${wsId}/tickets/${ticketId}`);
  }

  async createTicket(wsId: string, data: Partial<Ticket>) {
    return this.request<Ticket>(`/workspaces/${wsId}/tickets`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTicket(wsId: string, ticketId: string, data: Partial<Ticket>) {
    return this.request<Ticket>(`/workspaces/${wsId}/tickets/${ticketId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async addTicketNote(wsId: string, ticketId: string, note: string, activityType = 'note') {
    return this.request<TicketActivity>(`/workspaces/${wsId}/tickets/${ticketId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ note, activity_type: activityType }),
    });
  }

  async getSupportReport(wsId: string) {
    return this.request<SupportReportResponse>(`/workspaces/${wsId}/reports/support`);
  }

  // --- Workspace Channels (Multi-Account / Multi-Session) ---
  async listChannels(wsId: string) {
    const res = await this.request<WorkspaceChannel[]>(`/workspaces/${wsId}/channels`);
    return res ?? [];
  }

  async createChannel(wsId: string, data: Partial<WorkspaceChannel>) {
    return this.request<WorkspaceChannel>(`/workspaces/${wsId}/channels`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteChannel(wsId: string, channelId: string) {
    return this.request<void>(`/workspaces/${wsId}/channels/${channelId}`, {
      method: 'DELETE',
    });
  }

  async getChannelQR(wsId: string, channelId: string) {
    return this.request<{
      status: string;
      session_name: string;
      phone_number?: string;
      qr_image_url?: string;
    }>(`/workspaces/${wsId}/channels/${channelId}/qr`);
  }

  async simulateIncomingMessage(wsId: string, data: { channel: string; sender_name: string; sender_identifier: string; content: string; subject?: string }) {
    return this.request<ChatMessage>(`/workspaces/${wsId}/inbox/webhook/incoming`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // --- Pilar 3: CPQ & Quotation ---
  async createQuotation(wsId: string, data: CreateQuotationRequest) {
    return this.request<Quotation>(`/workspaces/${wsId}/quotations`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listQuotations(wsId: string, dealId?: string) {
    const q = dealId ? `?deal_id=${dealId}` : '';
    const res = await this.request<Quotation[]>(`/workspaces/${wsId}/quotations${q}`);
    return res ?? [];
  }

  async getQuotation(wsId: string, quoId: string) {
    return this.request<Quotation>(`/workspaces/${wsId}/quotations/${quoId}`);
  }

  async updateQuotationStatus(wsId: string, quoId: string, status: QuotationStatus) {
    return this.request<{ message: string }>(`/workspaces/${wsId}/quotations/${quoId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async sendQuotationWhatsApp(wsId: string, quoId: string, channelId?: string) {
    return this.request<{ message: string; text_sent: string }>(`/workspaces/${wsId}/quotations/${quoId}/send-whatsapp`, {
      method: 'POST',
      body: JSON.stringify({ channel_id: channelId }),
    });
  }

  // --- Pilar 2: WhatsApp Broadcast Engine ---
  async createBroadcast(wsId: string, data: CreateBroadcastRequest) {
    return this.request<BroadcastCampaign>(`/workspaces/${wsId}/broadcasts`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listBroadcasts(wsId: string) {
    const res = await this.request<BroadcastCampaign[]>(`/workspaces/${wsId}/broadcasts`);
    return res ?? [];
  }

  async getBroadcast(wsId: string, campId: string) {
    return this.request<{ campaign: BroadcastCampaign; recipients: any[] }>(`/workspaces/${wsId}/broadcasts/${campId}`);
  }

  // --- Pilar 1: Workflow Automations ---
  async listAutomations(wsId: string) {
    const res = await this.request<WorkspaceAutomation[]>(`/workspaces/${wsId}/automations`);
    return res ?? [];
  }

  async updateAutomation(wsId: string, data: { automation_type: string; is_enabled: boolean; config?: any }) {
    return this.request<{ message: string }>(`/workspaces/${wsId}/automations`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // --- Pilar 4: Helpdesk SLA Escalation ---
  async checkTicketSLA(wsId: string) {
    return this.request<{ escalated_count: number; message: string }>(`/workspaces/${wsId}/tickets/check-sla`, {
      method: 'POST',
    });
  }

  // --- Pilar 5: AI Sales & CS Copilot ---
  async summarizeChat(wsId: string, conversationId: string) {
    return this.request<AISummarizeResponse>(`/workspaces/${wsId}/ai/summarize-chat`, {
      method: 'POST',
      body: JSON.stringify({ conversation_id: conversationId }),
    });
  }

  async suggestReplies(wsId: string, conversationId: string) {
    return this.request<AISuggestionResponse>(`/workspaces/${wsId}/ai/suggest-replies`, {
      method: 'POST',
      body: JSON.stringify({ conversation_id: conversationId }),
    });
  }
}

export const api = new ApiClient();
