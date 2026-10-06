/**
 * Avenquis Control Panel Backend - In-Memory State Store & Seed Data
 * 
 * Owns backend development reference state for Bangladesh Chartered Accountancy (ICAB).
 * All mutations update this in-memory development state deterministically.
 */

import {
  AccessRequest,
  FirmRecord,
  UserRecord,
  LeadRecord,
  PlanRecord,
  CollectionRecord,
  SupportTicket,
  NotificationRecord,
  NotificationType,
  AIAutomationRecord,
  AIRunRecord,
  AIApproval,
  AuditEvent,
  SystemServiceStatus,
  OverviewMetricsResponse,
  MetricItem,
  ProfessionalMemberRecord,
} from '../types/index.js';
import {
  SEED_FIRMS,
  SEED_USERS,
  SEED_PROFESSIONAL_MEMBERS,
} from './seed.js';

class DataStore {
  public accessRequests: AccessRequest[] = [
    {
      id: 'req-001',
      firmName: 'K. M. Alam & Co. Chartered Accountants',
      requesterName: 'Demo CA Applicant',
      requesterEmail: 'applicant.alam@example.test',
      requestType: 'New Firm Accreditation',
      requestedRole: 'MANAGING_PARTNER',
      jurisdiction: 'Bangladesh (ICAB Reg #042)',
      firmSize: '15-30',
      submittedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      status: 'pending',
      riskScore: 'Low',
      requestNotes: 'Enterprise CA firm accreditation request for statutory audit intelligence and BFRS compliance checklists.',
    },
    {
      id: 'req-002',
      firmName: 'A. Hoque & Co. Chartered Accountants',
      requesterName: 'Demo Partner Expansion',
      requesterEmail: 'expansion@example.test',
      requestType: 'Firm Expansion',
      requestedRole: 'AUDIT_PARTNER',
      jurisdiction: 'Bangladesh (ICAB Reg #018)',
      firmSize: '30-50',
      submittedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
      status: 'pending',
      riskScore: 'Low',
      requestNotes: 'Expanding audit practice team for Dhaka banking statutory audit season.',
    },
    {
      id: 'req-003',
      firmName: 'Chattogram Audit Associates',
      requesterName: 'Demo Chattogram Partner',
      requesterEmail: 'ctg.partner@example.test',
      requestType: 'New Firm Accreditation',
      requestedRole: 'PARTNER',
      jurisdiction: 'Bangladesh (ICAB Reg #055)',
      firmSize: '5-15',
      submittedAt: new Date(Date.now() - 3600000 * 18).toISOString(),
      status: 'pending',
      riskScore: 'Medium',
      requestNotes: 'Branch office statutory audit and assurance workflow integration.',
    },
    {
      id: 'req-004',
      firmName: 'S. Javed & Co. Chartered Accountants',
      requesterName: 'Demo Practice Lead',
      requesterEmail: 'javed.lead@example.test',
      requestType: 'New Firm Accreditation',
      requestedRole: 'MANAGING_PARTNER',
      jurisdiction: 'Bangladesh (ICAB Reg #089)',
      firmSize: '1-5',
      submittedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      status: 'approved',
      riskScore: 'Low',
      requestNotes: 'Accreditation application approved following ICAB member Certificate of Practice check.',
    },
  ];

  public firms: FirmRecord[] = [...SEED_FIRMS];

  public users: UserRecord[] = [...SEED_USERS];

  public professionalMembers: ProfessionalMemberRecord[] = [...SEED_PROFESSIONAL_MEMBERS];

  public leads: LeadRecord[] = [
    {
      id: 'lead-001',
      contactName: 'Ashit Baran Saha, FCA',
      contactEmail: 'absaha@example.test',
      firmName: 'A. B. Saha & Co. Chartered Accountants',
      firmSize: '25 Practitioners',
      jurisdiction: 'Bangladesh (ICAB)',
      estimatedUsers: 20,
      status: 'qualified',
      source: 'Direct Partner Outreach',
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      notes: 'Interested in automated financial statement disclosure checklist validation.',
    },
    {
      id: 'lead-002',
      contactName: 'Akhtar Sohel Kasem, FCA',
      contactEmail: 'askasem@example.test',
      firmName: 'A. Qasem & Co. Chartered Accountants',
      firmSize: '65 Practitioners',
      jurisdiction: 'Bangladesh (ICAB)',
      estimatedUsers: 50,
      status: 'proposal',
      source: 'ICAB Annual Conference 2026',
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      notes: 'Requested proposal for 50 Enterprise seats with sovereign in-country audit models.',
    },
  ];

