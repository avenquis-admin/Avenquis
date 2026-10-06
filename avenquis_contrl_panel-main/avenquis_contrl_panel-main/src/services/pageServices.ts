
export interface SystemServiceStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  latency?: string;
  region?: string;
}


import {
  MetricItem,
  AccessRequest,
  FirmRecord,
  PlatformUserRecord,
  LeadRecord,
  PlanRecord,
  SubscriptionSummaryRecord,
  InvoiceRecord,
  CollectionRecord,
  SupportTicket,
  AIAgentItem,
  AIAutonomyLevel,
  AIAutomation,
  AIRun,
  AIApproval,
  AIPolicy,
  AIUsageStats,
  AuditEvent,
  PlatformNotification,
  ReservedSubdomain,
  PaymentGatewayItem,
  ModelGatewayItem,
  FirmTokenUsage,
  SafetyAuditRule,
  GeneralSettings,
  SecuritySettings,
  GatewaySettings,
  NotificationSettings,
  SuperAdminUser,
  PlatformMaintenanceConfig,
  PlatformSettings,
  AssistantChatMessage,
  AssistantActionProposal,
} from '../types';

import { apiClient, getDataMode } from './apiClient';

export interface DataFetchResult<T> {
  data: T;
  total?: number;
  isMock: boolean;
  timestamp: string;
}

const unwrap = (data: any, key: string) => {
  if (Array.isArray(data)) return data;
  if (data?.[key] && Array.isArray(data[key])) return data[key];
  if (data?.data && Array.isArray(data.data)) return data.data;
  return data || [];
};
const unwrapObj = (data: any, key: string) => {
  if (data?.[key] && typeof data[key] === 'object') return data[key];
  if (data?.data && typeof data.data === 'object') return data.data;
  return data || {};
};

function createService<T>(baseEndpoint: string, arrayKey: string, objKey: string) {
  return {
    async getAll(params?: any, signal?: AbortSignal): Promise<DataFetchResult<T[]>> {
      const res = await apiClient.get<any>(baseEndpoint, { params, signal });
      if (res.ok) return { data: unwrap(res.data, arrayKey), total: res.data.total, isMock: false, timestamp: new Date().toISOString() };
      throw new Error(`Failed to fetch ${baseEndpoint}`);
    },
    async getById(id: string, signal?: AbortSignal): Promise<DataFetchResult<T>> {
      const res = await apiClient.get<any>(`${baseEndpoint}/${encodeURIComponent(id)}`, { signal });
      if (res.ok) return { data: unwrapObj(res.data, objKey), isMock: false, timestamp: new Date().toISOString() };
      throw new Error(`Failed to fetch ${baseEndpoint}/${id}`);
    }
  };
}

export const overviewService = {
  async getMetrics(timeRange = '30d', signal?: AbortSignal): Promise<DataFetchResult<MetricItem[]>> {
    const res = await apiClient.get<any>('/overview/metrics', { params: { range: timeRange }, signal });
    return { data: unwrap(res.data, 'metrics'), isMock: false, timestamp: new Date().toISOString() };
  },
  async getSystemStatus(signal?: AbortSignal): Promise<DataFetchResult<any[]>> {
    const res = await apiClient.get<any>('/overview/system-status', { signal });
    return { data: unwrap(res.data, 'services'), isMock: false, timestamp: new Date().toISOString() };
  },
  async getRecentAccessRequests(signal?: AbortSignal): Promise<DataFetchResult<AccessRequest[]>> {
    const res = await apiClient.get<any>('/overview/recent-access-requests', { signal });
    return { data: unwrap(res.data, 'requests'), isMock: false, timestamp: new Date().toISOString() };
  },
  async getRecentFirms(signal?: AbortSignal): Promise<DataFetchResult<FirmRecord[]>> {
    const res = await apiClient.get<any>('/firms', { signal });
    return { data: unwrap(res.data, 'firms'), isMock: false, timestamp: new Date().toISOString() };
  },
  async getCollections(signal?: AbortSignal): Promise<DataFetchResult<CollectionRecord[]>> {
    const res = await apiClient.get<any>('/billing/collections', { signal });
    return { data: unwrap(res.data, 'collections'), isMock: false, timestamp: new Date().toISOString() };
  },
  async getSupportTickets(signal?: AbortSignal): Promise<DataFetchResult<SupportTicket[]>> {
    const res = await apiClient.get<any>('/support/tickets', { signal });
    return { data: unwrap(res.data, 'tickets'), isMock: false, timestamp: new Date().toISOString() };
  },
  async getPendingApprovals(signal?: AbortSignal): Promise<DataFetchResult<AIApproval[]>> {
    const res = await apiClient.get<any>('/ai/approvals', { signal });
    return { data: unwrap(res.data, 'approvals'), isMock: false, timestamp: new Date().toISOString() };
  },
  async getAuditEvents(signal?: AbortSignal): Promise<DataFetchResult<AuditEvent[]>> {
    const res = await apiClient.get<any>('/audit/events', { signal });
    return { data: unwrap(res.data, 'events'), isMock: false, timestamp: new Date().toISOString() };
  },
};

