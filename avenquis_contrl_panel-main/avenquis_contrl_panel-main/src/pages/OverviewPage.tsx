/**
 * Avenquis Control Panel - 1. Overview Section
 * Phase CP06: Dashboard Real Data Integration
 * 
 * Strictly real Backend data integration via Central ApiClient:
 * - Direct query parameter passing (?range=...) for telemetry timeframes
 * - Zero runtime mock fallbacks: Real Backend data or safe unavailable error states
 * - Proper handling for 401 Unauthorized, 403 Forbidden, 404 Route Not Found, 5xx Server Error, and Network Failure
 * - Stale request race condition prevention via AbortSignal
 * - Refetches automatically when administrative session becomes valid
 * - Skeletons for loading, empty states for zero-record collections, and no fake zero values when unavailable
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { PageContainer } from '../components/common/PageContainer';
import { MetricCard } from '../components/ui/MetricCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { DataTable, ColumnDef } from '../components/ui/DataTable';
import {
  overviewService,
  SystemServiceStatus,
} from '../services/pageServices';
import {
  MetricItem,
  AccessRequest,
  FirmRecord,
  CollectionRecord,
  SupportTicket,
  AIApproval,
  AuditEvent,
} from '../types';
import { useRouter } from '../context/RouterContext';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../services/apiClient';
import {
  Building2,
  TrendingUp,
  Users,
  ShieldCheck,
  AlertTriangle,
  RotateCw,
  ArrowRight,
  Sparkles,
  Server,
  DollarSign,
  Headphones,
  CheckCircle2,
  AlertOctagon,
  Lock,
  ExternalLink,
  AlertCircle,
  Inbox,
  ShieldAlert,
} from 'lucide-react';
import { formatDate } from '../utils/formatters';

interface DashboardMetricConfig {
  id: string;
  label: string;
  targetPath: string;
  accent: 'forest' | 'gold' | 'neutral';
}

const DASHBOARD_METRIC_CONFIGS: DashboardMetricConfig[] = [
  { id: 'm1', label: 'Total Firms', targetPath: '/firms', accent: 'forest' },
  { id: 'm2', label: 'Active Firms', targetPath: '/firms', accent: 'neutral' },
  { id: 'm3', label: 'Total Users', targetPath: '/users', accent: 'neutral' },
  { id: 'm4', label: 'Pending Access Requests', targetPath: '/access-requests', accent: 'gold' },
  { id: 'm5', label: 'Pending Approvals', targetPath: '/ai/approvals', accent: 'neutral' },
  { id: 'm6', label: 'Monthly Subscription Value', targetPath: '/billing', accent: 'neutral' },
  { id: 'm7', label: 'Overdue Collections', targetPath: '/billing', accent: 'neutral' },
  { id: 'm8', label: 'Open Support Issues', targetPath: '/support', accent: 'neutral' },
];

export const OverviewPage: React.FC = () => {
  const { navigate } = useRouter();
  const { isAuthenticated, isPlatformSuperAdmin } = useAuth();

  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | 'ytd'>('30d');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Authoritative Backend Data States (No Mock Defaults)
  const [metrics, setMetrics] = useState<MetricItem[]>([]);
  const [systemServices, setSystemServices] = useState<SystemServiceStatus[]>([]);
  const [recentRequests, setRecentRequests] = useState<AccessRequest[]>([]);
  const [recentFirms, setRecentFirms] = useState<FirmRecord[]>([]);
  const [collections, setCollections] = useState<CollectionRecord[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<AIApproval[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);

  // Telemetry Error Tracking (Distinct 401, 403, 404, 5xx, Network)
  const [generalError, setGeneralError] = useState<ApiError | Error | null>(null);
  const [metricsError, setMetricsError] = useState<ApiError | Error | null>(null);
  const [systemError, setSystemError] = useState<ApiError | Error | null>(null);
  const [requestsError, setRequestsError] = useState<ApiError | Error | null>(null);
  const [firmsError, setFirmsError] = useState<ApiError | Error | null>(null);
  const [collectionsError, setCollectionsError] = useState<ApiError | Error | null>(null);
  const [supportError, setSupportError] = useState<ApiError | Error | null>(null);
  const [approvalsError, setApprovalsError] = useState<ApiError | Error | null>(null);
  const [auditError, setAuditError] = useState<ApiError | Error | null>(null);

  // Active in-flight request controller for race condition prevention
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadData = useCallback(async (isManualRefresh = false) => {
    // Abort previous in-flight request to avoid stale responses
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const signal = controller.signal;

    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setGeneralError(null);

    try {
      // Execute all dashboard queries against verified backend endpoints concurrently
      const [
        metricsRes,
        systemRes,
        requestsRes,
        firmsRes,
        collectionsRes,
        supportRes,
        approvalsRes,
        auditRes,
      ] = await Promise.allSettled([
        overviewService.getMetrics(timeRange, signal),
        overviewService.getSystemStatus(signal),
        overviewService.getRecentAccessRequests(signal),
        overviewService.getRecentFirms(signal),
        overviewService.getCollections(signal),
        overviewService.getSupportTickets(signal),
        overviewService.getPendingApprovals(signal),
        overviewService.getAuditEvents(signal),
      ]);

      if (signal.aborted) return;

      // 1. Process Metrics
      if (metricsRes.status === 'fulfilled') {
        setMetrics(metricsRes.value.data);
        setMetricsError(null);
      } else {
        setMetrics([]);
        setMetricsError(metricsRes.reason as ApiError);
      }

      // 2. Process System Status
      if (systemRes.status === 'fulfilled') {
        setSystemServices(systemRes.value.data);
        setSystemError(null);
      } else {
        setSystemServices([]);
        setSystemError(systemRes.reason as ApiError);
      }

      // 3. Process Access Requests
      if (requestsRes.status === 'fulfilled') {
        setRecentRequests(requestsRes.value.data.slice(0, 3));
        setRequestsError(null);
      } else {
        setRecentRequests([]);
        setRequestsError(requestsRes.reason as ApiError);
      }

      // 4. Process Firms
      if (firmsRes.status === 'fulfilled') {
        setRecentFirms(firmsRes.value.data.slice(0, 4));
        setFirmsError(null);
      } else {
        setRecentFirms([]);
        setFirmsError(firmsRes.reason as ApiError);
      }

      // 5. Process Collections
      if (collectionsRes.status === 'fulfilled') {
        const raw = collectionsRes.value.data;
        const list = Array.isArray(raw)
          ? raw
          : Array.isArray((raw as any)?.collections)
          ? (raw as any).collections
          : Array.isArray((raw as any)?.data)
          ? (raw as any).data
          : [];
        setCollections(list);
        setCollectionsError(null);
      } else {
        setCollections([]);
        setCollectionsError(collectionsRes.reason as ApiError);
      }

      // 6. Process Support Tickets
      if (supportRes.status === 'fulfilled') {
        const raw = supportRes.value.data;
        const list = Array.isArray(raw)
          ? raw
          : Array.isArray((raw as any)?.tickets)
          ? (raw as any).tickets
          : Array.isArray((raw as any)?.data)
          ? (raw as any).data
          : [];
        setSupportTickets(list.slice(0, 3));
        setSupportError(null);
      } else {
        setSupportTickets([]);
        setSupportError(supportRes.reason as ApiError);
      }

      // 7. Process AI Approvals
      if (approvalsRes.status === 'fulfilled') {
        const raw = approvalsRes.value.data;
        const list = Array.isArray(raw)
          ? raw
          : Array.isArray((raw as any)?.approvals)
          ? (raw as any).approvals
          : Array.isArray((raw as any)?.data)
          ? (raw as any).data
          : [];
        setPendingApprovals(
          list.filter((a: any) => a.status === 'Pending' || a.status === 'pending').slice(0, 3)
        );
        setApprovalsError(null);
      } else {
        setPendingApprovals([]);
        setApprovalsError(approvalsRes.reason as ApiError);
      }

      // 8. Process Audit Events
      if (auditRes.status === 'fulfilled') {
        const raw = auditRes.value.data;
        const list = Array.isArray(raw)
          ? raw
          : Array.isArray((raw as any)?.events)
          ? (raw as any).events
          : Array.isArray((raw as any)?.data)
          ? (raw as any).data
          : [];
        setAuditEvents(list.slice(0, 4));
        setAuditError(null);
      } else {
        setAuditEvents([]);
        setAuditError(auditRes.reason as ApiError);
      }

      // Detect general telemetry error if all or core endpoints failed
      const rejectedReasons = [
        metricsRes,
        systemRes,
        requestsRes,
        firmsRes,
        collectionsRes,
        supportRes,
        approvalsRes,
        auditRes,
      ]
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map((r) => r.reason);

      if (rejectedReasons.length > 0) {
        // Pick primary error for executive banner
        const primaryError = (metricsRes.status === 'rejected' ? metricsRes.reason : rejectedReasons[0]) as ApiError;
        setGeneralError(primaryError);
      }
    } catch (err: unknown) {
      if (!signal.aborted) {
        setGeneralError(err as ApiError);
      }
    } finally {
      if (!signal.aborted) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [timeRange]);

  // Load telemetry when timeRange changes or session becomes valid
  useEffect(() => {
    loadData(false);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadData, isAuthenticated, isPlatformSuperAdmin]);

  // Icon mapping for top 8 KPI cards
  const getMetricIcon = (id: string) => {
    switch (id) {
      case 'm1':
        return <Building2 className="w-4 h-4 text-[#143D2D]" />;
      case 'm2':
        return <CheckCircle2 className="w-4 h-4 text-[#2E6B4F]" />;
      case 'm3':
        return <Users className="w-4 h-4 text-[#143D2D]" />;
      case 'm4':
        return <ShieldCheck className="w-4 h-4 text-[#C5A869]" />;
      case 'm5':
        return <Sparkles className="w-4 h-4 text-[#A87F32]" />;
      case 'm6':
        return <TrendingUp className="w-4 h-4 text-[#143D2D]" />;
      case 'm7':
        return <AlertTriangle className="w-4 h-4 text-[#C5302C]" />;
      case 'm8':
        return <Headphones className="w-4 h-4 text-[#8A662D]" />;
      default:
        return <Building2 className="w-4 h-4 text-[#143D2D]" />;
    }
  };

  const firmColumns: ColumnDef<FirmRecord>[] = [
    {
      key: 'name',
      header: 'Firm & Subdomain',
      render: (f) => (
        <div>
          <p className="font-semibold text-xs text-[#11241C]">{f.name}</p>
          <p className="text-[10px] font-mono text-[#7A8A82]">{f.subdomain}.avenquis.com</p>
        </div>
      ),
    },
    {
      key: 'plan',
      header: 'Subscribed Plan',
      render: (f) => <span className="text-xs text-[#283931] font-medium">{f.plan}</span>,
    },
    {
      key: 'seatsAllocated',
      header: 'Seat Capacity',
      render: (f) => (
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 rounded-full bg-[#E5DFD3] overflow-hidden">
            <div
              className="h-full bg-[#143D2D] rounded-full"
              style={{
                width: `${Math.min(
                  100,
                  f.seatsAllocated > 0 ? (f.seatsActive / f.seatsAllocated) * 100 : 0
                )}%`,
              }}
            />
          </div>
          <span className="text-xs font-mono text-[#54645C]">
            {f.seatsActive}/{f.seatsAllocated}
          </span>
        </div>
      ),
    },
    {
      key: 'subscriptionStatus',
      header: 'Subscription',
      render: (f) => (
        <StatusBadge
          status={f.subscriptionStatus ? f.subscriptionStatus.toLowerCase() : 'pending'}
          size="sm"
        />
      ),
    },
    {
      key: 'mrr',
      header: 'MRR',
      render: (f) => (
        <span className="font-mono text-xs font-semibold text-[#11241C]">{f.mrr || '—'}</span>
      ),
    },
  ];

  // Helper to render safe unavailable telemetry banner for any module
  const renderEndpointUnavailable = (endpoint: string, err?: ApiError | Error | null) => {
    const isNotFound = (err as ApiError)?.status === 404;
    return (
      <div className="py-6 px-4 rounded-xl bg-[#FAF8F3] border border-[#EFE9DF] text-center my-3">
        <div className="w-8 h-8 rounded-full bg-[#F2EDE2] text-[#8A662D] border border-[#E0D7C6] flex items-center justify-center mx-auto mb-2">
          <AlertCircle className="w-4 h-4" />
        </div>
        <p className="text-xs font-semibold text-[#11241C]">Telemetry Unavailable</p>
        <p className="text-[11px] text-[#6B7280] mt-0.5">
          {isNotFound
            ? 'Endpoint route not found on authoritative backend'
            : 'Live backend telemetry stream unreachable'}
        </p>
        <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md font-mono text-[10px] font-semibold bg-[#EFE9DF] text-[#4A5750]">
          BACKEND ENDPOINT REQUIRED: {endpoint}
        </div>
      </div>
    );
  };

  // Helper to render empty state for snapshots
  const renderEmptyState = (title: string, subtitle: string) => (
    <div className="py-8 px-4 text-center my-2">
      <div className="w-9 h-9 rounded-full bg-[#FAF8F3] border border-[#EFE9DF] text-[#9CA3AF] flex items-center justify-center mx-auto mb-2">
        <Inbox className="w-4 h-4" />
      </div>
      <p className="text-xs font-semibold text-[#11241C]">{title}</p>
      <p className="text-[11px] text-[#6B7280] mt-0.5">{subtitle}</p>
    </div>
  );

  return (
    <PageContainer
      title="Platform Operations Overview"
      subtitle="Institutional platform governance, multi-firm telemetry, and executive operations overview."
      toolbarActions={
        <div className="flex items-center gap-2.5">
          {/* Time Range Selector */}
          <div className="inline-flex items-center rounded-xl border border-[#E4DFD5] bg-white p-1 text-xs font-medium text-[#6B7280] shadow-2xs">
            {(['24h', '7d', '30d', 'ytd'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  timeRange === range
                    ? 'bg-[#143D2D] text-white shadow-xs font-semibold'
                    : 'text-[#6B7280] hover:text-[#11241C] hover:bg-[#FAF8F3]'
                }`}
              >
                {range.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Refresh Action */}
          <button
            onClick={() => loadData(true)}
            disabled={isRefreshing || isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E4DFD5] bg-white hover:border-[#143D2D] hover:text-[#11241C] text-xs font-medium text-[#4B5563] transition-colors shadow-2xs disabled:opacity-60"
          >
            <RotateCw
              className={`w-3.5 h-3.5 text-[#6B7280] ${
                isRefreshing ? 'animate-spin text-[#143D2D]' : ''
              }`}
            />
            <span>Refresh</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* EXECUTIVE TELEMETRY STATUS BANNER (Rendered when real backend errors occur) */}
        {generalError && (
          <div className="rounded-2xl border border-[#F5D3D3] bg-[#FDF2F2] p-4 text-[#991B1B] shadow-2xs">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center shrink-0 border border-[#FECACA]">
                  {(generalError as ApiError)?.type === 'UNAUTHORIZED' ? (
                    <Lock className="w-4 h-4" />
                  ) : (generalError as ApiError)?.type === 'FORBIDDEN' ? (
                    <ShieldAlert className="w-4 h-4" />
                  ) : (
                    <AlertOctagon className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs sm:text-sm font-semibold text-[#991B1B]">
                      {(generalError as ApiError)?.type === 'UNAUTHORIZED'
                        ? '401 Unauthorized — Session Invalidation'
                        : (generalError as ApiError)?.type === 'FORBIDDEN'
                        ? '403 Forbidden — Telemetry Access Restricted'
                        : (generalError as ApiError)?.type === 'NOT_FOUND'
                        ? '404 Not Found — Backend Endpoint Required'
                        : (generalError as ApiError)?.status && (generalError as ApiError).status >= 500
                        ? '500 Server Error — Backend Telemetry Failure'
                        : 'Live Backend Telemetry Unavailable'}
                    </h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]">
                      {(generalError as ApiError)?.type === 'NOT_FOUND'
                        ? 'BACKEND ENDPOINT REQUIRED'
                        : 'ZERO-MOCK ENFORCED'}
                    </span>
                  </div>
                  <p className="text-xs text-[#7F1D1D] mt-1 leading-relaxed">
                    {(generalError as ApiError)?.type === 'UNAUTHORIZED'
                      ? 'Administrative identity verification failed or token expired. Please re-authenticate to restore telemetry.'
                      : (generalError as ApiError)?.type === 'FORBIDDEN'
                      ? 'Your platform identity lacks sufficient administrative authorization to access central telemetry.'
                      : (generalError as ApiError)?.type === 'NOT_FOUND'
                      ? 'The backend server does not provide an endpoint handler for the requested overview metrics.'
                      : 'The authoritative AVENQUIS Backend is not currently reachable or VITE_API_BASE_URL is unconfigured. Showing verified unavailable states for real-time telemetry. No mock data will be shown.'}
                  </p>
                  <p className="text-[11px] font-mono text-[#991B1B] mt-1.5 opacity-90">
                    Target Endpoint: GET /overview/metrics?range={timeRange}
                  </p>
                </div>
              </div>
              <button
                onClick={() => loadData(true)}
                disabled={isRefreshing}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#FCA5A5] text-xs font-semibold text-[#991B1B] hover:bg-[#FEF2F2] shadow-2xs transition-colors"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Retry Connection</span>
              </button>
            </div>
          </div>
        )}

        {/* TOP 8 METRICS GRID */}
        <div>
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
              Key Performance Indicators ({timeRange.toUpperCase()})
            </h2>
            <span className="text-xs text-[#9CA3AF]">Click any metric to view details</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {isLoading
              ? Array.from({ length: 8 }).map((_, idx) => (
                  <div
                    key={`metric-skeleton-${idx}`}
                    className="bg-[#FAF8F3] border border-[#DDD5C7] rounded-xl p-4 sm:p-5 shadow-xs animate-pulse border-l-4 border-l-[#DDD5C7]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="h-3 w-24 bg-[#E5DFD3] rounded" />
                      <div className="h-7 w-7 bg-[#E5DFD3] rounded-md" />
                    </div>
                    <div className="mt-3.5 h-7 w-20 bg-[#E5DFD3] rounded" />
                    <div className="mt-2.5 h-3 w-32 bg-[#E5DFD3] rounded" />
                  </div>
                ))
              : DASHBOARD_METRIC_CONFIGS.map((cfg, idx) => {
                  // Match real backend metric if available
                  const found = metrics.find((m) => m.id === cfg.id);
                  const isAvailable = Boolean(found && found.value !== undefined && found.value !== null);

                  return (
                    <div
                      key={cfg.id}
                      onClick={() => navigate(cfg.targetPath)}
                      className="cursor-pointer transition-transform hover:-translate-y-0.5"
                      role="button"
                      tabIndex={0}
                    >
                      <MetricCard
                        label={found?.label || cfg.label}
                        // Rule: Do not show zeros as fake values when data is unavailable
                        value={isAvailable ? found!.value : '—'}
                        change={isAvailable ? found?.change : undefined}
                        trend={isAvailable ? found?.trend : 'neutral'}
                        sublabel={
                          isAvailable
                            ? found?.sublabel
                            : metricsError
                            ? 'Backend Endpoint Required'
                            : 'Telemetry Unavailable'
                        }
                        icon={getMetricIcon(cfg.id)}
                        accent={cfg.accent}
                      />
                    </div>
                  );
                })}
          </div>
        </div>

        {/* ROW 1: RECENT ACCESS REQUESTS & SYSTEM/SERVICE STATUS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Access Requests */}
          <div className="lg:col-span-2 border border-[#EFE9DF] rounded-2xl bg-white p-6 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#EFE9DF]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#EAF3ED] text-[#143D2D] flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-serif font-semibold text-[#11241C]">
                      Recent Access Requests
                    </h3>
                    <p className="text-xs text-[#6B7280]">
                      New practitioner and partner onboarding requests
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/access-requests')}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#143D2D] hover:underline"
                >
                  <span>Review Queue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {isLoading ? (
                <div className="space-y-3 mt-4">
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <div key={`req-skel-${idx}`} className="h-14 rounded-xl bg-[#FAF8F3] animate-pulse" />
                  ))}
                </div>
              ) : requestsError ? (
                renderEndpointUnavailable('GET /access-requests', requestsError)
              ) : recentRequests.length === 0 ? (
                renderEmptyState(
                  'No Pending Access Requests',
                  'All practitioner and firm accreditation requests have been reviewed.'
                )
              ) : (
                <div className="divide-y divide-[#EFE9DF] mt-2">
                  {recentRequests.map((req) => (
                    <div key={req.id} className="py-3.5 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold text-[#11241C] truncate">
                            {req.firmName}
                          </p>
                          <StatusBadge status={req.status} size="sm" />
                        </div>
                        <p className="text-xs text-[#6B7280] mt-1">
                          Requester:{' '}
                          <span className="font-medium text-[#11241C]">{req.requesterName}</span> •{' '}
                          {req.jurisdiction}
                        </p>
                        <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                          Type: {req.requestType} • Role: {req.requestedRole}
                        </p>
                      </div>

                      <button
                        onClick={() => navigate('/access-requests')}
                        className="shrink-0 px-3 py-1.5 rounded-xl bg-[#FAF8F3] hover:bg-[#F2ECE1] text-xs font-medium text-[#143D2D] border border-[#E4DFD5] transition-colors"
                      >
                        Review
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-[#EFE9DF] flex items-center justify-between text-xs text-[#6B7280]">
              <span>Identity &amp; credentials verification active</span>
              <span className="font-mono text-[11px]">
                {recentRequests.length > 0 ? `${recentRequests.length} in view` : 'Queue synced'}
              </span>
            </div>
          </div>

          {/* System / Service Status Area */}
          <div className="border border-[#EFE9DF] rounded-2xl bg-white p-6 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#EFE9DF]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#FAF8F3] text-[#143D2D] flex items-center justify-center border border-[#EFE9DF]">
                    <Server className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-serif font-semibold text-[#11241C]">
                      System Services
                    </h3>
                    <p className="text-xs text-[#6B7280]">Infrastructure health</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-[#EAF3ED] text-[#14472F] border border-[#D5E8DD]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1D734E]" />
                  Verified SLA
                </span>
              </div>

              {isLoading ? (
                <div className="space-y-2.5 mt-4">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div key={`svc-skel-${idx}`} className="h-16 rounded-xl bg-[#FAF8F3] animate-pulse" />
                  ))}
                </div>
              ) : systemError ? (
                renderEndpointUnavailable('GET /overview/system-status', systemError)
              ) : systemServices.length === 0 ? (
                renderEmptyState(
                  'No System Status Reported',
                  'Backend monitoring telemetry stream is awaiting status packets.'
                )
              ) : (
                <div className="space-y-2.5 mt-4">
                  {systemServices.map((svc, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-[#FAF8F3] border border-[#EFE9DF] text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-[#11241C]">{svc.name}</span>
                        <span
                          className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full ${
                            svc.status === 'Healthy'
                              ? 'bg-[#EAF3ED] text-[#14472F]'
                              : 'bg-[#FEF6E4] text-[#8D6816]'
                          }`}
                        >
                          {svc.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-[#6B7280] mt-1.5">
                        <span>{svc.region}</span>
                        <span className="font-mono text-[10px]">Latency: {svc.latency}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-[#EFE9DF] text-xs text-[#6B7280] flex items-center justify-between">
              <span>Security Protocols: Active</span>
              <span className="font-mono text-[11px]">TLS 1.3 Strict</span>
            </div>
          </div>
        </div>

        {/* ROW 2: RECENT FIRMS DIRECTORY SNAPSHOT */}
        <div className="border border-[#EFE9DF] rounded-2xl bg-white p-6 shadow-2xs">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#EFE9DF]">
            <div>
              <h3 className="text-base font-serif font-semibold text-[#11241C]">
                Active Managed Legal &amp; Accounting Firms
              </h3>
              <p className="text-xs text-[#6B7280]">
                Institutional customer tenancies provisioned on dedicated isolated databases
              </p>
            </div>

            <button
              onClick={() => navigate('/firms')}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#143D2D] hover:underline"
            >
              <span>Manage All Firms {recentFirms.length > 0 ? `(${recentFirms.length})` : ''}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {isLoading ? (
            <div className="h-44 rounded-xl bg-[#FAF8F3] animate-pulse" />
          ) : firmsError ? (
            renderEndpointUnavailable('GET /firms', firmsError)
          ) : recentFirms.length === 0 ? (
            renderEmptyState(
              'No Managed Firms Provisioned',
              'No institutional firm accounts found in authoritative backend database.'
            )
          ) : (
            <DataTable columns={firmColumns} data={recentFirms} keyExtractor={(r) => r.id} />
          )}
        </div>

        {/* ROW 3: BILLING / COLLECTIONS SNAPSHOT & SUPPORT QUEUE & AI SNAPSHOT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Billing & Collections Snapshot */}
          <div className="border border-[#EFE9DF] rounded-2xl bg-white p-6 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#EFE9DF]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#FAF8F3] text-[#143D2D] flex items-center justify-center border border-[#EFE9DF]">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-serif font-semibold text-[#11241C]">
                    Collections &amp; Receivables
                  </h3>
                </div>
                <button
                  onClick={() => navigate('/billing')}
                  className="text-xs font-medium text-[#143D2D] hover:underline"
                >
                  Details
                </button>
              </div>

              {isLoading ? (
                <div className="space-y-3 mt-4">
                  <div className="h-16 rounded-xl bg-[#FAF8F3] animate-pulse" />
                  <div className="h-24 rounded-xl bg-[#FAF8F3] animate-pulse" />
                </div>
              ) : collectionsError ? (
                renderEndpointUnavailable('GET /billing/collections', collectionsError)
              ) : !Array.isArray(collections) || collections.length === 0 ? (
                renderEmptyState(
                  'No Overdue Receivables',
                  'All enterprise invoices and subscriptions are current.'
                )
              ) : (
                <>
                  <div className="mt-4 p-3.5 rounded-xl bg-[#FAECEC] border border-[#F5D3D3] mb-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-[#942B28]">Overdue Accounts</span>
                      <span className="text-xs font-serif font-bold text-[#942B28]">
                        {Array.isArray(collections) ? collections.length : 0} Firm{collections.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#A63330] mt-1">
                      Action required on delinquent subscription accounts
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    {Array.isArray(collections) && collections.map((col) => (
                      <div
                        key={col.id}
                        className="p-3 rounded-xl bg-[#FAF8F3] border border-[#EFE9DF] text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-[#11241C] truncate">{col.firm}</p>
                          <span className="font-serif font-semibold text-[#DC2626]">
                            {col.outstandingAmount}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-[#6B7280] mt-1">
                          <span>Age: {col.age}</span>
                          <span className="font-mono text-[10px] text-[#DC2626] font-medium">
                            {col.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => navigate('/billing')}
              className="mt-5 w-full py-2.5 rounded-xl bg-[#143D2D] hover:bg-[#0E2C20] text-white text-xs font-medium transition-colors shadow-2xs"
            >
              Open Collections Ledger
            </button>
          </div>

          {/* Support Queue Snapshot */}
          <div className="border border-[#EFE9DF] rounded-2xl bg-white p-6 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#EFE9DF]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#FAF8F3] text-[#143D2D] flex items-center justify-center border border-[#EFE9DF]">
                    <Headphones className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-serif font-semibold text-[#11241C]">
                    Priority Support Tickets
                  </h3>
                </div>
                <button
                  onClick={() => navigate('/support')}
                  className="text-xs font-medium text-[#143D2D] hover:underline"
                >
                  Queue
                </button>
              </div>

              {isLoading ? (
                <div className="space-y-2.5 mt-4">
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <div key={`supp-skel-${idx}`} className="h-16 rounded-xl bg-[#FAF8F3] animate-pulse" />
                  ))}
                </div>
              ) : supportError ? (
                renderEndpointUnavailable('GET /support/tickets', supportError)
              ) : !Array.isArray(supportTickets) || supportTickets.length === 0 ? (
                renderEmptyState(
                  'Support Queue Empty',
                  'Zero open critical or high priority tickets pending dispatch.'
                )
              ) : (
                <div className="space-y-2.5 mt-4">
                  {Array.isArray(supportTickets) && supportTickets.map((tkt) => (
                    <div
                      key={tkt.id}
                      className="p-3 rounded-xl bg-[#FAF8F3] border border-[#EFE9DF] text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] text-[#9CA3AF]">
                          {tkt.ticketNumber}
                        </span>
                        <StatusBadge
                          status={
                            tkt.priority === 'Urgent'
                              ? 'critical'
                              : tkt.priority === 'High'
                              ? 'warning'
                              : 'healthy'
                          }
                          size="sm"
                        />
                      </div>
                      <p className="font-medium text-[#11241C] mt-1.5 line-clamp-1">{tkt.subject || 'Support Ticket'}</p>
                      <div className="flex items-center justify-between text-xs text-[#6B7280] mt-1.5">
                        <span>{(tkt.firmName || 'Firm').split(' ')[0]}</span>
                        <span className="text-[11px]">Assigned: {(tkt.assignedTo || 'Unassigned').split(' ')[0]}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => navigate('/support')}
              className="mt-5 w-full py-2.5 rounded-xl border border-[#E4DFD5] bg-[#FAF8F3] hover:bg-[#F2ECE1] text-[#143D2D] text-xs font-medium transition-colors"
            >
              Triage Support Tickets
            </button>
          </div>

          {/* AI Activity Snapshot */}
          <div className="border border-[#EFE9DF] rounded-2xl bg-white p-6 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#EFE9DF]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#FEF6E4] text-[#C59A4E] flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-serif font-semibold text-[#11241C]">
                    AI Action Governance
                  </h3>
                </div>
                <button
                  onClick={() => navigate('/ai/approvals')}
                  className="text-xs font-medium text-[#143D2D] hover:underline"
                >
                  Approvals {Array.isArray(pendingApprovals) && pendingApprovals.length > 0 ? `(${pendingApprovals.length})` : ''}
                </button>
              </div>

              {isLoading ? (
                <div className="space-y-3 mt-4">
                  <div className="h-16 rounded-xl bg-[#FAF8F3] animate-pulse" />
                  <div className="h-24 rounded-xl bg-[#FAF8F3] animate-pulse" />
                </div>
              ) : approvalsError ? (
                renderEndpointUnavailable('GET /ai/approvals', approvalsError)
              ) : !Array.isArray(pendingApprovals) || pendingApprovals.length === 0 ? (
                renderEmptyState(
                  'No Approvals Pending',
                  'Autonomous AI actions are executing within authorized governance parameters.'
                )
              ) : (
                <>
                  <div className="mt-4 p-3.5 rounded-xl bg-[#FEF6E4] border border-[#F4E2B5] mb-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-[#8D6816]">Human Approval Gate</span>
                      <span className="text-xs font-serif font-bold text-[#8D6816]">
                        {pendingApprovals.length} Pending
                      </span>
                    </div>
                    <p className="text-[11px] text-[#8D6816] mt-1">
                      High-impact actions awaiting administrator approval
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    {Array.isArray(pendingApprovals) && pendingApprovals.map((appr) => (
                      <div
                        key={appr.id}
                        className="p-3 rounded-xl bg-[#FAF8F3] border border-[#EFE9DF] text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[#143D2D]">{appr.agent} Agent</span>
                          <span className="font-mono text-[10px] text-[#DC2626] font-semibold uppercase">
                            {appr.riskLevel}
                          </span>
                        </div>
                        <p className="text-xs text-[#374151] mt-1.5 line-clamp-1">
                          {appr.pendingAction}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => navigate('/ai/approvals')}
              className="mt-5 w-full py-2.5 rounded-xl bg-[#143D2D] hover:bg-[#0E2C20] text-white text-xs font-medium transition-colors shadow-2xs"
            >
              Inspect AI Approval Gate
            </button>
          </div>
        </div>

        {/* ROW 4: RECENT PLATFORM ACTIVITY (Audit Ledger) */}
        <div className="border border-[#EFE9DF] rounded-2xl bg-white p-6 shadow-2xs">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#EFE9DF]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#FAF8F3] text-[#143D2D] flex items-center justify-center border border-[#EFE9DF]">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-serif font-semibold text-[#11241C]">
                  Recent Administrative Audit Trail
                </h3>
                <p className="text-xs text-[#6B7280]">
                  Verified administrative activity stream and security log
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate('/audit')}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#143D2D] hover:underline"
            >
              <span>View Full Ledger</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={`audit-skel-${idx}`} className="h-12 rounded-xl bg-[#FAF8F3] animate-pulse" />
              ))}
            </div>
          ) : auditError ? (
            renderEndpointUnavailable('GET /audit/events', auditError)
          ) : !Array.isArray(auditEvents) || auditEvents.length === 0 ? (
            renderEmptyState(
              'No Audit Events Recorded',
              'Administrative action ledger is clear for this timeframe.'
            )
          ) : (
            <div className="divide-y divide-[#EFE9DF]">
              {Array.isArray(auditEvents) && auditEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="py-3.5 flex items-center justify-between gap-4 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-[11px] text-[#9CA3AF]">
                        {formatDate(evt.timestamp)}
                      </span>
                      <span className="font-semibold text-[#11241C]">{evt.actor}</span>
                      <span className="px-2 py-0.5 rounded-full bg-[#FAF8F3] text-[#143D2D] border border-[#EFE9DF] font-mono text-[10px]">
                        {evt.action}
                      </span>
                    </div>
                    <p className="text-xs text-[#4B5563] mt-1.5">{evt.details}</p>
                    <p className="text-[11px] text-[#9CA3AF] mt-0.5">Target: {evt.target}</p>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <StatusBadge
                      status={
                        evt.severity === 'Security'
                          ? 'critical'
                          : evt.severity === 'Warning'
                          ? 'warning'
                          : 'healthy'
                      }
                      size="sm"
                    />
                    <button
                      onClick={() => navigate('/audit')}
                      className="p-1.5 text-[#9CA3AF] hover:text-[#11241C] rounded-lg hover:bg-[#FAF8F3] transition-colors"
                      title="Audit Details"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
};