  public plans: PlanRecord[] = [
    {
      id: 'plan-ent',
      name: 'Institutional Enterprise Audit',
      code: 'enterprise',
      pricePerSeatMonthly: 5200,
      basePlatformFeeMonthly: 75000,
      features: [
        'Unlimited Audit Intelligence Pipelines',
        'Custom SSO & Identity Federation (SAML 2.0 / OIDC)',
        'Sovereign In-Country Model Residency',
        'Dedicated SLA < 15min SRE Support',
        'Multi-tenant Subdomain & Custom TLS',
      ],
      activeFirmsCount: 3,
      status: 'active',
    },
    {
      id: 'plan-pro',
      name: 'Professional CA Firm',
      code: 'professional',
      pricePerSeatMonthly: 3800,
      basePlatformFeeMonthly: 35000,
      features: [
        'Up to 100 Active Audit Engagements',
        'Automated Working Paper Ingestion',
        'Standard Role-Based Access Control',
        'Standard Business Hours Support',
      ],
      activeFirmsCount: 4,
      status: 'active',
    },
    {
      id: 'plan-std',
      name: 'Starter CA Practice',
      code: 'starter',
      pricePerSeatMonthly: 2500,
      basePlatformFeeMonthly: 15000,
      features: [
        'Statutory Working Papers',
        'ICAB Compliance Standards',
        '5GB Vault per Seat',
        'Single Office',
      ],
      activeFirmsCount: 3,
      status: 'active',
    },
  ];

  public collections: CollectionRecord[] = [
    {
      id: 'col-001',
      firmId: 'firm-006',
      firmName: 'S. F. Ahmed & Co. Chartered Accountants',
      invoiceNumber: 'INV-2026-0038',
      amount: 45000,
      currency: 'BDT',
      dueDate: '2026-08-15',
      status: 'overdue',
      daysOverdue: 21,
      billingContact: 'billing@example.test',
    },
    {
      id: 'col-002',
      firmId: 'firm-002',
      firmName: 'A. Hoque & Co. Chartered Accountants',
      invoiceNumber: 'INV-2026-0042',
      amount: 95000,
      currency: 'BDT',
      dueDate: '2026-09-20',
      status: 'pending',
      daysOverdue: 0,
      billingContact: 'accounts@example.test',
    },
    {
      id: 'col-003',
      firmId: 'firm-001',
      firmName: 'A. B. Saha & Co. Chartered Accountants',
      invoiceNumber: 'INV-2026-0044',
      amount: 145000,
      currency: 'BDT',
      dueDate: '2026-09-25',
      status: 'paid',
      daysOverdue: 0,
      billingContact: 'finance@example.test',
    },
  ];

  public supportTickets: SupportTicket[] = [
    {
      id: 'tkt-001',
      ticketNumber: 'TKT-8841',
      firmName: 'A. Qasem & Co. Chartered Accountants',
      contact: 'Demo Firm Administrator',
      contactEmail: 'firm.admin@example.test',
      subject: 'SSO SAML 2.0 configuration for audit team active directory',
      priority: 'High',
      status: 'In Progress',
      category: 'Authentication & SSO',
      assignedTo: 'Identity Engineering',
      createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      updatedAt: new Date(Date.now() - 1800000).toISOString(),
      messages: [
        {
          sender: 'Demo Firm Administrator',
          role: 'Firm Administrator',
          content: 'Active Directory certificate renewal scheduled for tomorrow. Please verify metadata exchange endpoint.',
          timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
        },
      ],
      internalNotes: [
        {
          id: 'note-1',
          author: 'Identity Engineering',
          note: 'Metadata exchanged and cert validation completed.',
          timestamp: new Date(Date.now() - 1800000).toISOString(),
        },
      ],
    },
    {
      id: 'tkt-002',
      ticketNumber: 'TKT-8839',
      firmName: 'A. Hoque & Co. Chartered Accountants',
      contact: 'Demo Audit Partner',
      contactEmail: 'audit.partner@example.test',
      subject: 'IFRS 16 lease schedule calculation verification discrepancy',
      priority: 'High',
      status: 'Open',
      category: 'Accounting Standards',
      assignedTo: 'Audit Tech Engineering',
      createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      messages: [
        {
          sender: 'Demo Audit Partner',
          role: 'Audit Partner',
          content: 'Lease liability amortization schedule rounding error identified in banking client audit working papers.',
          timestamp: new Date(Date.now() - 3600000 * 18).toISOString(),
        },
      ],
      internalNotes: [],
    },
    {
      id: 'tkt-003',
      ticketNumber: 'TKT-8827',
      firmName: 'A. B. Saha & Co. Chartered Accountants',
      contact: 'Demo Managing Partner',
      contactEmail: 'managing.partner@example.test',
      subject: 'Custom audit sampling template validation for banking client',
      priority: 'Low',
      status: 'Resolved',
      category: 'Sampling & Workpapers',
      assignedTo: 'Audit AI Specialists',
      createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
      messages: [],
      internalNotes: [],
    },
  ];