export const accessRequestsService = {
  ...createService<AccessRequest>('/access-requests', 'requests', 'request'),
  async approve(id: string, payload: any) {
    const res = await apiClient.post<any>(`/access-requests/${encodeURIComponent(id)}/approve`, payload);
    return unwrapObj(res.data, 'request');
  },
  async reject(id: string, payload: any) {
    const res = await apiClient.post<any>(`/access-requests/${encodeURIComponent(id)}/reject`, payload);
    return unwrapObj(res.data, 'request');
  }
};

export const firmsService = {
  ...createService<FirmRecord>('/firms', 'firms', 'firm'),
  async activate(id: string, payload: any) {
    const res = await apiClient.post<any>(`/firms/${encodeURIComponent(id)}/activate`, payload);
    return unwrapObj(res.data, 'firm');
  },
  async suspend(id: string, payload: any) {
    const res = await apiClient.post<any>(`/firms/${encodeURIComponent(id)}/suspend`, payload);
    return unwrapObj(res.data, 'firm');
  },
  async updatePlan(id: string, payload: any) {
    const res = await apiClient.patch<any>(`/firms/${encodeURIComponent(id)}/plan`, payload);
    return unwrapObj(res.data, 'firm');
  }
};

export const usersService = {
  ...createService<PlatformUserRecord>('/users', 'users', 'user'),
  async disable(id: string, payload: any) {
    const res = await apiClient.post<any>(`/users/${encodeURIComponent(id)}/disable`, payload);
    return unwrapObj(res.data, 'user');
  },
  async reactivate(id: string, payload: any) {
    const res = await apiClient.post<any>(`/users/${encodeURIComponent(id)}/reactivate`, payload);
    return unwrapObj(res.data, 'user');
  },
  async manageAccess(id: string, payload: any) {
    const res = await apiClient.patch<any>(`/users/${encodeURIComponent(id)}/access`, payload);
    return unwrapObj(res.data, 'user');
  }
};

export const leadsService = {
  ...createService<LeadRecord>('/leads', 'leads', 'lead'),
  async updateStatus(id: string, status: string) {
    const res = await apiClient.patch<any>(`/leads/${encodeURIComponent(id)}/status`, { status });
    return unwrapObj(res.data, 'lead');
  },
  async addNote(id: string, note: string) {
    const res = await apiClient.post<any>(`/leads/${encodeURIComponent(id)}/notes`, { note });
    return unwrapObj(res.data, 'lead');
  },
  async convert(id: string, payload: any) {
    const res = await apiClient.post<any>(`/leads/${encodeURIComponent(id)}/convert`, payload);
    return unwrapObj(res.data, 'lead');
  }
};

export const plansService = {
  ...createService<PlanRecord>('/plans', 'plans', 'plan'),
  async update(id: string, payload: any, reason?: string) {
    const res = await apiClient.patch<any>(`/plans/${encodeURIComponent(id)}`, { ...payload, auditReason: reason });
    return unwrapObj(res.data, 'plan');
  },
  async createVariant(payload: any, reason?: string) { payload.auditReason = reason;
    const res = await apiClient.post<any>(`/plans`, payload);
    return unwrapObj(res.data, 'plan');
  }
};

export const billingService = {
  async getInvoices(params?: any, signal?: AbortSignal): Promise<DataFetchResult<InvoiceRecord[]>> {
    const res = await apiClient.get<any>('/billing/invoices', { params, signal });
    return { data: unwrap(res.data, 'invoices'), isMock: false, timestamp: new Date().toISOString() };
  },
  async getCollections(params?: any, signal?: AbortSignal): Promise<DataFetchResult<CollectionRecord[]>> {
    const res = await apiClient.get<any>('/billing/collections', { params, signal });
    return { data: unwrap(res.data, 'collections'), isMock: false, timestamp: new Date().toISOString() };
  },
  async getGateways(signal?: AbortSignal): Promise<DataFetchResult<PaymentGatewayItem[]>> {
    const res = await apiClient.get<any>('/billing/gateways', { signal });
    return { data: unwrap(res.data, 'gateways'), isMock: false, timestamp: new Date().toISOString() };
  },
  async sendCollectionReminder(id: string, payload: any) {
    await apiClient.post<any>(`/billing/collections/${encodeURIComponent(id)}/remind`, payload);
  },
  async logCollectionNote(id: string, note: string, reason?: string) {
    await apiClient.post<any>(`/billing/collections/${encodeURIComponent(id)}/notes`, { note, auditReason: reason });
  },
  async markCollectionPaid(id: string, payload: any) {
    await apiClient.post<any>(`/billing/collections/${encodeURIComponent(id)}/paid`, payload);
  },
  async escalateCollection(id: string, payload: any) {
    await apiClient.post<any>(`/billing/collections/${encodeURIComponent(id)}/escalate`, payload);
  },
  async testGateway(id: string) {
    await apiClient.post<any>(`/billing/gateways/${encodeURIComponent(id)}/test`);
  }
};

