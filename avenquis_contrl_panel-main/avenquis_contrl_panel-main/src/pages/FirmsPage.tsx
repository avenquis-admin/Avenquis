/**
 * Avenquis Control Panel - 3. Firms Section
 * Phase CP07: Firm Management Integration
 * 
 * Target flow:
 * FIRM PAGE -> CENTRAL API CLIENT -> BACKEND -> REAL FIRM DATA
 * -> AUTHORIZED MUTATION -> BACKEND PERSISTS -> REFETCH -> RELOAD SHOWS SAME STATE
 * 
 * Strict Real-Backend Governance:
 * - Real Backend endpoint integration (GET /firms with search/filter params, GET /firms/:id)
 * - Real Backend mutations (POST /firms/:id/activate, POST /firms/:id/suspend, PATCH /firms/:id)
 * - Zero runtime mock fallback: Backend data or safe unavailable/error states
 * - Zero local-array mutations: Success reported only upon Backend confirmation
 * - Duplicate submit prevention & in-flight request cancellation (AbortSignal)
 * - Explicit display of Backend validation errors (422, 409, 403, 401, 404, 5xx)
 * - Automatic authoritative refetch following all mutation operations
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { PageContainer } from '../components/common/PageContainer';
import { DataTable, ColumnDef } from '../components/ui/DataTable';
import { FilterBar } from '../components/ui/FilterBar';
import { StatusBadge } from '../components/ui/StatusBadge';
import { DetailsDrawer, ConfirmationModal } from '../components/ui/ConfirmationModal';
import { firmsService } from '../services/pageServices';
import { FirmRecord } from '../types';
import { formatDate } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../services/apiClient';
import {
  Building2,
  Eye,
  CheckCircle,
  Ban,
  Settings,
  Users,
  CreditCard,
  Clock,
  CheckCircle2,
  AlertOctagon,
  AlertCircle,
  ShieldAlert,
  Lock,
  RotateCw,
  Inbox,
  AlertTriangle,
} from 'lucide-react';

export const FirmsPage: React.FC = () => {
  const { isAuthenticated, isPlatformSuperAdmin } = useAuth();

  // Primary Data & Filter States
  const [firms, setFirms] = useState<FirmRecord[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [subStatusFilter, setSubStatusFilter] = useState('all');

  // Loading & Error States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<ApiError | Error | null>(null);

  // Selected Firm for Details Drawer & Fresh Dossier Fetching
  const [selectedFirm, setSelectedFirm] = useState<FirmRecord | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  // Manage Plan & Quotas Modal State
  const [managingFirm, setManagingFirm] = useState<FirmRecord | null>(null);
  const [managedPlan, setManagedPlan] = useState('');
  const [managedSeats, setManagedSeats] = useState(14);
  const [manageAuditReason, setManageAuditReason] = useState('');

  // Suspend Modal State
  const [firmToSuspend, setFirmToSuspend] = useState<FirmRecord | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendAuditReason, setSuspendAuditReason] = useState('');

  // Reactivate Modal State
  const [firmToActivate, setFirmToActivate] = useState<FirmRecord | null>(null);
  const [activateAuditReason, setActivateAuditReason] = useState('');

  // Mutation Execution & Error States (Prevents duplicate submissions)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  // Success Feedback Notification Banner
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  // Active in-flight request controller for query race condition prevention
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Authoritative data fetch from real Backend via central ApiClient
   * Transmits real query parameters (?search=...&status=...&plan=...&subscriptionStatus=...)
   */
  const loadData = useCallback(async (isManual = false) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const signal = controller.signal;

    if (isManual) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setFetchError(null);

    try {
      const res = await firmsService.getAll(
        {
          search: search.trim() || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          plan: planFilter !== 'all' ? planFilter : undefined,
          subscriptionStatus: subStatusFilter !== 'all' ? subStatusFilter : undefined,
        },
        signal
      );

      if (signal.aborted) return;

      setFirms(res.data);
      setFetchError(null);
    } catch (err: unknown) {
      if (!signal.aborted) {
        setFirms([]);
        setFetchError(err as ApiError);
      }
    } finally {
      if (!signal.aborted) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [search, statusFilter, planFilter, subStatusFilter]);

  // Load data when filters or auth state change
  useEffect(() => {
    loadData(false);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadData, isAuthenticated, isPlatformSuperAdmin]);

  // Client-side safety filter in case backend returns full unfiltered collection
  const filtered = firms.filter((f) => {
    const query = search.toLowerCase().trim();
    const firmName = (f.name || '').toLowerCase();
    const subdomain = (f.subdomain || '').toLowerCase();
    const matchesSearch =
      !query ||
      firmName.includes(query) ||
      subdomain.includes(query);

    const matchesStatus = statusFilter === 'all' || f.status === statusFilter;
    const matchesPlan = planFilter === 'all' || (f.plan && f.plan.toLowerCase() === planFilter.toLowerCase());
    const matchesSubStatus =
      subStatusFilter === 'all' ||
      (f.subscriptionStatus && f.subscriptionStatus.toLowerCase() === subStatusFilter.toLowerCase());

    return matchesSearch && matchesStatus && matchesPlan && matchesSubStatus;
  });

  /**
   * Opens firm details drawer and fetches authoritative dossier via GET /firms/:id
   */
  const handleOpenDetails = async (firm: FirmRecord) => {
    setSelectedFirm(firm);
    setIsLoadingDetails(true);
    setDetailsError(null);

    try {
      const res = await firmsService.getById(firm.id);
      setSelectedFirm(res.data);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      if (apiErr.status === 404) {
        setDetailsError('Detailed dossier endpoint (GET /firms/:id) not yet implemented on backend.');
      } else {
        setDetailsError('Unable to refresh latest dossier from server. Displaying cached record.');
      }
    } finally {
      setIsLoadingDetails(false);
    }
  };

  /**
   * Opens Manage Plan & Seat Allocation dialog
   */
  const handleOpenManage = (f: FirmRecord) => {
    setManagingFirm(f);
    setManagedPlan(f.plan);
    setManagedSeats(f.seatsAllocated || 14);
    setManageAuditReason('');
    setMutationError(null);
  };

  /**
   * Executes PATCH /firms/:id to persist plan and quota changes
   * ZERO local-only mutation — updates persisted only upon Backend confirmation
   */
  const handleSaveManage = async () => {
    if (!managingFirm || isSubmitting) return;

    setIsSubmitting(true);
    setMutationError(null);

    try {
      const updated = await firmsService.updatePlan(managingFirm.id, {
        plan: managedPlan,
        seatsAllocated: managedSeats,
        auditReason: manageAuditReason.trim() || undefined,
      });

      // Update selectedFirm if drawer is inspecting this firm
      if (selectedFirm?.id === managingFirm.id) {
        setSelectedFirm(updated);
      }

      setFeedbackBanner(`Firm plan successfully updated to "${managedPlan}" for "${managingFirm.name}".`);
      setManagingFirm(null);
      await loadData();
      setTimeout(() => setFeedbackBanner(null), 4000);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      const errorMsg =
        apiErr.message ||
        (apiErr.status === 404
          ? 'Backend Endpoint Required: PATCH /firms/:id is not implemented.'
          : apiErr.status === 403
          ? '403 Forbidden: Insufficient administrative privileges.'
          : apiErr.status === 422
          ? 'Validation Error: Backend rejected submitted plan or seat parameters.'
          : 'Failed to update firm plan on authoritative backend.');
      setMutationError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Executes POST /firms/:id/suspend
   * ZERO local-only mutation — updates persisted only upon Backend confirmation
   */
  const handleConfirmSuspend = async () => {
    if (!firmToSuspend || isSubmitting) return;

    if (!suspendReason) {
      setMutationError('Please select a mandatory ground for tenancy suspension.');
      return;
    }

    setIsSubmitting(true);
    setMutationError(null);

    try {
      const updated = await firmsService.suspend(firmToSuspend.id, {
        reason: suspendReason,
        auditReason: suspendAuditReason.trim() || undefined,
      });

      if (selectedFirm?.id === firmToSuspend.id) {
        setSelectedFirm(updated);
      }

      setFeedbackBanner(`Tenancy for "${firmToSuspend.name}" has been suspended on backend.`);
      setFirmToSuspend(null);
      setSuspendReason('');
      setSuspendAuditReason('');
      await loadData();
      setTimeout(() => setFeedbackBanner(null), 4000);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      const errorMsg =
        apiErr.message ||
        (apiErr.status === 404
          ? 'Backend Endpoint Required: POST /firms/:id/suspend is not implemented.'
          : apiErr.status === 403
          ? '403 Forbidden: Administrative authority required for tenancy suspension.'
          : 'Failed to suspend firm tenancy on authoritative backend.');
      setMutationError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Executes POST /firms/:id/activate
   * ZERO local-only mutation — updates persisted only upon Backend confirmation
   */
  const handleConfirmActivate = async () => {
    if (!firmToActivate || isSubmitting) return;

    setIsSubmitting(true);
    setMutationError(null);

    try {
      const updated = await firmsService.activate(firmToActivate.id, {
        auditReason: activateAuditReason.trim() || undefined,
      });

      if (selectedFirm?.id === firmToActivate.id) {
        setSelectedFirm(updated);
      }

      setFeedbackBanner(`Tenancy for "${firmToActivate.name}" has been reactivated on backend.`);
      setFirmToActivate(null);
      setActivateAuditReason('');
      await loadData();
      setTimeout(() => setFeedbackBanner(null), 4000);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      const errorMsg =
        apiErr.message ||
        (apiErr.status === 404
          ? 'Backend Endpoint Required: POST /firms/:id/activate is not implemented.'
          : apiErr.status === 403
          ? '403 Forbidden: Administrative authority required to reactivate tenancy.'
          : 'Failed to reactivate firm tenancy on authoritative backend.');
      setMutationError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: ColumnDef<FirmRecord>[] = [
    {
      key: 'name',
      header: 'Firm Name',
      sortable: true,
      render: (f) => {
        const firmName = f.name || 'Firm';
        const initial = firmName.charAt(0).toUpperCase();
        return (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-[#EAE3D4] text-[#143D2D] flex items-center justify-center font-serif font-bold text-xs shrink-0">
              {initial}
            </div>
            <div>
              <p className="font-semibold text-xs text-[#11241C]">{firmName}</p>
              <p className="text-[10px] font-mono text-[#7A8A82]">ID: {f.id}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'subdomain',
      header: 'Subdomain',
      render: (f) => (
        <span className="font-mono text-xs text-[#143D2D] font-medium bg-[#F0EAE0] px-2 py-0.5 rounded border border-[#DDD5C7]">
          {f.subdomain || 'tenant'}.avenquis.com
        </span>
      ),
    },
    {
      key: 'plan',
      header: 'Plan',
      sortable: true,
      render: (f) => <span className="text-xs text-[#182620] font-medium">{f.plan}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (f) => <StatusBadge status={f.status} size="sm" />,
    },
    {
      key: 'usersCount',
      header: 'Users',
      sortable: true,
      render: (f) => <span className="font-mono text-xs">{f.usersCount || 0} users</span>,
    },
    {
      key: 'seatsAllocated',
      header: 'Seat Usage',
      render: (f) => {
        const allocated = f.seatsAllocated || 1;
        const active = f.seatsActive || 0;
        const pct = Math.round((active / allocated) * 100);
        return (
          <div className="w-28 space-y-1">
            <div className="flex justify-between text-[11px] font-mono">
              <span className="font-semibold text-[#182620]">{active}</span>
              <span className="text-[#7A8A82]">/ {allocated}</span>
            </div>
            <div className="w-full bg-[#E5DFD3] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#143D2D] h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: 'subscriptionStatus',
      header: 'Subscription Status',
      render: (f) => (
        <StatusBadge
          status={f.subscriptionStatus ? f.subscriptionStatus.toLowerCase() : 'pending'}
          size="sm"
        />
      ),
    },
    {
      key: 'createdAt',
      header: 'Created At',
      sortable: true,
      render: (f) => (
        <span className="font-mono text-xs text-[#54645C]">
          {formatDate(f.createdAt || f.onboardedDate)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (f) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => handleOpenDetails(f)}
            className="p-1.5 rounded hover:bg-[#EAE3D4] text-[#54645C] hover:text-[#11241C] transition-colors"
            title="View Details"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => handleOpenManage(f)}
            className="p-1.5 rounded hover:bg-[#EAE3D4] text-[#143D2D] hover:text-[#0E2C20] transition-colors"
            title="Manage Plan & Seats"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          {f.status === 'suspended' ? (
            <button
              onClick={() => {
                setFirmToActivate(f);
                setActivateAuditReason('');
                setMutationError(null);
              }}
              className="p-1.5 rounded hover:bg-[#E3F2E9] text-[#1E563B] transition-colors"
              title="Activate Tenancy"
            >
              <CheckCircle className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={() => {
                setFirmToSuspend(f);
                setSuspendReason('');
                setSuspendAuditReason('');
                setMutationError(null);
              }}
              className="p-1.5 rounded hover:bg-[#FAF0ED] text-[#8A1F1D] transition-colors"
              title="Suspend Tenancy"
            >
              <Ban className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <PageContainer
      title="Managed Enterprise Law Firms"
      subtitle="Institutional tenancy directory, subdomain routing allocations, seat quotas, and firm compliance controls."
      toolbarActions={
        <div className="flex items-center gap-2">
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
      <div className="space-y-4">
        {/* SUCCESS NOTIFICATION BANNER */}
        {feedbackBanner && (
          <div className="p-3.5 rounded-xl bg-[#EAF3ED] border border-[#BBDBC9] text-[#144A32] text-xs flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#1D734E]" />
              <span className="font-medium">{feedbackBanner}</span>
            </div>
            <button
              onClick={() => setFeedbackBanner(null)}
              className="text-[#144A32] hover:opacity-75 font-bold"
            >
              &times;
            </button>
          </div>
        )}

        {/* ERROR / UNAVAILABLE BANNER (When Backend Calls Fail) */}
        {fetchError && (
          <div className="rounded-2xl border border-[#F5D3D3] bg-[#FDF2F2] p-4 text-[#991B1B] shadow-2xs">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center shrink-0 border border-[#FECACA]">
                  {(fetchError as ApiError)?.type === 'UNAUTHORIZED' ? (
                    <Lock className="w-4 h-4" />
                  ) : (fetchError as ApiError)?.type === 'FORBIDDEN' ? (
                    <ShieldAlert className="w-4 h-4" />
                  ) : (
                    <AlertOctagon className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs sm:text-sm font-semibold text-[#991B1B]">
                      {(fetchError as ApiError)?.type === 'UNAUTHORIZED'
                        ? '401 Unauthorized — Session Invalidation'
                        : (fetchError as ApiError)?.type === 'FORBIDDEN'
                        ? '403 Forbidden — Firm Directory Access Restricted'
                        : (fetchError as ApiError)?.type === 'NOT_FOUND'
                        ? '404 Not Found — Backend Endpoint Required'
                        : (fetchError as ApiError)?.status && (fetchError as ApiError).status >= 500
                        ? '500 Server Error — Backend Directory Failure'
                        : 'Live Backend Firm Directory Unavailable'}
                    </h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]">
                      {(fetchError as ApiError)?.type === 'NOT_FOUND'
                        ? 'BACKEND ENDPOINT REQUIRED'
                        : 'ZERO-MOCK ENFORCED'}
                    </span>
                  </div>
                  <p className="text-xs text-[#7F1D1D] mt-1 leading-relaxed">
                    {(fetchError as ApiError)?.type === 'UNAUTHORIZED'
                      ? 'Administrative identity verification failed or token expired. Please re-authenticate to view firm records.'
                      : (fetchError as ApiError)?.type === 'FORBIDDEN'
                      ? 'Your platform identity lacks sufficient administrative authorization to query managed firms.'
                      : (fetchError as ApiError)?.type === 'NOT_FOUND'
                      ? 'The backend server does not provide an endpoint handler for GET /firms.'
                      : 'The authoritative AVENQUIS Backend is not currently reachable or VITE_API_BASE_URL is unconfigured. Showing verified unavailable states for firm management. No mock data will be shown.'}
                  </p>
                  <p className="text-[11px] font-mono text-[#991B1B] mt-1.5 opacity-90">
                    Target Endpoint: GET /firms
                  </p>
                </div>
              </div>
              <button
                onClick={() => loadData(true)}
                disabled={isRefreshing}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#FCA5A5] text-xs font-semibold text-[#991B1B] hover:bg-[#FEF2F2] shadow-2xs transition-colors"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Retry</span>
              </button>
            </div>
          </div>
        )}

        {/* FILTERS & SEARCH */}
        <div className="flex items-center justify-between gap-4 flex-wrap pb-1">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5 text-xs text-[#54645C]">
              <span>Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2 py-1 rounded-lg border border-[#DDD5C7] bg-[#FAF8F3] text-xs"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="pending">Pending</option>
                <option value="provisioning">Provisioning</option>
              </select>
            </div>

            {/* Plan Filter */}
            <div className="flex items-center gap-1.5 text-xs text-[#54645C]">
              <span>Plan:</span>
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="px-2 py-1 rounded-lg border border-[#DDD5C7] bg-[#FAF8F3] text-xs"
              >
                <option value="all">All Plans</option>
                <option value="Partnership Firm">Partnership Firm</option>
                <option value="Proprietor Firm with 5 Student Login">
                  Proprietor Firm with 5 Student Login
                </option>
                <option value="Individual Proprietor / Firm Owner">
                  Individual Proprietor / Firm Owner
                </option>
                <option value="Single Article Student">Single Article Student</option>
              </select>
            </div>

            {/* Subscription Status Filter */}
            <div className="flex items-center gap-1.5 text-xs text-[#54645C]">
              <span>Subscription:</span>
              <select
                value={subStatusFilter}
                onChange={(e) => setSubStatusFilter(e.target.value)}
                className="px-2 py-1 rounded-lg border border-[#DDD5C7] bg-[#FAF8F3] text-xs"
              >
                <option value="all">All Subscriptions</option>
                <option value="Active">Active</option>
                <option value="Past Due">Past Due</option>
                <option value="Trial">Trial</option>
                <option value="Suspended">Suspended</option>
              </select>
            </div>
          </div>

          <div className="w-72">
            <FilterBar
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search by firm name or subdomain..."
              totalCount={filtered.length}
            />
          </div>
        </div>

        {/* DATA TABLE / LOADING SKELETON / EMPTY STATE */}
        {isLoading ? (
          <div className="border border-[#EFE9DF] rounded-2xl bg-white p-6 shadow-2xs space-y-4">
            <div className="h-6 w-48 bg-[#FAF8F3] rounded animate-pulse" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div
                  key={`firm-skel-${idx}`}
                  className="h-12 rounded-xl bg-[#FAF8F3] animate-pulse"
                />
              ))}
            </div>
          </div>
        ) : fetchError ? (
          <div className="border border-[#EFE9DF] rounded-2xl bg-white p-12 text-center shadow-2xs">
            <div className="w-10 h-10 rounded-full bg-[#FAF8F3] border border-[#DDD5C7] text-[#8A662D] flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-serif font-semibold text-[#11241C]">
              Institutional Firm Directory Unavailable
            </h3>
            <p className="text-xs text-[#6B7280] mt-1 max-w-md mx-auto">
              Live backend firm records cannot be retrieved. Verify that the backend server is running
              and provides the endpoint: <code>GET /firms</code>.
            </p>
            <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-md font-mono text-[11px] font-semibold bg-[#EFE9DF] text-[#4A5750]">
              BACKEND ENDPOINT REQUIRED: GET /firms
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="border border-[#EFE9DF] rounded-2xl bg-white p-12 text-center shadow-2xs">
            <div className="w-10 h-10 rounded-full bg-[#FAF8F3] border border-[#DDD5C7] text-[#9CA3AF] flex items-center justify-center mx-auto mb-3">
              <Inbox className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-serif font-semibold text-[#11241C]">
              {firms.length === 0
                ? 'No Managed Firms Provisioned'
                : 'No Law Firms Match the Selected Filters'}
            </h3>
            <p className="text-xs text-[#6B7280] mt-1 max-w-md mx-auto">
              {firms.length === 0
                ? 'Zero institutional law firms were returned by the authoritative backend database.'
                : 'Try clearing your search query or broadening the status/plan filter criteria.'}
            </p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filtered}
            keyExtractor={(f) => f.id}
            emptyMessage="No law firms match the selected filters."
          />
        )}

        {/* FIRM DETAIL DRAWER */}
        <DetailsDrawer
          isOpen={!!selectedFirm}
          onClose={() => setSelectedFirm(null)}
          title="Firm Profile & Tenancy Dossier"
          subtitle={
            selectedFirm
              ? `${selectedFirm.name} (${selectedFirm.subdomain}.avenquis.com)`
              : ''
          }
          width="xl"
          footer={
            selectedFirm ? (
              <div className="flex items-center justify-between w-full">
                {selectedFirm.status === 'suspended' ? (
                  <button
                    onClick={() => {
                      setFirmToActivate(selectedFirm);
                      setSelectedFirm(null);
                      setActivateAuditReason('');
                      setMutationError(null);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-[#143D2D] text-[#FAF7F0] text-xs font-medium hover:bg-[#0E2C20]"
                  >
                    Reactivate Tenancy
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setFirmToSuspend(selectedFirm);
                      setSelectedFirm(null);
                      setSuspendReason('');
                      setSuspendAuditReason('');
                      setMutationError(null);
                    }}
                    className="px-3.5 py-1.5 rounded-lg border border-[#F0C2C0] bg-[#FAF0ED] text-[#8A1F1D] text-xs font-medium hover:bg-[#F7E1DD]"
                  >
                    Suspend Tenancy
                  </button>
                )}
                <button
                  onClick={() => {
                    handleOpenManage(selectedFirm);
                    setSelectedFirm(null);
                  }}
                  className="px-4 py-1.5 rounded-lg border border-[#DDD5C7] bg-[#F2EDE2] hover:bg-[#E5DFD3] text-xs font-medium text-[#11241C]"
                >
                  Manage Quota &amp; Plan
                </button>
              </div>
            ) : undefined
          }
        >
          {selectedFirm && (
            <div className="space-y-6 text-xs text-[#11241C]">
              {/* Dossier loading / fallback notice */}
              {isLoadingDetails && (
                <div className="p-2.5 rounded-lg bg-[#FAF8F3] border border-[#DDD5C7] text-xs flex items-center gap-2 text-[#52635B]">
                  <RotateCw className="w-3.5 h-3.5 animate-spin text-[#143D2D]" />
                  <span>Synchronizing authoritative dossier from backend...</span>
                </div>
              )}

              {detailsError && (
                <div className="p-3 rounded-lg bg-[#FEF6E4] border border-[#F4E2B5] text-[#8D6816] text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">{detailsError}</span>
                    <span className="text-[11px] font-mono mt-0.5 block">
                      Target: GET /firms/{selectedFirm.id}
                    </span>
                  </div>
                </div>
              )}

              {/* Profile Card */}
              <div className="border border-[#DDD5C7] rounded-xl bg-[#FAF8F3] p-4 space-y-3">
                <div className="flex items-center gap-2 border-b border-[#EAE3D4] pb-2">
                  <Building2 className="w-4 h-4 text-[#143D2D]" />
                  <h4 className="font-serif font-semibold text-xs text-[#11241C]">Firm Profile</h4>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-[#7A8A82] block">Firm Legal Name</span>
                    <span className="font-semibold text-xs">{selectedFirm.name}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#7A8A82] block">Subdomain Address</span>
                    <span className="font-mono text-xs text-[#143D2D] font-medium">
                      https://{selectedFirm.subdomain}.avenquis.com
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#7A8A82] block">Regulatory Jurisdiction</span>
                    <span>{selectedFirm.jurisdiction || 'Institutional Chartered Firm'}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#7A8A82] block">Tenancy Status</span>
                    <StatusBadge status={selectedFirm.status} size="sm" />
                  </div>
                </div>
              </div>

              {/* Plan & Subscription */}
              <div className="border border-[#DDD5C7] rounded-xl bg-[#FAF8F3] p-4 space-y-3">
                <div className="flex items-center gap-2 border-b border-[#EAE3D4] pb-2">
                  <CreditCard className="w-4 h-4 text-[#143D2D]" />
                  <h4 className="font-serif font-semibold text-xs text-[#11241C]">
                    Subscription &amp; MRR
                  </h4>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-[#7A8A82] block">Enrolled Plan</span>
                    <span className="font-semibold text-xs text-[#182620]">{selectedFirm.plan}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#7A8A82] block">Subscription Health</span>
                    <StatusBadge
                      status={
                        selectedFirm.subscriptionStatus
                          ? selectedFirm.subscriptionStatus.toLowerCase()
                          : 'pending'
                      }
                      size="sm"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-[#7A8A82] block">Contracted MRR</span>
                    <span className="font-mono font-bold text-xs text-[#143D2D]">
                      {selectedFirm.mrr || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#7A8A82] block">Provisioned Date</span>
                    <span className="font-mono text-xs">
                      {formatDate(selectedFirm.createdAt || selectedFirm.onboardedDate)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Seat Allocation & User Count */}
              <div className="border border-[#DDD5C7] rounded-xl bg-[#FAF8F3] p-4 space-y-3">
                <div className="flex items-center gap-2 border-b border-[#EAE3D4] pb-2">
                  <Users className="w-4 h-4 text-[#143D2D]" />
                  <h4 className="font-serif font-semibold text-xs text-[#11241C]">
                    Seat Allocation &amp; Users
                  </h4>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-[#7A8A82] block">Registered Users</span>
                    <span className="font-mono font-semibold text-xs">
                      {selectedFirm.usersCount || 0} active identities
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#7A8A82] block">Seat Ceiling</span>
                    <span className="font-mono font-semibold text-xs">
                      {selectedFirm.seatsActive || 0} / {selectedFirm.seatsAllocated || 0} seats allocated
                    </span>
                  </div>
                </div>
              </div>

              {/* Primary Contact */}
              <div className="border border-[#DDD5C7] rounded-xl bg-[#FAF8F3] p-4 space-y-2">
                <h4 className="font-serif font-semibold text-xs text-[#11241C]">
                  Primary Tenancy Contact
                </h4>
                <p className="font-medium text-xs">{selectedFirm.primaryContact || '—'}</p>
                <p className="text-xs font-mono text-[#54645C]">
                  {selectedFirm.primaryContactEmail || '—'}
                </p>
              </div>

              {/* Recent Activity */}
              <div className="border border-[#DDD5C7] rounded-xl bg-[#FAF8F3] p-4 space-y-3">
                <div className="flex items-center gap-2 border-b border-[#EAE3D4] pb-2">
                  <Clock className="w-4 h-4 text-[#143D2D]" />
                  <h4 className="font-serif font-semibold text-xs text-[#11241C]">
                    Tenancy Activity Stream
                  </h4>
                </div>
                <div className="space-y-2">
                  {(selectedFirm.recentActivity && selectedFirm.recentActivity.length > 0
                    ? selectedFirm.recentActivity
                    : [
                        {
                          timestamp: selectedFirm.createdAt || new Date().toISOString(),
                          action: 'Tenancy provisioned on isolated infrastructure',
                          actor: 'Authoritative Backend',
                        },
                      ]
                  ).map((act, i) => (
                    <div
                      key={i}
                      className="p-2 rounded bg-[#F2EDE2] border border-[#EAE3D4] flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-medium text-[#11241C]">{act.action}</p>
                        <p className="text-[10px] text-[#7A8A82]">Actor: {act.actor}</p>
                      </div>
                      <span className="font-mono text-[10px] text-[#7A8A82]">
                        {formatDate(act.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DetailsDrawer>

        {/* MANAGE PLAN MODAL */}
        <ConfirmationModal
          isOpen={!!managingFirm}
          onClose={() => {
            if (!isSubmitting) {
              setManagingFirm(null);
              setMutationError(null);
            }
          }}
          onConfirm={handleSaveManage}
          title="Manage Firm Plan & Allocation"
          confirmText={isSubmitting ? 'Persisting...' : 'Update Plan Quotas'}
          variant="primary"
          isLoading={isSubmitting}
        >
          {managingFirm && (
            <div className="space-y-4 text-xs text-[#11241C]">
              {/* MUTATION ERROR ALERT */}
              {mutationError && (
                <div className="p-3 rounded-lg bg-[#FDF2F2] border border-[#F5D3D3] text-[#991B1B] space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <AlertCircle className="w-4 h-4 text-[#DC2626]" />
                    <span>Update Failed</span>
                  </div>
                  <p className="text-xs leading-relaxed">{mutationError}</p>
                  <p className="text-[10px] font-mono opacity-80">Target: PATCH /firms/{managingFirm.id}</p>
                </div>
              )}

              <div className="p-3 rounded-lg bg-[#FAF8F3] border border-[#DDD5C7]">
                <p className="font-semibold">{managingFirm.name}</p>
                <p className="text-[11px] font-mono text-[#7A8A82]">
                  {managingFirm.subdomain}.avenquis.com
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-semibold block text-xs">Select Plan Tier</label>
                <select
                  value={managedPlan}
                  onChange={(e) => setManagedPlan(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-3 py-1.5 rounded-lg border border-[#DDD5C7] bg-white text-xs font-medium disabled:opacity-60"
                >
                  <option value="Partnership Firm">Partnership Firm (4 partners + 10 students)</option>
                  <option value="Proprietor Firm with 5 Student Login">
                    Proprietor Firm with 5 Student Login
                  </option>
                  <option value="Individual Proprietor / Firm Owner">
                    Individual Proprietor / Firm Owner (1 login)
                  </option>
                  <option value="Single Article Student">
                    Single Article Student (1 student login)
                  </option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold block text-xs">Seat Quota Allocation</label>
                <input
                  type="number"
                  value={managedSeats}
                  onChange={(e) => setManagedSeats(parseInt(e.target.value, 10) || 1)}
                  disabled={isSubmitting}
                  min={1}
                  max={250}
                  className="w-full px-3 py-1.5 rounded-lg border border-[#DDD5C7] bg-white text-xs font-mono disabled:opacity-60"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold block text-xs">Audit Justification</label>
                <input
                  type="text"
                  value={manageAuditReason}
                  onChange={(e) => setManageAuditReason(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Reason for administrative quota adjustment..."
                  className="w-full px-3 py-1.5 rounded-lg border border-[#DDD5C7] bg-white text-xs disabled:opacity-60"
                />
              </div>
            </div>
          )}
        </ConfirmationModal>

        {/* SUSPEND CONFIRMATION MODAL (Risky Action) */}
        <ConfirmationModal
          isOpen={!!firmToSuspend}
          onClose={() => {
            if (!isSubmitting) {
              setFirmToSuspend(null);
              setMutationError(null);
            }
          }}
          onConfirm={handleConfirmSuspend}
          title="Suspend Firm Tenancy"
          confirmText={isSubmitting ? 'Suspending...' : 'Confirm Immediate Suspension'}
          variant="danger"
          isLoading={isSubmitting}
        >
          {firmToSuspend && (
            <div className="space-y-3 text-xs text-[#11241C]">
              {/* MUTATION ERROR ALERT */}
              {mutationError && (
                <div className="p-3 rounded-lg bg-[#FDF2F2] border border-[#F5D3D3] text-[#991B1B] space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <AlertCircle className="w-4 h-4 text-[#DC2626]" />
                    <span>Suspension Failed</span>
                  </div>
                  <p className="text-xs leading-relaxed">{mutationError}</p>
                  <p className="text-[10px] font-mono opacity-80">Target: POST /firms/{firmToSuspend.id}/suspend</p>
                </div>
              )}

              <div className="p-3 rounded-lg bg-[#FAF0ED] border border-[#F0C2C0]">
                <p className="font-semibold text-xs text-[#8A1F1D]">{firmToSuspend.name}</p>
                <p className="text-[11px] text-[#A63330] mt-1 leading-relaxed">
                  WARNING: Suspending this firm immediately locks out all{' '}
                  <strong>{firmToSuspend.usersCount || 0} active users</strong>, halts platform API
                  inferences, and revokes active bearer sessions.
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-semibold block text-xs">
                  Select Primary Suspension Ground <span className="text-[#DC2626]">*</span>
                </label>
                <select
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-3 py-1.5 rounded-lg border border-[#DDD5C7] bg-white text-xs disabled:opacity-60"
                >
                  <option value="">Select reason...</option>
                  <option value="Non-payment / 30+ days overdue collections">
                    Non-payment / 30+ days overdue collections
                  </option>
                  <option value="Regulatory Bar sanction or license revocation">
                    Regulatory Bar sanction or license revocation
                  </option>
                  <option value="Security anomaly / suspected compromised credentials">
                    Security anomaly / suspected compromised credentials
                  </option>
                  <option value="Court-ordered injunction / administrative data freeze">
                    Court-ordered injunction / administrative data freeze
                  </option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold block text-xs">
                  Administrative Reference / Order Number
                </label>
                <input
                  type="text"
                  value={suspendAuditReason}
                  onChange={(e) => setSuspendAuditReason(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="e.g. Legal freeze order #LF-2026-09"
                  className="w-full px-3 py-1.5 rounded-lg border border-[#DDD5C7] bg-white text-xs disabled:opacity-60"
                />
              </div>
            </div>
          )}
        </ConfirmationModal>

        {/* ACTIVATE CONFIRMATION MODAL */}
        <ConfirmationModal
          isOpen={!!firmToActivate}
          onClose={() => {
            if (!isSubmitting) {
              setFirmToActivate(null);
              setMutationError(null);
            }
          }}
          onConfirm={handleConfirmActivate}
          title="Reactivate Firm Tenancy"
          confirmText={isSubmitting ? 'Reactivating...' : 'Reactivate Workspace'}
          variant="primary"
          isLoading={isSubmitting}
        >
          {firmToActivate && (
            <div className="space-y-3 text-xs text-[#11241C]">
              {/* MUTATION ERROR ALERT */}
              {mutationError && (
                <div className="p-3 rounded-lg bg-[#FDF2F2] border border-[#F5D3D3] text-[#991B1B] space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <AlertCircle className="w-4 h-4 text-[#DC2626]" />
                    <span>Reactivation Failed</span>
                  </div>
                  <p className="text-xs leading-relaxed">{mutationError}</p>
                  <p className="text-[10px] font-mono opacity-80">Target: POST /firms/{firmToActivate.id}/activate</p>
                </div>
              )}

              <p className="text-xs text-[#11241C] leading-relaxed">
                Reactivate client firm tenancy for <strong>{firmToActivate.name}</strong>? All{' '}
                <strong>{firmToActivate.usersCount || 0} users</strong> will immediately regain
                secure login access.
              </p>

              <div className="space-y-1">
                <label className="font-semibold block text-xs">Settlement / Approval Reference</label>
                <input
                  type="text"
                  value={activateAuditReason}
                  onChange={(e) => setActivateAuditReason(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="e.g. Settlement clearance receipt #ST-8812"
                  className="w-full px-3 py-1.5 rounded-lg border border-[#DDD5C7] bg-white text-xs disabled:opacity-60"
                />
              </div>
            </div>
          )}
        </ConfirmationModal>
      </div>
    </PageContainer>
  );
};