  public notifications: NotificationRecord[] = [
    {
      id: 'notif-001',
      title: 'New Access Request: K. M. Alam & Co.',
      message: 'K. M. Alam & Co. Chartered Accountants submitted an institutional CA firm accreditation request.',
      type: 'access_request',
      read: false,
      severity: 'info',
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      actionUrl: '/access-requests',
    },
    {
      id: 'notif-002',
      title: 'Billing Warning: Invoice Overdue',
      message: 'S. F. Ahmed & Co. Chartered Accountants has invoice #INV-2026-004 (৳45,000) 21 days past due.',
      type: 'billing',
      read: false,
      severity: 'warning',
      createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      actionUrl: '/billing',
    },
    {
      id: 'notif-003',
      title: 'Critical System Error: OCR Service Degraded',
      message: 'Document OCR parsing queue latency exceeded 4500ms on secondary edge node.',
      type: 'system_error',
      read: false,
      severity: 'critical',
      createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
      actionUrl: '/overview',
    },
    {
      id: 'notif-004',
      title: 'Support Ticket: Urgent SAML SSO Issue',
      message: 'Ticket #TCK-2024-001 escalated by S. F. Ahmed & Co. regarding Azure AD federation certificate.',
      type: 'support_ticket',
      read: false,
      severity: 'warning',
      createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
      actionUrl: '/support',
    },
    {
      id: 'notif-005',
      title: 'AI Automation Failure: Run #run-902',
      message: 'Firm Tenancy License & Annual Renewal Verification failed due to sovereign registry endpoint timeout.',
      type: 'automation_failure',
      read: false,
      severity: 'critical',
      createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      actionUrl: '/ai',
    },
    {
      id: 'notif-006',
      title: 'Security Alert: Failed Super Admin Logins',
      message: 'Multiple consecutive failed authentication attempts recorded against admin interface from 103.24.12.98.',
      type: 'security',
      read: true,
      severity: 'critical',
      createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
      actionUrl: '/audit',
    },
    {
      id: 'notif-007',
      title: 'Approval Result: M. M. Rahman & Co. Accredited',
      message: 'Institutional accreditation approved by Super Admin. Welcome notice dispatched.',
      type: 'approval_result',
      read: true,
      severity: 'info',
      createdAt: new Date(Date.now() - 86400000 * 1.5).toISOString(),
      actionUrl: '/firms',
    },
    {
      id: 'notif-008',
      title: 'Account Provisioning Result: S. F. Ahmed & Co.',
      message: 'Tenant partition schema created and encrypted sovereign vault initialized successfully.',
      type: 'provisioning_result',
      read: true,
      severity: 'info',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      actionUrl: '/firms',
    },
    {
      id: 'notif-009',
      title: 'New Lead / Demo: Rahman Mostafa Alam & Co.',
      message: 'Senior Audit Partner requested a custom demonstration of Statutory Assurance Copilot.',
      type: 'new_lead',
      read: true,
      severity: 'info',
      createdAt: new Date(Date.now() - 86400000 * 2.5).toISOString(),
      actionUrl: '/leads',
    },
    {
      id: 'notif-010',
      title: 'Marketing Follow-Up: 4 Trial Firms Ready',
      message: 'Post-demo conversion nurture sequence triggered for 4 tier-1 trial practices in Dhaka.',
      type: 'marketing_followup',
      read: true,
      severity: 'info',
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      actionUrl: '/leads',
    },
    {
      id: 'notif-011',
      title: 'Growth Opportunity: 3 Firms Nearing Capacity',
      message: 'A. Qasem & Co. and 2 other firms have reached 88% active seat utilization on Professional plan.',
      type: 'growth_opportunity',
      read: true,
      severity: 'info',
      createdAt: new Date(Date.now() - 86400000 * 3.5).toISOString(),
      actionUrl: '/plans',
    },
    {
      id: 'notif-012',
      title: 'Email Delivery Failure: Billing Receipt Bounce',
      message: 'Automated receipt dispatch to billing@sgco.internal bounced with 550 Mailbox Unavailable.',
      type: 'email_failure',
      read: true,
      severity: 'warning',
      createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      actionUrl: '/billing',
    },
  ];