export const supportService = {
  ...createService<SupportTicket>('/support/tickets', 'tickets', 'ticket'),
  async replyTicket(id: string, note: string) {
    await apiClient.post<any>(`/support/tickets/${encodeURIComponent(id)}/reply`, { content: note });
  },
  async addInternalNote(id: string, note: string) {
    await apiClient.post<any>(`/support/tickets/${encodeURIComponent(id)}/notes`, { content: note });
  },
  async updateStatus(id: string, status: string, priority?: string) {
    await apiClient.patch<any>(`/support/tickets/${encodeURIComponent(id)}/status`, { status, priority });
  },
  async assignStaff(id: string, staff: string, reason?: string) {
    await apiClient.post<any>(`/support/tickets/${encodeURIComponent(id)}/assign`, { assignee: staff, auditReason: reason });
  },
  async escalate(id: string, reason?: string) {
    await apiClient.post<any>(`/support/tickets/${encodeURIComponent(id)}/escalate`, { auditReason: reason });
  }
};

export const aiService = {
  async getAgents(signal?: AbortSignal): Promise<DataFetchResult<AIAgentItem[]>> {
    const res = await apiClient.get<any>('/ai/agents', { signal });
    return { data: unwrap(res.data, "agents"), isMock: false, timestamp: new Date().toISOString() };
  },
  async getAutomations(signal?: AbortSignal): Promise<DataFetchResult<AIAutomation[]>> {
    const res = await apiClient.get<any>('/ai/automations', { signal });
    return { data: unwrap(res.data, "automations"), isMock: false, timestamp: new Date().toISOString() };
  },
  async getRuns(signal?: AbortSignal): Promise<DataFetchResult<AIRun[]>> {
    const res = await apiClient.get<any>('/ai/runs', { signal });
    return { data: unwrap(res.data, "runs"), isMock: false, timestamp: new Date().toISOString() };
  },
  async getApprovals(signal?: AbortSignal): Promise<DataFetchResult<AIApproval[]>> {
    const res = await apiClient.get<any>('/ai/approvals', { signal });
    return { data: unwrap(res.data, "approvals"), isMock: false, timestamp: new Date().toISOString() };
  },
  async getPolicies(signal?: AbortSignal): Promise<DataFetchResult<AIPolicy[]>> {
    const res = await apiClient.get<any>('/ai/policies', { signal });
    return { data: unwrap(res.data, "policies"), isMock: false, timestamp: new Date().toISOString() };
  },
  async getUsage(signal?: AbortSignal): Promise<DataFetchResult<AIUsageStats>> {
    const res = await apiClient.get<any>('/ai/usage', { signal });
    return { data: res.data as AIUsageStats, isMock: false, timestamp: new Date().toISOString() };
  },
  async getModels(signal?: AbortSignal): Promise<DataFetchResult<ModelGatewayItem[]>> {
    const res = await apiClient.get<any>('/ai/models', { signal });
    return { data: unwrap(res.data, "models"), isMock: false, timestamp: new Date().toISOString() };
  },
  async getTokenUsage(signal?: AbortSignal): Promise<DataFetchResult<FirmTokenUsage[]>> {
    const res = await apiClient.get<any>('/ai/token-usage', { signal });
    return { data: unwrap(res.data, "usage"), isMock: false, timestamp: new Date().toISOString() };
  },
  async getSafetyRules(signal?: AbortSignal): Promise<DataFetchResult<SafetyAuditRule[]>> {
    const res = await apiClient.get<any>('/ai/safety-rules', { signal });
    return { data: unwrap(res.data, "rules"), isMock: false, timestamp: new Date().toISOString() };
  },
  async toggleAgent(id: string, status: string, reason?: string) {
    await apiClient.patch<any>(`/ai/agents/${encodeURIComponent(id)}/status`, { status, auditReason: reason });
  },
  async updateAutonomy(id: string, payload: any) {
    await apiClient.patch<any>(`/ai/agents/${encodeURIComponent(id)}/autonomy`, payload);
  },
  async updateAgentAutonomy(id: string, level: string, reason?: string) {
    await apiClient.patch<any>(`/ai/agents/${encodeURIComponent(id)}/autonomy-level`, { level, auditReason: reason });
  },
  async decideApproval(id: string, status: string, notes?: string, reason?: string) {
    await apiClient.post<any>(`/ai/approvals/${encodeURIComponent(id)}/decide`, { status, notes, auditReason: reason });
  },
  async toggleAutomation(id: string, status: string, reason?: string) {
    await apiClient.patch<any>(`/ai/automations/${encodeURIComponent(id)}/status`, { status, auditReason: reason });
  }
};

