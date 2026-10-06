/**
 * Avenquis Control Panel Backend - Type Definitions
 * Strict enterprise platform types compatible with Control Panel frontend.
 */

export type PlatformRole = 'PLATFORM_SUPER_ADMIN' | 'PLATFORM_OPERATOR' | 'PLATFORM_AUDITOR';

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: PlatformRole;
  avatarUrl?: string;
  lastLoginAt: string;
  sessionExpiresAt: string;
  mfaEnabled: boolean;
}

export interface MetricItem {
  id: string;
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  timeframe?: string;
  sublabel?: string;
  targetPath?: string;
}

export interface OverviewMetricsResponse {
  totalFirms: number;
  activeFirms: number;
  totalUsers: number;
  pendingAccessRequests: number;
  pendingApprovals: number;
  monthlySubscriptionValue: string;
  overdueCollections: string;
  openSupportIssues: number;
  metrics: MetricItem[];
}

export interface SystemServiceStatus {
  name: string;
  status: 'healthy' | 'warning' | 'critical' | 'degraded';
  latency: string;
  region: string;
}

export interface AccessRequest {
  id: string;
  firmName: string;
  requesterName: string;
  requesterEmail: string;
  requestType: string;
  requestedRole: string;
  assignedRole?: string;
  assignedFirmId?: string;
  jurisdiction: string;
  firmSize: string;
  submittedAt: string;
  status: 'pending' | 'reviewing' | 'approved' | 'rejected' | string;
  riskScore?: 'Low' | 'Medium' | 'High' | string;
  requestNotes?: string;
  internalNote?: string;
  reviewer?: string;
  reviewerId?: string;
  reviewedAt?: string;
  reason?: string;
  rejectionReason?: string;
  note?: string;
}

export interface FirmRecord {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  status: 'active' | 'pending' | 'suspended';
  firmType: string;
  createdAt: string;
  updatedAt?: string;
  subdomain?: string;
  plan?: 'Enterprise' | 'Professional' | 'Standard' | 'Starter' | string;
  subscriptionStatus?: 'active' | 'trialing' | 'past_due' | 'canceled' | 'suspended';
  contactEmail?: string;
  contactName?: string;
  userCount?: number;
  mrr?: number;
  tier?: string;
  storageUsedGb?: number;
  complianceScore?: number;
  suspendedReason?: string;
  auditReason?: string;
  officePhone?: string;
  mobile?: string;
  email?: string;
  website?: string;
}

export interface UserRecord {
  id: string;
  firmId?: string;
  fullName: string;
  designation?: string;
  membershipType?: 'FCA' | 'ACA';
  enrolmentNo?: string;
  email: string;
  role: 'PLATFORM_SUPER_ADMIN' | 'PLATFORM_ADMIN' | 'MANAGING_PARTNER' | 'PARTNER' | 'AUDIT_PARTNER' | 'FIRM_ADMIN' | 'MANAGER' | 'SENIOR' | 'ASSOCIATE' | 'STUDENT' | string;
  status: 'active' | 'inactive' | 'suspended' | 'invited';
  mfaEnabled: boolean;
  lastActive: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ProfessionalMemberRecord {
  id: string;
  fullName: string;
  membershipType: 'FCA' | 'ACA';
  enrolmentNo: string;
  firmId?: string;
  city: string;
  source: string;
  sourceUpdatedAt: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeadRecord {
  id: string;
  contactName: string;
  contactEmail: string;
  firmName: string;
  firmSize: string;
  jurisdiction: string;
  estimatedUsers: number;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'converted' | 'lost';
  source: string;
  createdAt: string;
  notes?: string;
}

export interface PlanRecord {
  id: string;
  name: string;
  code: string;
  pricePerSeatMonthly: number;
  basePlatformFeeMonthly: number;
  features: string[];
  activeFirmsCount: number;
  status: 'active' | 'legacy' | 'draft';
}

export interface CollectionRecord {
  id: string;
  firmId: string;
  firmName: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  dueDate: string;
  status: 'paid' | 'overdue' | 'pending' | 'failed';
  daysOverdue: number;
  billingContact: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  firmName: string;
  contact: string;
  contactEmail: string;
  subject: string;
  priority: 'Urgent' | 'High' | 'Medium' | 'Low';
  status: 'Open' | 'In Progress' | 'Waiting on Firm' | 'Resolved' | 'Closed';
  category: string;
  assignedTo: string;
  createdAt: string;
  updatedAt: string;
  lastUpdated?: string;
  messages: Array<{
    sender: string;
    role: string;
    content: string;
    timestamp: string;
  }>;
  internalNotes: Array<{
    id: string;
    author: string;
    note: string;
    timestamp: string;
  }>;
}

export type NotificationType =
  | 'access_request'
  | 'approval_result'
  | 'provisioning_result'
  | 'support_ticket'
  | 'system_error'
  | 'billing'
  | 'security'
  | 'automation_failure'
  | 'new_lead'
  | 'marketing_followup'
  | 'growth_opportunity'
  | 'email_failure'
  | 'compliance'
  | 'system'
  | string;

export interface NotificationRecord {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
  severity?: 'info' | 'warning' | 'critical';
  metadata?: Record<string, any>;
}

export interface AIAutomationRecord {
  id: string;
  name: string;
  linkedAgent: string;
  trigger: string;
  status: 'Active' | 'Paused';
  lastRun: string;
  nextRun: string;
}

export interface AIRunRecord {
  id: string;
  agent: string;
  action: string;
  status: 'Completed' | 'In Progress' | 'Failed' | 'Waiting Approval';
  started: string;
  completed?: string;
  costUsage: string;
  details: string;
  error?: string;
}

export interface AssistantActionProposal {
  type: 'APPROVE_REQUEST' | 'REJECT_REQUEST' | 'SUSPEND_FIRM' | 'DISABLE_USER' | 'SEND_REPLY' | 'MARK_NOTIFICATIONS_READ';
  title: string;
  description: string;
  targetId: string;
  targetName: string;
  payload?: Record<string, any>;
  status: 'pending_confirmation' | 'confirmed' | 'cancelled' | 'executed';
}

export interface AssistantChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  suggestedAction?: AssistantActionProposal | null;
  sources?: Array<{ label: string; count?: number; path?: string; id?: string }>;
  isAiGenerated?: boolean;
}

export interface AIApproval {
  id: string;
  agentName: string;
  actionType: string;
  firmName: string;
  requestedBy: string;
  confidenceScore: number;
  summary: string;
  riskLevel: 'Low' | 'Medium' | 'High';
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  actorEmail?: string;
  actorType: string;
  actorRole?: PlatformRole;
  action: string;
  target: string;
  targetEntity?: string;
  source: string;
  severity: 'Info' | 'Warning' | 'Critical';
  details: string;
  ipAddress: string;
  cryptographicHash: string;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}