  public aiAutomations: AIAutomationRecord[] = [
    {
      id: 'auto-001',
      name: 'Daily ICAB Regulatory Bulletin Sync',
      linkedAgent: 'ICAB Regulatory Compliance & Standards Guard',
      trigger: 'Daily at 06:00 UTC',
      status: 'Active',
      lastRun: '1h ago (Success)',
      nextRun: 'in 23 hours',
    },
    {
      id: 'auto-002',
      name: 'VAT & Tax Withholding Materiality Sentinel',
      linkedAgent: 'National Tax Assessment & Materiality Engine',
      trigger: 'Every 6 hours',
      status: 'Active',
      lastRun: '3h ago (Success)',
      nextRun: 'in 3 hours',
    },
    {
      id: 'auto-003',
      name: 'Firm Tenancy License & Annual Renewal Verification',
      linkedAgent: 'Platform Tenant Isolation Guard',
      trigger: 'Daily at 00:00 UTC',
      status: 'Active',
      lastRun: 'Failed (Registry Timeout)',
      nextRun: 'Scheduled retry in 30m',
    },
  ];

  public aiRuns: AIRunRecord[] = [
    {
      id: 'run-902',
      agent: 'Platform Tenant Isolation Guard',
      action: 'Firm Tenancy License & Annual Renewal Verification',
      status: 'Failed',
      started: new Date(Date.now() - 3600000 * 2).toISOString(),
      completed: new Date(Date.now() - 3600000 * 2 + 15000).toISOString(),
      costUsage: '৳0.12',
      details: 'Sovereign institutional registry endpoint timed out (504 Gateway Timeout). Automatic retry scheduled.',
      error: '504 Gateway Timeout: Registry service unreachable',
    },
    {
      id: 'run-901',
      agent: 'Statutory Audit Opinion Risk Check',
      action: 'Going Concern Assessment Modification for Listed Bank',
      status: 'Completed',
      started: new Date(Date.now() - 3600000 * 4).toISOString(),
      completed: new Date(Date.now() - 3600000 * 4 + 42000).toISOString(),
      costUsage: '৳1.45',
      details: 'Completed with confidence score 94.0%. Routed to human-in-the-loop approval gate.',
    },
  ];

  public aiApprovals: AIApproval[] = [
    {
      id: 'appr-001',
      agentName: 'Statutory Audit Opinion Risk Check',
      actionType: 'Going Concern Assessment Modification for Listed Bank',
      firmName: 'A. B. Saha & Co. Chartered Accountants',
      requestedBy: 'Demo Audit Partner',
      confidenceScore: 94.0,
      summary: 'Going concern evaluation prepared for banking client following capital adequacy stress test.',
      riskLevel: 'High',
      status: 'Pending',
      createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
    },
    {
      id: 'appr-002',
      agentName: 'Financial Statement Materiality Threshold',
      actionType: 'Consolidated Revenue Materiality Adjustment (5% of PBT)',
      firmName: 'A. Qasem & Co. Chartered Accountants',
      requestedBy: 'Demo Managing Partner',
      confidenceScore: 96.2,
      summary: 'Materiality threshold evaluation for statutory assurance engagement.',
      riskLevel: 'High',
      status: 'Pending',
      createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    },
  ];