export const auditService = {
  ...createService<AuditEvent>('/audit/events', 'events', 'event'),
  async exportAuditLog(params?: any, signal?: AbortSignal): Promise<Blob> {
    const res = await apiClient.request<Blob | string | unknown>('/audit/events/export', {
      params, signal, headers: { Accept: 'application/octet-stream, application/json, application/gzip, text/csv' }
    });
    if (res.ok && res.data) {
      if (res.data instanceof Blob) return res.data;
      if (typeof res.data === 'string') return new Blob([res.data], { type: 'application/json' });
      return new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
    }
    return new Blob(['[]'], { type: 'application/json' });
  }
};

export const settingsService = {
  async getPlatformSettings(signal?: AbortSignal): Promise<DataFetchResult<PlatformSettings>> {
    const res = await apiClient.get<any>('/settings/platform', { signal });
    return { data: unwrapObj(res.data, 'settings') as PlatformSettings, isMock: false, timestamp: new Date().toISOString() };
  },
  async getSuperAdmins(signal?: AbortSignal): Promise<DataFetchResult<SuperAdminUser[]>> {
    const res = await apiClient.get<any>('/settings/super-admins', { signal });
    return { data: unwrap(res.data, 'admins'), isMock: false, timestamp: new Date().toISOString() };
  },
  async getMaintenanceMode(signal?: AbortSignal): Promise<DataFetchResult<PlatformMaintenanceConfig>> {
    const res = await apiClient.get<any>('/settings/maintenance', { signal });
    return { data: unwrapObj(res.data, 'config') as PlatformMaintenanceConfig, isMock: false, timestamp: new Date().toISOString() };
  },
  async updateGeneralSettings(payload: any, reason?: string) {
    await apiClient.patch<any>('/settings/platform/general', { ...payload, auditReason: reason });
  },
  async updateSecuritySettings(payload: any, reason?: string) {
    await apiClient.patch<any>('/settings/platform/security', { ...payload, auditReason: reason });
  },
  async updateGatewaySettings(payload: any, reason?: string) {
    await apiClient.patch<any>('/settings/platform/gateways', { ...payload, auditReason: reason });
  },
  async updateNotificationSettings(payload: any, reason?: string) {
    await apiClient.patch<any>('/settings/platform/notifications', { ...payload, auditReason: reason });
  },
  async inviteSuperAdmin(payload: any, reason?: string) { payload.auditReason = reason;
    await apiClient.post<any>('/settings/super-admins/invite', payload);
  },
  async revokeSuperAdmin(id: string, reason?: string) {
    await (apiClient as any).delete(`/settings/super-admins/${encodeURIComponent(id)}`, { data: { auditReason: reason } });
  },
  async setMaintenanceMode(payload: any, reason?: string, sig?: string) { payload.auditReason = reason; payload.signature = sig;
    await apiClient.post<any>('/settings/maintenance', payload);
  }
};

export const notificationsService = {
  async getUnreadCount(): Promise<number> {
    const res = await apiClient.get<any>('/notifications/unread-count');
    return res.data?.count || 0;
  },
  async getAll(signal?: AbortSignal): Promise<DataFetchResult<PlatformNotification[]>> {
    const res = await apiClient.get<any>('/notifications', { signal });
    return { data: unwrap(res.data, "notifications"), isMock: false, timestamp: new Date().toISOString() };
  },
  async markAsRead(id: string) {
    await apiClient.patch<any>(`/notifications/${encodeURIComponent(id)}/read`);
  },
  async markAllAsRead() {
    await apiClient.post<any>('/notifications/mark-all-read');
  }
};

export const assistantService = {
  async getChatHistory(signal?: AbortSignal): Promise<AssistantChatMessage[]> {
    const res = await apiClient.get<any>('/assistant/chat', { signal });
    return unwrap(res.data, 'messages');
  },
  async sendMessage(payload: any): Promise<any> {
    const res = await apiClient.post<any>("/assistant/chat", payload);
    return res.data;
  },
  async executeAction(payload: any) { return apiClient.post("/assistant/execute", payload); },
  async applyProposal(proposalId: string) {
    await apiClient.post<any>(`/assistant/proposals/${encodeURIComponent(proposalId)}/apply`);
  },
  async discardProposal(proposalId: string) {
    await apiClient.post<any>(`/assistant/proposals/${encodeURIComponent(proposalId)}/discard`);
  }
};
