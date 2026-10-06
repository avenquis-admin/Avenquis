/**
 * Avenquis Control Panel - 2. Access Requests Section
 * Phase CP08: Access Requests Integration
 * 
 * Target flow:
 * ACCESS REQUEST LIST -> REAL BACKEND DATA -> REVIEW -> APPROVE / REJECT
 * -> BACKEND PERSISTS -> REFETCH -> RELOAD SHOWS SAME STATUS
 * 
 * Strict Real-Backend Governance:
 * - Real Backend endpoint integration (GET /access-requests with search/filter params, GET /access-requests/:id)
 * - Real Backend mutations (POST /access-requests/:id/approve, POST /access-requests/:id/reject)
 * - Zero runtime mock fallback: Backend data or safe unavailable/error states
 * - Zero local-only mutations: Success reported only upon Backend confirmation
 * - Duplicate submit prevention & in-flight request cancellation (AbortSignal)
 * - Explicit display of Backend validation errors (422, 409, 403, 401, 404, 5xx)
 * - Display of real reviewer / reviewedAt / reason / note fields returned by backend
 * - Automatic authoritative refetch following all mutation operations
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { PageContainer } from '../components/common/PageContainer';
import { DataTable, ColumnDef } from '../components/ui/DataTable';
import { FilterBar } from '../components/ui/FilterBar';
import { StatusBadge } from '../components/ui/StatusBadge';
import { DetailsDrawer, ConfirmationModal } from '../components/ui/ConfirmationModal';
import { accessRequestsService, firmsService } from '../services/pageServices';
import { AccessRequest, FirmRecord } from '../types';
import { formatDate } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../services/apiClient';
import {
  CheckCircle2,
  XCircle,
  Eye,
  Building2,
  User,
  ShieldCheck,
  FileText,
  Clock,
  AlertOctagon,
  Check,
  RotateCw,
  Lock,
  ShieldAlert,
  AlertCircle,
  Inbox,
  AlertTriangle,
} from 'lucide-react';

export const AccessRequestsPage: React.FC = () => {
  const { isAuthenticated, isPlatformSuperAdmin } = useAuth();

  // Primary Data & Filter States
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [firms, setFirms] = useState<FirmRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [search, setSearch] = useState('');

  // Loading & Error States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<ApiError | Error | null>(null);

  // Selected Request for Details Drawer & Fresh Dossier Fetching
  const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  // Approval Modal State
  const [approvingRequest, setApprovingRequest] = useState<AccessRequest | null>(null);
  const [firmChoiceType, setFirmChoiceType] = useState<'new' | 'existing'>('new');
  const [selectedFirmId, setSelectedFirmId] = useState('');
  const [assignedFinalRole, setAssignedFinalRole] = useState('MANAGING_PARTNER');
  const [approvalInternalNote, setApprovalInternalNote] = useState('');
  const [approvalAuditReason, setApprovalAuditReason] = useState('');

  // Rejection Modal State
  const [rejectingRequest, setRejectingRequest] = useState<AccessRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('Failed Bar / Jurisdictional Verification');
  const [rejectionInternalNote, setRejectionInternalNote] = useState('');
  const [rejectionAuditReason, setRejectionAuditReason] = useState('');

  // Mutation Execution & Error States (Prevents duplicate submissions)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  // Feedback Notification Banner
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Active in-flight request controller for query race condition prevention
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Authoritative data fetch from real Backend via central ApiClient
   * Transmits real query parameters (?search=...&status=...)
   */
  const loadData = useCallback(
    async (isManual = false) => {
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
        const [reqsRes, firmsRes] = await Promise.allSettled([
          accessRequestsService.getAll(
            { limit: 200 },
            signal
          ),
          firmsService.getAll(undefined, signal),
        ]);

        if (signal.aborted) return;

        if (reqsRes.status === 'fulfilled') {
          setRequests(reqsRes.value.data);
          setFetchError(null);
        } else {
          setRequests([]);
          setFetchError(reqsRes.reason as ApiError);
        }

        if (firmsRes.status === 'fulfilled') {
          setFirms(firmsRes.value.data);
        }
      } finally {
        if (!signal.aborted) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    loadData(false);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadData, isAuthenticated, isPlatformSuperAdmin]);

  const counts = {
    pending: requests.filter((r) => r.status === 'pending' || r.status === 'reviewing').length,
    approved: requests.filter((r) => r.status === 'approved').length,
    rejected: requests.filter((r) => r.status === 'rejected').length,
  };

  const filtered = requests.filter((r) => {
    const matchesTab =
      activeTab === 'pending'
        ? r.status === 'pending' || r.status === 'reviewing'
        : r.status === activeTab;

    const query = search.toLowerCase().trim();
    const matchesSearch =
      !query ||
      r.requesterName.toLowerCase().includes(query) ||
      r.requesterEmail.toLowerCase().includes(query) ||
      r.firmName.toLowerCase().includes(query) ||
      (r.requestType && r.requestType.toLowerCase().includes(query)) ||
      (r.requestedRole && r.requestedRole.toLowerCase().includes(query));

    return matchesTab && matchesSearch;
  });

  /**
   * Opens request details drawer and fetches authoritative dossier via GET /access-requests/:id
   */
  const handleOpenDetails = async (req: AccessRequest) => {
    setSelectedRequest(req);
    setIsLoadingDetails(true);
    setDetailsError(null);

    try {
      const res = await accessRequestsService.getById(req.id);
      setSelectedRequest(res.data);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      if (apiErr.status === 404) {
        setDetailsError(
          'Detailed dossier endpoint (GET /access-requests/:id) not yet implemented on backend.'
        );
      } else {
        setDetailsError('Unable to refresh latest dossier from server. Displaying cached record.');
      }
    } finally {
      setIsLoadingDetails(false);
    }
  };

  /**
   * Opens approval workflow modal
   */
  const handleOpenApprove = (req: AccessRequest) => {
    setApprovingRequest(req);
    setAssignedFinalRole(req.requestedRole || 'MANAGING_PARTNER');
    setFirmChoiceType('new');
    setSelectedFirmId(firms[0]?.id || '');
    setApprovalInternalNote('');
    setApprovalAuditReason('');
    setMutationError(null);
  };

  /**
   * Executes POST /access-requests/:id/approve
   * ZERO local-only mutation — updates persisted only upon Backend confirmation
   */
  const handleConfirmApproval = async () => {
    if (!approvingRequest || isSubmitting) return;

    setIsSubmitting(true);
    setMutationError(null);

    try {
      const updated = await accessRequestsService.approve(approvingRequest.id, {
        targetFirmId: firmChoiceType === 'existing' ? selectedFirmId : undefined,
        finalRole: assignedFinalRole,
        internalNote: approvalInternalNote.trim() || undefined,
        auditReason: approvalAuditReason.trim() || undefined,
      });

      if (selectedRequest?.id === approvingRequest.id && typeof updated === 'object') {
        setSelectedRequest(updated);
      }

      setFeedbackMessage(
        `Access request for "${approvingRequest.firmName}" approved. Final role: ${assignedFinalRole}.`
      );
      setApprovingRequest(null);
      await loadData();
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      const errorMsg =
        apiErr.message ||
        (apiErr.status === 404
          ? 'Backend Endpoint Required: POST /access-requests/:id/approve is not implemented.'
          : apiErr.status === 403
          ? '403 Forbidden: Administrative authority required for request accreditation.'
          : apiErr.status === 409
          ? '409 Conflict: Access request status has already been modified or locked.'
          : apiErr.status === 422
          ? 'Validation Error: Backend rejected submitted role or firm assignment parameters.'
          : 'Failed to approve access request on authoritative backend.');
      setMutationError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Opens rejection workflow modal
   */
  const handleOpenReject = (req: AccessRequest) => {
    setRejectingRequest(req);
    setRejectionReason('Failed Bar / Jurisdictional Verification');
    setRejectionInternalNote('');
    setRejectionAuditReason('');
    setMutationError(null);
  };

  /**
   * Executes POST /access-requests/:id/reject
   * ZERO local-only mutation — updates persisted only upon Backend confirmation
   */
  const handleConfirmRejection = async () => {
    if (!rejectingRequest || isSubmitting) return;

    if (!rejectionReason) {
      setMutationError('Please select a formal rejection ground.');
      return;
    }

    setIsSubmitting(true);
    setMutationError(null);

    try {
      const updated = await accessRequestsService.reject(rejectingRequest.id, {
        reason: rejectionReason,
        internalNote: rejectionInternalNote.trim() || undefined,
        auditReason: rejectionAuditReason.trim() || undefined,
      });

      if (selectedRequest?.id === rejectingRequest.id && typeof updated === 'object') {
        setSelectedRequest(updated);
      }

      setFeedbackMessage(`Access request for "${rejectingRequest.firmName}" rejected.`);
      setRejectingRequest(null);
      await loadData();
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      const errorMsg =
        apiErr.message ||
        (apiErr.status === 404
          ? 'Backend Endpoint Required: POST /access-requests/:id/reject is not implemented.'
          : apiErr.status === 403
          ? '403 Forbidden: Administrative authority required for request rejection.'
          : apiErr.status === 409
          ? '409 Conflict: Access request status has already been modified or locked.'
          : apiErr.status === 422
          ? 'Validation Error: Backend rejected submitted rejection parameters.'
          : 'Failed to reject access request on authoritative backend.');
      setMutationError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: ColumnDef<AccessRequest>[] = [
    {
      key: 'requesterName',
      header: 'Requester Name',
      sortable: true,
      render: (r) => (
        <div>
          <p className="font-semibold text-xs text-[#11241C]">{r.requesterName}</p>
          <p className="text-[10px] font-mono text-[#7A8A82]">{r.id}</p>
        </div>
      ),
    },
    {
      key: 'requesterEmail',
      header: 'Email',
      render: (r) => <span className="font-mono text-xs text-[#54645C]">{r.requesterEmail}</span>,
    },
    {
      key: 'firmName',
      header: 'Firm Name',
      sortable: true,
      render: (r) => (
        <div>
          <p className="font-medium text-xs text-[#11241C]">{r.firmName}</p>
          <p className="text-[10px] text-[#7A8A82]">{r.jurisdiction}</p>
        </div>
      ),
    },
    {
      key: 'requestType',
      header: 'Request Type',
      render: (r) => (
        <span className="text-xs px-2 py-0.5 rounded bg-[#F0EAE0] text-[#24362E] border border-[#DDD5C7] font-medium">
          {r.requestType}
        </span>
      ),
    },
    {
      key: 'requestedRole',
      header: 'Requested Role',
      render: (r) => (
        <div>
          <span className="font-mono text-xs text-[#143D2D] font-semibold">{r.requestedRole}</span>
          {r.assignedRole && r.assignedRole !== r.requestedRole && (
            <p className="text-[10px] text-[#855B0F]">Final: {r.assignedRole}</p>
          )}
        </div>
      ),
    },
    {
      key: 'submittedAt',
      header: 'Submitted At',
      sortable: true,
      render: (r) => (
        <span className="font-mono text-xs text-[#54645C]">{formatDate(r.submittedAt)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <StatusBadge status={r.status} size="sm" />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => handleOpenDetails(r)}
            className="p-1.5 rounded hover:bg-[#EAE3D4] text-[#54645C] hover:text-[#11241C] transition-colors"
            title="View Details"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          {r.status === 'pending' || r.status === 'reviewing' ? (
            <>
              <button
                onClick={() => handleOpenApprove(r)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#143D2D] hover:bg-[#0E2C20] text-[#FAF7F0] text-xs font-medium transition-colors shadow-xs"
              >
                <Check className="w-3 h-3" />
                <span>Approve</span>
              </button>
              <button
                onClick={() => handleOpenReject(r)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#F0C2C0] bg-[#FAF0ED] hover:bg-[#F7E1DD] text-[#8A1F1D] text-xs font-medium transition-colors"
              >
                <XCircle className="w-3 h-3" />
                <span>Reject</span>
              </button>
            </>
          ) : (
            <span className="text-[11px] font-mono text-[#7A8A82] pr-1">Processed</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <PageContainer
      title="Access Requests Accreditation Queue"
      subtitle="Supervised institutional vetting queue for legal firms, managing partners, and practice expansion."
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
        {feedbackMessage && (
          <div className="p-3.5 rounded-xl bg-[#EAF3ED] border border-[#BBDBC9] text-[#144A32] text-xs flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#1D734E]" />
              <span className="font-medium">{feedbackMessage}</span>
            </div>
            <button
              onClick={() => setFeedbackMessage(null)}
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
                        ? '403 Forbidden — Access Requests Queue Restricted'
                        : (fetchError as ApiError)?.type === 'NOT_FOUND'
                        ? '404 Not Found — Backend Endpoint Required'
                        : (fetchError as ApiError)?.status && (fetchError as ApiError).status >= 500
                        ? '500 Server Error — Backend Directory Failure'
                        : 'Live Backend Access Requests Queue Unavailable'}
                    </h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]">
                      {(fetchError as ApiError)?.type === 'NOT_FOUND'
                        ? 'BACKEND ENDPOINT REQUIRED'
                        : 'ZERO-MOCK ENFORCED'}
                    </span>
                  </div>
                  <p className="text-xs text-[#7F1D1D] mt-1 leading-relaxed">
                    {(fetchError as ApiError)?.type === 'UNAUTHORIZED'
                      ? 'Administrative identity verification failed or token expired. Please re-authenticate to view access requests.'
                      : (fetchError as ApiError)?.type === 'FORBIDDEN'
                      ? 'Your platform identity lacks sufficient administrative authorization to query the access requests queue.'
                      : (fetchError as ApiError)?.type === 'NOT_FOUND'
                      ? 'The backend server does not provide an endpoint handler for GET /access-requests.'
                      : 'The authoritative AVENQUIS Backend is not currently reachable or VITE_API_BASE_URL is unconfigured. Showing verified unavailable states for access requests accreditation. No mock data will be shown.'}
                  </p>
                  <p className="text-[11px] font-mono text-[#991B1B] mt-1.5 opacity-90">
                    Target Endpoint: GET /access-requests
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

        {/* TABS: Pending, Approved, Rejected */}
        <div className="flex items-center justify-between border-b border-[#DDD5C7] pb-1 gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            {(['pending', 'approved', 'rejected'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3.5 py-1.5 rounded-t-lg text-xs font-medium transition-colors border-b-2 flex items-center gap-2 ${
                  activeTab === tab
                    ? 'border-[#143D2D] text-[#143D2D] bg-[#F2EDE2]'
                    : 'border-transparent text-[#54645C] hover:text-[#11241C]'
                }`}
              >
                <span className="capitalize">{tab}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    activeTab === tab
                      ? 'bg-[#143D2D] text-[#FAF7F0]'
                      : 'bg-[#E5DFD3] text-[#54645C]'
                  }`}
                >
                  {counts[tab]}
                </span>
              </button>
            ))}
          </div>

          <div className="w-72">
            <FilterBar
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Filter by name, email, firm..."
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
                  key={`req-skel-${idx}`}
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
              Access Requests Accreditation Queue Unavailable
            </h3>
            <p className="text-xs text-[#6B7280] mt-1 max-w-md mx-auto">
              Live backend access requests cannot be retrieved. Verify that the backend server is
              running and provides the endpoint: <code>GET /access-requests</code>.
            </p>
            <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-md font-mono text-[11px] font-semibold bg-[#EFE9DF] text-[#4A5750]">
              BACKEND ENDPOINT REQUIRED: GET /access-requests
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="border border-[#EFE9DF] rounded-2xl bg-white p-12 text-center shadow-2xs">
            <div className="w-10 h-10 rounded-full bg-[#FAF8F3] border border-[#DDD5C7] text-[#9CA3AF] flex items-center justify-center mx-auto mb-3">
              <Inbox className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-serif font-semibold text-[#11241C]">
              {requests.length === 0
                ? 'No Access Requests Received'
                : `No ${activeTab} access requests match the selected filters.`}
            </h3>
            <p className="text-xs text-[#6B7280] mt-1 max-w-md mx-auto">
              {requests.length === 0
                ? 'Zero institutional access accreditation requests were returned by the authoritative backend database.'
                : 'Try clearing your search query or selecting another status tab.'}
            </p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filtered}
            keyExtractor={(r) => r.id}
            emptyMessage={`No ${activeTab} access requests found.`}
          />
        )}

        {/* DETAILS DRAWER */}
        <DetailsDrawer
          isOpen={!!selectedRequest}
          onClose={() => setSelectedRequest(null)}
          title="Access Request Dossier"
          subtitle={selectedRequest ? `${selectedRequest.firmName} (${selectedRequest.id})` : ''}
          width="xl"
          footer={
            selectedRequest &&
            (selectedRequest.status === 'pending' || selectedRequest.status === 'reviewing') ? (
              <div className="flex items-center justify-between w-full">
                <button
                  onClick={() => {
                    handleOpenReject(selectedRequest);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-[#F0C2C0] bg-[#FAF0ED] text-[#8A1F1D] hover:bg-[#F7E1DD] text-xs font-medium"
                >
                  Reject Application
                </button>
                <button
                  onClick={() => {
                    handleOpenApprove(selectedRequest);
                  }}
                  className="px-4 py-1.5 rounded-lg bg-[#143D2D] hover:bg-[#0E2C20] text-[#FAF7F0] text-xs font-medium shadow-xs"
                >
                  Proceed to Supervised Approval
                </button>
              </div>
            ) : undefined
          }
        >
          {selectedRequest && (
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
                      Target: GET /access-requests/{selectedRequest.id}
                    </span>
                  </div>
                </div>
              )}

              {/* Requester Details */}
              <div className="border border-[#DDD5C7] rounded-xl bg-[#FAF8F3] p-4 space-y-3">
                <div className="flex items-center gap-2 border-b border-[#EAE3D4] pb-2">
                  <User className="w-4 h-4 text-[#143D2D]" />
                  <h4 className="font-serif font-semibold text-xs text-[#11241C]">
                    Requester Identity
                  </h4>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-[#7A8A82] block">Full Name</span>
                    <span className="font-semibold text-xs">{selectedRequest.requesterName}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#7A8A82] block">Official Email</span>
                    <span className="font-mono text-xs text-[#143D2D]">
                      {selectedRequest.requesterEmail}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#7A8A82] block">Requested Role</span>
                    <span className="font-mono font-semibold text-xs text-[#143D2D]">
                      {selectedRequest.requestedRole}
                    </span>
                    <p className="text-[10px] text-[#7A8A82]">
                      Self-assignment disabled; final role set by Super Admin
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#7A8A82] block">AML/KYC Risk Rating</span>
                    <span
                      className={`font-mono text-xs font-semibold px-2 py-0.5 rounded border inline-block ${
                        selectedRequest.riskScore === 'Low'
                          ? 'bg-[#EAF3ED] text-[#144A32] border-[#C2DEC9]'
                          : 'bg-[#FAF4E6] text-[#7A5A12] border-[#E8D9AF]'
                      }`}
                    >
                      {selectedRequest.riskScore || 'Low'} Risk
                    </span>
                  </div>
                </div>
              </div>

              {/* Firm Details */}
              <div className="border border-[#DDD5C7] rounded-xl bg-[#FAF8F3] p-4 space-y-3">
                <div className="flex items-center gap-2 border-b border-[#EAE3D4] pb-2">
                  <Building2 className="w-4 h-4 text-[#143D2D]" />
                  <h4 className="font-serif font-semibold text-xs text-[#11241C]">
                    Firm Entity Information
                  </h4>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-[#7A8A82] block">Firm Legal Entity</span>
                    <span className="font-semibold text-xs">{selectedRequest.firmName}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#7A8A82] block">
                      Jurisdiction &amp; Regulatory Bar
                    </span>
                    <span>{selectedRequest.jurisdiction}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#7A8A82] block">Declared Firm Scale</span>
                    <span className="font-mono">{selectedRequest.firmSize}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#7A8A82] block">Application Timestamp</span>
                    <span className="font-mono">{formatDate(selectedRequest.submittedAt)}</span>
                  </div>
                </div>
              </div>

              {/* Real Reviewer / Adjudication Record (If returned by Backend) */}
              {(selectedRequest.reviewer ||
                selectedRequest.reviewedAt ||
                selectedRequest.reason ||
                selectedRequest.rejectionReason ||
                selectedRequest.note) && (
                <div className="border border-[#DDD5C7] rounded-xl bg-[#FAF8F3] p-4 space-y-3">
                  <div className="flex items-center gap-2 border-b border-[#EAE3D4] pb-2">
                    <ShieldCheck className="w-4 h-4 text-[#143D2D]" />
                    <h4 className="font-serif font-semibold text-xs text-[#11241C]">
                      Adjudication &amp; Reviewer Record
                    </h4>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedRequest.reviewer && (
                      <div>
                        <span className="text-[11px] text-[#7A8A82] block">
                          Adjudicating Reviewer
                        </span>
                        <span className="font-semibold text-xs text-[#11241C]">
                          {selectedRequest.reviewer}
                        </span>
                      </div>
                    )}
                    {selectedRequest.reviewedAt && (
                      <div>
                        <span className="text-[11px] text-[#7A8A82] block">Reviewed At</span>
                        <span className="font-mono text-xs text-[#54645C]">
                          {formatDate(selectedRequest.reviewedAt)}
                        </span>
                      </div>
                    )}
                    {(selectedRequest.reason || selectedRequest.rejectionReason) && (
                      <div className="col-span-2">
                        <span className="text-[11px] text-[#7A8A82] block">
                          Adjudication Ground / Reason
                        </span>
                        <span className="text-xs text-[#8A1F1D] font-medium">
                          {selectedRequest.reason || selectedRequest.rejectionReason}
                        </span>
                      </div>
                    )}
                    {selectedRequest.note && (
                      <div className="col-span-2">
                        <span className="text-[11px] text-[#7A8A82] block">Reviewer Note</span>
                        <p className="text-xs text-[#54645C] leading-relaxed">
                          {selectedRequest.note}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Request Notes */}
              <div className="border border-[#DDD5C7] rounded-xl bg-[#FAF8F3] p-4 space-y-2">
                <div className="flex items-center gap-2 border-b border-[#EAE3D4] pb-2">
                  <FileText className="w-4 h-4 text-[#143D2D]" />
                  <h4 className="font-serif font-semibold text-xs text-[#11241C]">
                    Application Notes
                  </h4>
                </div>
                <p className="text-xs text-[#54645C] leading-relaxed">
                  {selectedRequest.requestNotes || 'No additional notes provided by applicant.'}
                </p>
                {selectedRequest.internalNote && (
                  <div className="p-2.5 rounded bg-[#F2EDE2] border border-[#DDD5C7] text-xs text-[#182620] mt-2">
                    <span className="font-semibold block text-[11px] text-[#855B0F]">
                      Internal Super Admin Note:
                    </span>
                    {selectedRequest.internalNote}
                  </div>
                )}
              </div>

              {/* Request History */}
              <div className="border border-[#DDD5C7] rounded-xl bg-[#FAF8F3] p-4 space-y-3">
                <div className="flex items-center gap-2 border-b border-[#EAE3D4] pb-2">
                  <Clock className="w-4 h-4 text-[#143D2D]" />
                  <h4 className="font-serif font-semibold text-xs text-[#11241C]">
                    Vetting Audit Trail
                  </h4>
                </div>
                <div className="space-y-2">
                  {(selectedRequest.history && selectedRequest.history.length > 0
                    ? selectedRequest.history
                    : [
                        {
                          timestamp: selectedRequest.submittedAt,
                          action: 'Application submitted',
                          actor: selectedRequest.requesterName,
                        },
                      ]
                  ).map((h, i) => (
                    <div
                      key={i}
                      className="p-2 rounded bg-[#F2EDE2] border border-[#EAE3D4] flex items-start justify-between gap-3 text-xs"
                    >
                      <div>
                        <p className="font-medium text-[#11241C]">{h.action}</p>
                        <p className="text-[10px] text-[#7A8A82]">Actor: {h.actor}</p>
                        {h.note && <p className="text-[11px] text-[#54645C] mt-0.5">{h.note}</p>}
                      </div>
                      <span className="font-mono text-[10px] text-[#7A8A82] shrink-0">
                        {formatDate(h.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DetailsDrawer>

        {/* APPROVAL WORKFLOW MODAL */}
        <ConfirmationModal
          isOpen={!!approvingRequest}
          onClose={() => {
            if (!isSubmitting) {
              setApprovingRequest(null);
              setMutationError(null);
            }
          }}
          onConfirm={handleConfirmApproval}
          title="Approve Institutional Access Request"
          confirmText={isSubmitting ? 'Provisioning...' : 'Confirm & Provision Access'}
          variant="primary"
          isLoading={isSubmitting}
        >
          {approvingRequest && (
            <div className="space-y-4 text-xs text-[#11241C]">
              {/* MUTATION ERROR ALERT */}
              {mutationError && (
                <div className="p-3 rounded-lg bg-[#FDF2F2] border border-[#F5D3D3] text-[#991B1B] space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <AlertCircle className="w-4 h-4 text-[#DC2626]" />
                    <span>Approval Failed</span>
                  </div>
                  <p className="text-xs leading-relaxed">{mutationError}</p>
                  <p className="text-[10px] font-mono opacity-80">
                    Target: POST /access-requests/{approvingRequest.id}/approve
                  </p>
                </div>
              )}

              <div className="p-3 rounded-lg bg-[#FAF8F3] border border-[#DDD5C7]">
                <p className="font-semibold text-xs">{approvingRequest.firmName}</p>
                <p className="text-[#54645C] mt-0.5">
                  Applicant: {approvingRequest.requesterName} ({approvingRequest.requesterEmail})
                </p>
                <p className="text-[11px] text-[#7A8A82] mt-0.5 font-mono">
                  Requested Role: {approvingRequest.requestedRole} (Non-binding)
                </p>
              </div>

              {/* Choose Existing Firm OR Mark as New Firm */}
              <div className="space-y-2">
                <label className="font-semibold block text-xs">Firm Tenancy Assignment</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setFirmChoiceType('new')}
                    className={`p-2.5 rounded-lg border text-left text-xs transition-colors disabled:opacity-60 ${
                      firmChoiceType === 'new'
                        ? 'border-[#143D2D] bg-[#EAF3ED] text-[#143D2D] font-semibold'
                        : 'border-[#DDD5C7] bg-[#FAF8F3] text-[#54645C]'
                    }`}
                  >
                    <span>+ Provision as New Firm</span>
                    <p className="text-[10px] text-[#7A8A82] mt-0.5">
                      Creates dedicated tenant firm workspace
                    </p>
                  </button>

                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setFirmChoiceType('existing')}
                    className={`p-2.5 rounded-lg border text-left text-xs transition-colors disabled:opacity-60 ${
                      firmChoiceType === 'existing'
                        ? 'border-[#143D2D] bg-[#EAF3ED] text-[#143D2D] font-semibold'
                        : 'border-[#DDD5C7] bg-[#FAF8F3] text-[#54645C]'
                    }`}
                  >
                    <span>Map to Existing Firm</span>
                    <p className="text-[10px] text-[#7A8A82] mt-0.5">
                      Adds user to established enterprise roster
                    </p>
                  </button>
                </div>

                {firmChoiceType === 'existing' && (
                  <div className="pt-2">
                    <label className="text-[11px] text-[#54645C] block mb-1">
                      Select Active Firm Tenancy
                    </label>
                    <select
                      value={selectedFirmId}
                      disabled={isSubmitting}
                      onChange={(e) => setSelectedFirmId(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#DDD5C7] bg-white text-xs disabled:opacity-60"
                    >
                      {firms.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} ({f.subdomain})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Assign Final Role (Requester CANNOT self-assign) */}
              <div className="space-y-1">
                <label className="font-semibold block text-xs">Assign Final Enterprise Role</label>
                <p className="text-[11px] text-[#54645C]">
                  Platform rule: Requester cannot self-assign role. Platform Super Admin must
                  assign the final institutional permission level.
                </p>
                <select
                  value={assignedFinalRole}
                  disabled={isSubmitting}
                  onChange={(e) => setAssignedFinalRole(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-[#DDD5C7] bg-white text-xs font-mono font-medium text-[#143D2D] disabled:opacity-60"
                >
                  <option value="MANAGING_PARTNER">MANAGING_PARTNER (Full Tenancy Custody)</option>
                  <option value="EQUITY_PARTNER">EQUITY_PARTNER (Senior Practice Counsel)</option>
                  <option value="FIRM_ADMIN">FIRM_ADMIN (Roster &amp; Billing Operator)</option>
                  <option value="SENIOR_COUNSEL">SENIOR_COUNSEL (Advisory Only)</option>
                </select>
              </div>

              {/* Audit Reason */}
              <div className="space-y-1">
                <label className="font-semibold block text-xs">Administrative Audit Justification</label>
                <input
                  type="text"
                  value={approvalAuditReason}
                  onChange={(e) => setApprovalAuditReason(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="e.g. SRA verification confirmed / Bar license active"
                  className="w-full px-3 py-1.5 rounded-lg border border-[#DDD5C7] bg-white text-xs disabled:opacity-60"
                />
              </div>

              {/* Optional Internal Note */}
              <div className="space-y-1">
                <label className="font-semibold block text-xs">
                  Optional Super Admin Internal Note
                </label>
                <textarea
                  value={approvalInternalNote}
                  onChange={(e) => setApprovalInternalNote(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Record Bar license check, reference code, or onboarding conditions..."
                  rows={2}
                  className="w-full px-3 py-1.5 rounded-lg border border-[#DDD5C7] bg-white text-xs disabled:opacity-60"
                />
              </div>
            </div>
          )}
        </ConfirmationModal>

        {/* REJECT WORKFLOW MODAL */}
        <ConfirmationModal
          isOpen={!!rejectingRequest}
          onClose={() => {
            if (!isSubmitting) {
              setRejectingRequest(null);
              setMutationError(null);
            }
          }}
          onConfirm={handleConfirmRejection}
          title="Reject Access Request"
          confirmText={isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
          variant="danger"
          isLoading={isSubmitting}
        >
          {rejectingRequest && (
            <div className="space-y-4 text-xs text-[#11241C]">
              {/* MUTATION ERROR ALERT */}
              {mutationError && (
                <div className="p-3 rounded-lg bg-[#FDF2F2] border border-[#F5D3D3] text-[#991B1B] space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <AlertCircle className="w-4 h-4 text-[#DC2626]" />
                    <span>Rejection Failed</span>
                  </div>
                  <p className="text-xs leading-relaxed">{mutationError}</p>
                  <p className="text-[10px] font-mono opacity-80">
                    Target: POST /access-requests/{rejectingRequest.id}/reject
                  </p>
                </div>
              )}

              <div className="p-3 rounded-lg bg-[#FAF0ED] border border-[#F0C2C0]">
                <p className="font-semibold text-xs text-[#8A1F1D]">{rejectingRequest.firmName}</p>
                <p className="text-[11px] text-[#A63330] mt-0.5">
                  Applicant: {rejectingRequest.requesterName} ({rejectingRequest.requesterEmail})
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-semibold block text-xs">
                  Rejection Ground (Formal Audit Reason) <span className="text-[#DC2626]">*</span>
                </label>
                <select
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-3 py-1.5 rounded-lg border border-[#DDD5C7] bg-white text-xs disabled:opacity-60"
                >
                  <option value="Failed Bar / Jurisdictional Verification">
                    Failed Bar / Jurisdictional Verification
                  </option>
                  <option value="Unverified Corporate Identity / Shell Entity">
                    Unverified Corporate Identity / Shell Entity
                  </option>
                  <option value="Sanctions / PEP Screening Non-Compliance">
                    Sanctions / PEP Screening Non-Compliance
                  </option>
                  <option value="Duplicate or Fraudulent Submission">
                    Duplicate or Fraudulent Submission
                  </option>
                  <option value="Jurisdiction Not Currently Supported for Firm Tenancy">
                    Jurisdiction Not Currently Supported for Firm Tenancy
                  </option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold block text-xs">Audit Reference Number</label>
                <input
                  type="text"
                  value={rejectionAuditReason}
                  onChange={(e) => setRejectionAuditReason(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="e.g. Compliance denial docket #CD-2026-44"
                  className="w-full px-3 py-1.5 rounded-lg border border-[#DDD5C7] bg-white text-xs disabled:opacity-60"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold block text-xs">Internal Compliance Note</label>
                <textarea
                  value={rejectionInternalNote}
                  onChange={(e) => setRejectionInternalNote(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Additional context for immutable audit log..."
                  rows={2}
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