  public auditEvents: AuditEvent[] = [
    {
      id: 'evt-9041',
      timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      actor: 'admin@avenquis.internal',
      actorEmail: 'admin@avenquis.internal',
      actorType: 'Platform Super Admin',
      actorRole: 'PLATFORM_SUPER_ADMIN',
      action: 'FIRM_TENANCY_STATUS_CHANGE',
      target: 'S. Gupta & Co. Chartered Accountants',
      targetEntity: 'sgupta.avenquis.com',
      source: 'Console',
      severity: 'Warning',
      details: 'Suspension status applied pending annual ICAB firm practice renewal review.',
      ipAddress: '10.0.4.18',
      cryptographicHash: 'sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
    },
    {
      id: 'evt-9040',
      timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      actor: 'System AI Autonomous Guard',
      actorType: 'System AI',
      action: 'AI_SAFETY_POLICY_TRIGGERED',
      target: 'Agent: Statutory Audit Opinion Risk Check',
      targetEntity: 'AIPolicy: POL-AUDIT-L3',
      source: 'Scheduled Task',
      severity: 'Info',
      details: 'Flagged materiality assessment with confidence score 94.0% for mandatory partner sign-off.',
      ipAddress: '127.0.0.1',
      cryptographicHash: 'sha256:cb8379ac2098aa165029e3938a51da0bcecfc008fd6795f401178647f96c5b34',
    },
    {
      id: 'evt-9039',
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      actor: 'Platform Super Admin',
      actorEmail: 'admin@avenquis.internal',
      actorType: 'Platform Super Admin',
      actorRole: 'PLATFORM_SUPER_ADMIN',
      action: 'ROLE_ASSIGNMENT',
      target: 'Demo Firm Administrator (A. Qasem & Co.)',
      targetEntity: 'Role: FIRM_ADMIN',
      source: 'Console',
      severity: 'Info',
      details: 'Granted FIRM_ADMIN role following accreditation verification.',
      ipAddress: '10.0.4.22',
      cryptographicHash: 'sha256:3b6a27bcceb6a42d62a3a8d02a6f0d73653215771de243a63ac048a18b59da29',
    },
  ];

  public systemServices: SystemServiceStatus[] = [
    {
      name: 'Core API Gateway',
      status: 'healthy',
      latency: '24ms',
      region: 'ap-south-1 (Mumbai / Dhaka Edge)',
    },
    {
      name: 'PostgreSQL Database Tier',
      status: 'healthy',
      latency: '12ms',
      region: 'ap-south-1 (Primary HA Cluster)',
    },
    {
      name: 'Neon PostgreSQL & Auth Tier',
      status: 'healthy',
      latency: '18ms',
      region: 'ap-south-1 (Global Edge)',
    },
    {
      name: 'AI Sovereign Reasoning Engine',
      status: 'healthy',
      latency: '110ms',
      region: 'ap-south-1 (Air-Gapped Sovereign Node)',
    },
    {
      name: 'Document OCR & Ingestion Pipeline',
      status: 'healthy',
      latency: '45ms',
      region: 'ap-south-1 (Batch Processing Worker)',
    },
    {
      name: 'Audit Cryptographic Stream',
      status: 'healthy',
      latency: '15ms',
      region: 'ap-south-1 (Immutable Ledger)',
    },
  ];

  // Helper Methods

  public getMetrics(range: string = '30d'): OverviewMetricsResponse {
    const totalFirms = this.firms.length;
    const activeFirms = this.firms.filter((f) => f.status === 'active').length;
    const totalUsers = this.firms.reduce((acc, f) => acc + (f.userCount || 0), 0);
    const pendingAccessRequests = this.accessRequests.filter((r) => r.status === 'pending').length;
    const pendingApprovals = this.aiApprovals.filter((a) => a.status === 'Pending').length;
    
    const monthlyTotalBdt = this.firms
      .filter((f) => f.status === 'active')
      .reduce((acc, f) => acc + (f.mrr || 0), 0);
    const monthlySubscriptionValue = `৳${(monthlyTotalBdt / 100000).toFixed(1)} Lakhs`;

    const overdueTotal = this.collections
      .filter((c) => c.status === 'overdue')
      .reduce((acc, c) => acc + c.amount, 0);
    const overdueCollections = `৳${(overdueTotal / 1000).toFixed(0)}k`;

    const openSupportIssues = this.supportTickets.filter(
      (t) => t.status === 'Open' || t.status === 'In Progress'
    ).length;

    const metrics: MetricItem[] = [
      {
        id: 'm1',
        label: 'Total Firms',
        value: totalFirms,
        change: range === '24h' ? '+1' : range === '7d' ? '+2' : '+6.4%',
        trend: 'up',
        timeframe: `vs last ${range}`,
        sublabel: `${activeFirms} active`,
        targetPath: '/firms',
      },
      {
        id: 'm2',
        label: 'Active Firms',
        value: activeFirms,
        change: '+4.8%',
        trend: 'up',
        timeframe: `vs last ${range}`,
        sublabel: `${((activeFirms / totalFirms) * 100).toFixed(0)}% retention`,
        targetPath: '/firms',
      },
      {
        id: 'm3',
        label: 'Total Users',
        value: totalUsers,
        change: '+11.2%',
        trend: 'up',
        timeframe: `vs last ${range}`,
        sublabel: 'Active practitioners',
        targetPath: '/users',
      },
      {
        id: 'm4',
        label: 'Pending Access Requests',
        value: pendingAccessRequests,
        change: pendingAccessRequests > 0 ? `+${pendingAccessRequests}` : '0',
        trend: pendingAccessRequests > 3 ? 'down' : 'neutral',
        timeframe: 'Requires audit review',
        sublabel: 'Accreditation queue',
        targetPath: '/access-requests',
      },
      {
        id: 'm5',
        label: 'Pending Approvals',
        value: pendingApprovals,
        change: '-1',
        trend: 'neutral',
        timeframe: 'AI Governance',
        sublabel: 'Awaiting human sign-off',
        targetPath: '/ai/approvals',
      },
      {
        id: 'm6',
        label: 'Monthly Subscription Value',
        value: monthlySubscriptionValue,
        change: '+10.5%',
        trend: 'up',
        timeframe: `vs last ${range}`,
        sublabel: 'Recurring platform revenue',
        targetPath: '/billing',
      },
      {
        id: 'm7',
        label: 'Overdue Collections',
        value: overdueCollections,
        change: '-2.1%',
        trend: 'down',
        timeframe: 'Collections queue',
        sublabel: `${this.collections.filter((c) => c.status === 'overdue').length} firm past due`,
        targetPath: '/billing',
      },
      {
        id: 'm8',
        label: 'Open Support Issues',
        value: openSupportIssues,
        change: '-20%',
        trend: 'down',
        timeframe: 'SLA < 15 min',
        sublabel: 'SRE priority queue',
        targetPath: '/support',
      },
    ];

    return {
      totalFirms,
      activeFirms,
      totalUsers,
      pendingAccessRequests,
      pendingApprovals,
      monthlySubscriptionValue,
      overdueCollections,
      openSupportIssues,
      metrics,
    };
  }

  public approveAccessRequest(id: string, reviewer: string = 'Platform Super Admin'): AccessRequest | null {
    const req = this.accessRequests.find((r) => r.id === id);
    if (!req) return null;
    req.status = 'approved';
    req.reviewer = reviewer;
    req.reviewedAt = new Date().toISOString();

    if (req.requestType.includes('Accreditation')) {
      const existing = this.firms.find((f) => f.name.toLowerCase() === req.firmName.toLowerCase());
      if (!existing) {
        const slug = req.firmName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12);
        this.firms.unshift({
          id: `firm-${Date.now()}`,
          name: req.firmName,
          address: 'Dhaka, Bangladesh',
          city: 'Dhaka',
          country: 'Bangladesh',
          firmType: 'Chartered Accountants',
          subdomain: slug,
          status: 'active',
          plan: 'Professional',
          subscriptionStatus: 'trialing',
          contactEmail: req.requesterEmail,
          contactName: req.requesterName,
          userCount: 5,
          createdAt: new Date().toISOString(),
          mrr: 75000,
          tier: 'Accredited CA Practice',
          storageUsedGb: 10.0,
          complianceScore: 98.0,
        });
      }
    }

    this.auditEvents.unshift({
      id: `evt-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: reviewer,
      actorType: 'Platform Super Admin',
      actorRole: 'PLATFORM_SUPER_ADMIN',
      action: 'ACCESS_REQUEST_APPROVED',
      target: req.firmName,
      targetEntity: `Request: ${req.id}`,
      source: 'Console',
      severity: 'Info',
      details: `Approved ${req.requestType} for ${req.requesterName} (${req.firmName})`,
      ipAddress: '127.0.0.1',
      cryptographicHash: `sha256:dev_${Date.now().toString(16)}`,
    });

    return req;
  }

  public rejectAccessRequest(id: string, reason: string = 'Incomplete documentation', reviewer: string = 'Platform Super Admin'): AccessRequest | null {
    const req = this.accessRequests.find((r) => r.id === id);
    if (!req) return null;
    req.status = 'rejected';
    req.rejectionReason = reason;
    req.reviewer = reviewer;
    req.reviewedAt = new Date().toISOString();

    this.auditEvents.unshift({
      id: `evt-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: reviewer,
      actorType: 'Platform Super Admin',
      actorRole: 'PLATFORM_SUPER_ADMIN',
      action: 'ACCESS_REQUEST_REJECTED',
      target: req.firmName,
      targetEntity: `Request: ${req.id}`,
      source: 'Console',
      severity: 'Warning',
      details: `Rejected access request: ${reason}`,
      ipAddress: '127.0.0.1',
      cryptographicHash: `sha256:dev_${Date.now().toString(16)}`,
    });

    return req;
  }

  public activateFirm(id: string, reason?: string): FirmRecord | null {
    const firm = this.firms.find((f) => f.id === id);
    if (!firm) return null;
    firm.status = 'active';
    firm.subscriptionStatus = 'active';
    if (reason) firm.auditReason = reason;

    this.auditEvents.unshift({
      id: `evt-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: 'Platform Super Admin',
      actorType: 'Platform Super Admin',
      actorRole: 'PLATFORM_SUPER_ADMIN',
      action: 'FIRM_STATUS_ACTIVE',
      target: firm.name,
      targetEntity: firm.subdomain,
      source: 'Console',
      severity: 'Info',
      details: reason || 'Firm activated by administrator',
      ipAddress: '127.0.0.1',
      cryptographicHash: `sha256:dev_${Date.now().toString(16)}`,
    });

    return firm;
  }

  public suspendFirm(id: string, reason?: string): FirmRecord | null {
    const firm = this.firms.find((f) => f.id === id);
    if (!firm) return null;
    firm.status = 'suspended';
    firm.subscriptionStatus = 'suspended';
    if (reason) firm.auditReason = reason;

    this.auditEvents.unshift({
      id: `evt-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: 'Platform Super Admin',
      actorType: 'Platform Super Admin',
      actorRole: 'PLATFORM_SUPER_ADMIN',
      action: 'FIRM_STATUS_SUSPENDED',
      target: firm.name,
      targetEntity: firm.subdomain,
      source: 'Console',
      severity: 'Warning',
      details: reason || 'Firm suspended by administrator',
      ipAddress: '127.0.0.1',
      cryptographicHash: `sha256:dev_${Date.now().toString(16)}`,
    });

    return firm;
  }

  public enableUser(id: string): UserRecord | null {
    const user = this.users.find((u) => u.id === id);
    if (!user) return null;
    user.status = 'active';
    return user;
  }

  public disableUser(id: string): UserRecord | null {
    const user = this.users.find((u) => u.id === id);
    if (!user) return null;
    user.status = 'suspended';
    return user;
  }

  public markNotificationRead(id: string): NotificationRecord | null {
    const notif = this.notifications.find((n) => n.id === id);
    if (!notif) return null;
    notif.read = true;
    return notif;
  }

  public markAllNotificationsRead(): number {
    let count = 0;
    this.notifications.forEach((n) => {
      if (!n.read) {
        n.read = true;
        count++;
      }
    });
    return count;
  }

  public getAiAutomations(): AIAutomationRecord[] {
    return this.aiAutomations;
  }

  public getAiRuns(): AIRunRecord[] {
    return this.aiRuns;
  }
}

export const store = new DataStore();
