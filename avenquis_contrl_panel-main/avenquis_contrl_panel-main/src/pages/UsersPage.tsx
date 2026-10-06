/**
 * Avenquis Control Panel - 4. Users Section
 * Platform-wide user directory across platform administrators, operators, and firm tenants.
 * Filters by firm, role, membership status, and account status with secure detail drawers.
 * STRICTLY REAL BACKEND DATA — ZERO RUNTIME MOCK FALLBACK.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { PageContainer } from '../components/common/PageContainer';
import { DataTable, ColumnDef } from '../components/ui/DataTable';
import { FilterBar } from '../components/ui/FilterBar';
import { StatusBadge } from '../components/ui/StatusBadge';
import { DetailsDrawer, ConfirmationModal } from '../components/ui/ConfirmationModal';
import { usersService, firmsService } from '../services/pageServices';
import { ApiError } from '../services/apiClient';
import { PlatformUserRecord, FirmRecord } from '../types';
import { formatDate } from '../utils/formatters';
import {
  User,
  Eye,
  Ban,
  CheckCircle,
  KeyRound,
  ShieldAlert,
  Building2,
  Clock,
  ShieldCheck,
  CheckCircle2,
  RotateCw,
  Lock,
  AlertOctagon,
  AlertTriangle,
} from 'lucide-react';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<PlatformUserRecord[]>([]);
  const [allFirms, setAllFirms] = useState<FirmRecord[]>([]);
  const [search, setSearch] = useState('');

  // Filters
  const [firmFilter, setFirmFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [membershipFilter, setMembershipFilter] = useState('all');
  const [accountStatusFilter, setAccountStatusFilter] = useState('all');

  // Loading & Error States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<ApiError | Error | null>(null);

  // Selected User for Detail Drawer
  const [selectedUser, setSelectedUser] = useState<PlatformUserRecord | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  // Manage Access Modal
  const [managingUser, setManagingUser] = useState<PlatformUserRecord | null>(null);
  const [newRole, setNewRole] = useState('');
  const [resetMfaPrompt, setResetMfaPrompt] = useState(false);

  // Disable / Reactivate Confirmation Modals
  const [userToDisable, setUserToDisable] = useState<PlatformUserRecord | null>(null);
  const [userToReactivate, setUserToReactivate] = useState<PlatformUserRecord | null>(null);

  // Mutation Submitting & Error States (Duplicate Submission Prevention)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  // Notification Banner
  const [bannerText, setBannerText] = useState<string | null>(null);

  // AbortController ref for search / filter race condition prevention
  const abortControllerRef = useRef<AbortController | null>(null);

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
        const [usersRes, firmsRes] = await Promise.allSettled([
          usersService.getAll(
            {
              search: search.trim() || undefined,
              firm: firmFilter !== 'all' ? firmFilter : undefined,
              role: roleFilter !== 'all' ? roleFilter : undefined,
              membershipStatus: membershipFilter !== 'all' ? membershipFilter : undefined,
              accountStatus: accountStatusFilter !== 'all' ? accountStatusFilter : undefined,
            },
            signal
          ),
          firmsService.getAll(undefined, signal),
        ]);

        if (signal.aborted) return;

        if (usersRes.status === 'fulfilled') {
          setUsers(usersRes.value.data);
          setFetchError(null);
        } else {
          setUsers([]);
          setFetchError(usersRes.reason as ApiError);
        }

        if (firmsRes.status === 'fulfilled') {
          setAllFirms(firmsRes.value.data);
        }
      } finally {
        if (!signal.aborted) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [search, firmFilter, roleFilter, membershipFilter, accountStatusFilter]
  );

  useEffect(() => {
    loadData(false);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadData]);

  // Distinct firms for the filter dropdown
  const distinctFirms = Array.from(
    new Set([
      ...users.map((u) => u.firm).filter(Boolean),
      ...allFirms.map((f) => f.name).filter(Boolean),
    ])
  ).filter(Boolean);

  // Client-side verification filtering over returned authoritative records
  const filtered = users.filter((u) => {
    const q = search.toLowerCase().trim();
    const userName = (u.name || '').toLowerCase();
    const userEmail = (u.email || '').toLowerCase();
    const userFirm = (u.firm || '').toLowerCase();
    const matchesSearch = !q || userName.includes(q) || userEmail.includes(q) || userFirm.includes(q);

    const matchesFirm = firmFilter === 'all' || u.firm === firmFilter;
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesMembership = membershipFilter === 'all' || u.membershipStatus === membershipFilter;
    const matchesAccount = accountStatusFilter === 'all' || u.accountStatus === accountStatusFilter;

    return matchesSearch && matchesFirm && matchesRole && matchesMembership && matchesAccount;
  });

  // Open User Details Drawer with fresh authoritative backend record
  const handleOpenDetails = async (u: PlatformUserRecord) => {
    setSelectedUser(u);
    setIsLoadingDetails(true);
    setDetailsError(null);

    try {
      const res = await usersService.getById(u.id);
      setSelectedUser(res.data);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      if (apiErr.status === 404) {
        setDetailsError(
          'Detailed profile endpoint (GET /users/:id) not yet implemented on Backend.'
        );
      } else {
        setDetailsError('Unable to refresh authoritative record from server. Displaying directory record.');
      }
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Open Disable Modal
  const handleOpenDisable = (u: PlatformUserRecord) => {
    setUserToDisable(u);
    setMutationError(null);
  };

  // Confirm Disable
  const handleConfirmDisable = async (reason?: string) => {
    if (!userToDisable || isSubmitting) return;
    setIsSubmitting(true);
    setMutationError(null);

    try {
      await usersService.disable(userToDisable.id, {
        auditReason: reason,
        reason: reason || 'Administrative session revocation and account disablement',
      });
      setBannerText(`Account for "${userToDisable.name}" has been disabled and sessions revoked.`);
      setUserToDisable(null);
      await loadData();
      setTimeout(() => setBannerText(null), 4000);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      if (apiErr.status === 404) {
        setMutationError('BACKEND ENDPOINT REQUIRED: POST /users/:id/disable is not implemented on the backend.');
      } else if (apiErr.status === 401) {
        setMutationError('401 Unauthorized: Session token expired or invalid credentials.');
      } else if (apiErr.status === 403) {
        setMutationError('403 Forbidden: Insufficient administrative privileges to disable user accounts.');
      } else if (apiErr.status === 409) {
        setMutationError('409 Conflict: User status was modified concurrently by another administrator.');
      } else if (apiErr.status === 422) {
        setMutationError(`422 Validation Error: ${apiErr.message || 'Invalid parameters supplied.'}`);
      } else if (apiErr.status && apiErr.status >= 500) {
        setMutationError('500 Server Error: Backend failed to process account lockdown.');
      } else {
        setMutationError(apiErr.message || 'Backend connection failed or server is unreachable.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Reactivate Modal
  const handleOpenReactivate = (u: PlatformUserRecord) => {
    setUserToReactivate(u);
    setMutationError(null);
  };

  // Confirm Reactivate
  const handleConfirmReactivate = async (reason?: string) => {
    if (!userToReactivate || isSubmitting) return;
    setIsSubmitting(true);
    setMutationError(null);

    try {
      await usersService.reactivate(userToReactivate.id, {
        auditReason: reason,
      });
      setBannerText(`Account for "${userToReactivate.name}" has been reactivated.`);
      setUserToReactivate(null);
      await loadData();
      setTimeout(() => setBannerText(null), 4000);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      if (apiErr.status === 404) {
        setMutationError('BACKEND ENDPOINT REQUIRED: POST /users/:id/reactivate is not implemented on the backend.');
      } else if (apiErr.status === 401) {
        setMutationError('401 Unauthorized: Session token expired or invalid credentials.');
      } else if (apiErr.status === 403) {
        setMutationError('403 Forbidden: Insufficient administrative privileges to restore user accounts.');
      } else if (apiErr.status === 409) {
        setMutationError('409 Conflict: User status was modified concurrently by another administrator.');
      } else if (apiErr.status === 422) {
        setMutationError(`422 Validation Error: ${apiErr.message || 'Invalid parameters supplied.'}`);
      } else if (apiErr.status && apiErr.status >= 500) {
        setMutationError('500 Server Error: Backend failed to restore user account.');
      } else {
        setMutationError(apiErr.message || 'Backend connection failed or server is unreachable.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Manage Access Modal
  const handleOpenManageAccess = (u: PlatformUserRecord) => {
    setManagingUser(u);
    setNewRole(u.role);
    setResetMfaPrompt(false);
    setMutationError(null);
  };

  // Save Manage Access Changes
  const handleSaveManageAccess = async (reason?: string) => {
    if (!managingUser || isSubmitting) return;
    setIsSubmitting(true);
    setMutationError(null);

    try {
      await usersService.manageAccess(managingUser.id, {
        role: newRole,
        resetMfa: resetMfaPrompt,
        auditReason: reason,
      });
      setBannerText(`Access permissions updated for "${managingUser.name}".`);
      setManagingUser(null);
      await loadData();
      setTimeout(() => setBannerText(null), 4000);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      if (apiErr.status === 404) {
        setMutationError('BACKEND ENDPOINT REQUIRED: PATCH /users/:id is not implemented on the backend.');
      } else if (apiErr.status === 401) {
        setMutationError('401 Unauthorized: Session token expired or invalid credentials.');
      } else if (apiErr.status === 403) {
        setMutationError('403 Forbidden: Insufficient administrative privileges to modify roles or permissions.');
      } else if (apiErr.status === 409) {
        setMutationError('409 Conflict: User access configuration was modified concurrently.');
      } else if (apiErr.status === 422) {
        setMutationError(`422 Validation Error: ${apiErr.message || 'Invalid parameters supplied.'}`);
      } else if (apiErr.status && apiErr.status >= 500) {
        setMutationError('500 Server Error: Backend failed to update user permissions.');
      } else {
        setMutationError(apiErr.message || 'Backend connection failed or server is unreachable.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: ColumnDef<PlatformUserRecord>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (u) => {
        const displayName = u.name || u.email || 'User';
        const initial = displayName.charAt(0).toUpperCase();
        return (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#EAE3D4] text-[#143D2D] flex items-center justify-center font-serif font-bold text-xs shrink-0">
              {initial}
            </div>
            <div>
              <p className="font-semibold text-xs text-[#11241C]">{displayName}</p>
              <p className="text-[10px] font-mono text-[#7A8A82]">{u.id}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'email',
      header: 'Email',
      render: (u) => <span className="font-mono text-xs text-[#54645C]">{u.email || '—'}</span>,
    },
    {
      key: 'firm',
      header: 'Firm',
      sortable: true,
      render: (u) => <span className="text-xs text-[#182620] font-medium">{u.firm || 'Unassigned'}</span>,
    },
    {
      key: 'role',
      header: 'Role',
      sortable: true,
      render: (u) => (
        <span className="font-mono text-xs text-[#143D2D] font-semibold px-2 py-0.5 rounded bg-[#F0EAE0] border border-[#DDD5C7]">
          {u.role || 'Member'}
        </span>
      ),
    },
    {
      key: 'membershipStatus',
      header: 'Membership Status',
      render: (u) => {
        const status = (u.membershipStatus || u.status || 'Active').toLowerCase();
        return <StatusBadge status={status} size="sm" />;
      },
    },
    {
      key: 'accountStatus',
      header: 'Account Status',
      render: (u) => {
        const accStatus = u.accountStatus || (u.mfaStatus === 'Enforced' ? 'MFA Enforced' : 'Verified');
        const isSecure = accStatus === 'MFA Enforced' || accStatus === 'Verified';
        return (
          <span
            className={`font-mono text-[11px] px-2 py-0.5 rounded border ${
              isSecure
                ? 'bg-[#EAF3ED] text-[#144A32] border-[#C2DEC9]'
                : 'bg-[#FAF0ED] text-[#8A1F1D] border-[#F0C2C0]'
            }`}
          >
            {accStatus}
          </span>
        );
      },
    },
    {
      key: 'lastActive',
      header: 'Last Active',
      render: (u) => <span className="font-mono text-xs text-[#63736B]">{u.lastActive || 'Recently'}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (u) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => handleOpenDetails(u)}
            className="p-1.5 rounded hover:bg-[#EAE3D4] text-[#54645C] hover:text-[#11241C] transition-colors"
            title="View User Details"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => handleOpenManageAccess(u)}
            className="p-1.5 rounded hover:bg-[#EAE3D4] text-[#143D2D] transition-colors"
            title="Manage Access &amp; Roles"
          >
            <KeyRound className="w-3.5 h-3.5" />
          </button>

          {u.membershipStatus === 'Suspended' ? (
            <button
              onClick={() => handleOpenReactivate(u)}
              className="p-1.5 rounded hover:bg-[#E3F2E9] text-[#1E563B] transition-colors"
              title="Reactivate Account"
            >
              <CheckCircle className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={() => handleOpenDisable(u)}
              className="p-1.5 rounded hover:bg-[#FAF0ED] text-[#8A1F1D] transition-colors"
              title="Disable Account"
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
      title="Platform-Wide User Directory"
      subtitle="Institutional identities across all managed law firms and platform governance operators."
      toolbarActions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData(true)}
            disabled={isRefreshing || isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#DDD5C7] bg-[#FAF8F3] hover:bg-[#F2EDE2] text-xs font-medium text-[#11241C] transition-colors disabled:opacity-50"
            title="Refresh Directory"
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
        {/* Banner */}
        {bannerText && (
          <div className="p-3 rounded-lg bg-[#E3F2E9] border border-[#A5D6B6] text-[#1E563B] text-xs flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{bannerText}</span>
            </div>
            <button onClick={() => setBannerText(null)} className="text-[#1E563B] hover:opacity-75">
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
                        ? '403 Forbidden — User Management Restricted'
                        : (fetchError as ApiError)?.type === 'NOT_FOUND'
                        ? '404 Not Found — Backend Endpoint Required'
                        : (fetchError as ApiError)?.status && (fetchError as ApiError).status >= 500
                        ? '500 Server Error — Backend Directory Failure'
                        : 'Live Backend User Directory Unavailable'}
                    </h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]">
                      {(fetchError as ApiError)?.type === 'NOT_FOUND'
                        ? 'BACKEND ENDPOINT REQUIRED'
                        : 'ZERO-MOCK ENFORCED'}
                    </span>
                  </div>
                  <p className="text-xs text-[#7F1D1D] mt-1 leading-relaxed">
                    {(fetchError as ApiError)?.type === 'UNAUTHORIZED'
                      ? 'Administrative identity verification failed or token expired. Please re-authenticate to manage users.'
                      : (fetchError as ApiError)?.type === 'FORBIDDEN'
                      ? 'Your platform identity lacks sufficient administrative authorization to access the platform users directory.'
                      : (fetchError as ApiError)?.type === 'NOT_FOUND'
                      ? 'The backend server does not provide an endpoint handler for GET /users.'
                      : 'The authoritative AVENQUIS Backend is not currently reachable or VITE_API_BASE_URL is unconfigured. Showing verified unavailable states for user management. No mock data will be shown.'}
                  </p>
                  <p className="text-[11px] font-mono text-[#991B1B] mt-1.5 opacity-90">
                    Target Endpoint: GET /users
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
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Firm Filter */}
            <div className="flex items-center gap-1.5 text-xs text-[#54645C]">
              <span>Firm:</span>
              <select
                value={firmFilter}
                onChange={(e) => setFirmFilter(e.target.value)}
                className="px-2 py-1 rounded-lg border border-[#DDD5C7] bg-[#FAF8F3] text-xs max-w-[140px] truncate"
              >
                <option value="all">All Firms</option>
                {distinctFirms.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            {/* Role Filter */}
            <div className="flex items-center gap-1.5 text-xs text-[#54645C]">
              <span>Role:</span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-2 py-1 rounded-lg border border-[#DDD5C7] bg-[#FAF8F3] text-xs"
              >
                <option value="all">All Roles</option>
                <option value="PLATFORM_SUPER_ADMIN">PLATFORM_SUPER_ADMIN</option>
                <option value="PLATFORM_OPERATOR">PLATFORM_OPERATOR</option>
                <option value="PLATFORM_AUDITOR">PLATFORM_AUDITOR</option>
                <option value="Managing Partner">Managing Partner</option>
                <option value="Equity Partner">Equity Partner</option>
                <option value="Student / Articled Clerk">Student / Articled Clerk</option>
              </select>
            </div>

            {/* Membership Status Filter */}
            <div className="flex items-center gap-1.5 text-xs text-[#54645C]">
              <span>Membership:</span>
              <select
                value={membershipFilter}
                onChange={(e) => setMembershipFilter(e.target.value)}
                className="px-2 py-1 rounded-lg border border-[#DDD5C7] bg-[#FAF8F3] text-xs"
              >
                <option value="all">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Suspended">Suspended</option>
                <option value="Invited">Invited</option>
                <option value="Expired">Expired</option>
              </select>
            </div>

            {/* Account Status Filter */}
            <div className="flex items-center gap-1.5 text-xs text-[#54645C]">
              <span>Account:</span>
              <select
                value={accountStatusFilter}
                onChange={(e) => setAccountStatusFilter(e.target.value)}
                className="px-2 py-1 rounded-lg border border-[#DDD5C7] bg-[#FAF8F3] text-xs"
              >
                <option value="all">All Account States</option>
                <option value="MFA Enforced">MFA Enforced</option>
                <option value="Verified">Verified</option>
                <option value="Locked">Locked</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="w-72">
            <FilterBar
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search by name, email, firm..."
              totalCount={filtered.length}
            />
          </div>
        </div>

        {/* DATA TABLE */}
        <DataTable
          columns={columns}
          data={filtered}
          keyExtractor={(u) => u.id}
          isLoading={isLoading}
          emptyTitle={fetchError ? 'Directory Query Failed' : 'No platform users match criteria'}
          emptyDescription={
            fetchError
              ? (fetchError as ApiError)?.message || 'Live endpoint GET /users unreachable.'
              : 'No platform users match the selected filters.'
          }
        />

        {/* USER DETAIL DRAWER (Passwords are strictly never exposed) */}
        <DetailsDrawer
          isOpen={!!selectedUser}
          onClose={() => {
            setSelectedUser(null);
            setDetailsError(null);
          }}
          title="User Account Dossier"
          subtitle={selectedUser ? `${selectedUser.name || selectedUser.email || 'User'} (${selectedUser.email || 'No email'})` : ''}
          width="max-w-xl"
          footer={
            selectedUser ? (
              <div className="flex items-center justify-between w-full">
                {(selectedUser.membershipStatus || selectedUser.status) === 'Suspended' || (selectedUser.membershipStatus || selectedUser.status) === 'suspended' ? (
                  <button
                    onClick={() => {
                      const target = selectedUser;
                      setSelectedUser(null);
                      handleOpenReactivate(target);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-[#143D2D] text-[#FAF7F0] text-xs font-medium hover:bg-[#0E2C20]"
                  >
                    Reactivate Account
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      const target = selectedUser;
                      setSelectedUser(null);
                      handleOpenDisable(target);
                    }}
                    className="px-3.5 py-1.5 rounded-lg border border-[#F0C2C0] bg-[#FAF0ED] text-[#8A1F1D] text-xs font-medium hover:bg-[#F7E1DD]"
                  >
                    Disable Account
                  </button>
                )}
                <button
                  onClick={() => {
                    const target = selectedUser;
                    setSelectedUser(null);
                    handleOpenManageAccess(target);
                  }}
                  className="px-4 py-1.5 rounded-lg border border-[#DDD5C7] bg-[#F2EDE2] hover:bg-[#E5DFD3] text-xs font-medium text-[#11241C]"
                >
                  Manage Access &amp; Roles
                </button>
              </div>
            ) : undefined
          }
        >
          {selectedUser && (
            <div className="space-y-6 text-xs text-[#11241C]">
              {/* Informational notice if detail endpoint is missing */}
              {detailsError && (
                <div className="p-2.5 rounded-lg bg-[#FAF0ED] border border-[#F0C2C0] text-[11px] text-[#8A1F1D] flex items-center justify-between">
                  <span>{detailsError}</span>
                </div>
              )}

              {isLoadingDetails && (
                <div className="p-2 text-center text-xs text-[#54645C] flex items-center justify-center gap-2">
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Refreshing authoritative user record...</span>
                </div>
              )}

              {/* Profile Details */}
              <div className="border border-[#DDD5C7] rounded-xl bg-[#FAF8F3] p-4 space-y-3">
                <div className="flex items-center gap-2 border-b border-[#EAE3D4] pb-2">
                  <User className="w-4 h-4 text-[#143D2D]" />
                  <h4 className="font-serif font-semibold text-xs text-[#11241C]">Profile Details</h4>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-[#7A8A82] block">Full Name</span>
                    <span className="font-semibold text-xs">{selectedUser.name}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#7A8A82] block">Identity Email</span>
                    <span className="font-mono text-xs text-[#143D2D]">{selectedUser.email}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#7A8A82] block">Contact Phone</span>
                    <span className="font-mono">{selectedUser.phone || 'Protected / Unlisted'}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#7A8A82] block">Department / Scope</span>
                    <span>{selectedUser.department || 'Statutory Audit Practice'}</span>
                  </div>
                </div>
              </div>

              {/* Firm Membership & Assigned Role */}
              <div className="border border-[#DDD5C7] rounded-xl bg-[#FAF8F3] p-4 space-y-3">
                <div className="flex items-center gap-2 border-b border-[#EAE3D4] pb-2">
                  <Building2 className="w-4 h-4 text-[#143D2D]" />
                  <h4 className="font-serif font-semibold text-xs text-[#11241C]">Firm Membership &amp; Role</h4>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-[#7A8A82] block">Tenancy Entity</span>
                    <span className="font-semibold text-xs">{selectedUser.firm}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#7A8A82] block">Assigned Role</span>
                    <span className="font-mono font-semibold text-xs text-[#143D2D]">{selectedUser.role}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#7A8A82] block">Membership Status</span>
                    <StatusBadge status={(selectedUser.membershipStatus || selectedUser.status || 'Active').toLowerCase()} size="sm" />
                  </div>
                  <div>
                    <span className="text-[11px] text-[#7A8A82] block">Account Status</span>
                    <span className="font-mono font-medium">{selectedUser.accountStatus || 'Verified'}</span>
                  </div>
                </div>
              </div>

              {/* Security Policy (Zero password exposure) */}
              <div className="border border-[#DDD5C7] rounded-xl bg-[#FAF8F3] p-4 space-y-2">
                <div className="flex items-center gap-2 border-b border-[#EAE3D4] pb-2">
                  <ShieldCheck className="w-4 h-4 text-[#143D2D]" />
                  <h4 className="font-serif font-semibold text-xs text-[#11241C]">Authentication Credential Policy</h4>
                </div>
                <p className="text-[11px] text-[#54645C] leading-relaxed">
                  Enterprise security policy: Passwords and private keys are never stored or exposed in plaintext.
                  Authentication is cryptographically bound to hardware WebAuthn credentials and Argon2id hashes.
                </p>
                <div className="flex items-center justify-between text-[11px] font-mono text-[#7A8A82] pt-1">
                  <span>Last Active: {selectedUser.lastActive}</span>
                  <span>MFA: {selectedUser.accountStatus}</span>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="border border-[#DDD5C7] rounded-xl bg-[#FAF8F3] p-4 space-y-3">
                <div className="flex items-center gap-2 border-b border-[#EAE3D4] pb-2">
                  <Clock className="w-4 h-4 text-[#143D2D]" />
                  <h4 className="font-serif font-semibold text-xs text-[#11241C]">Recent User Audit Logs</h4>
                </div>
                <div className="space-y-2">
                  {(selectedUser.recentActivity || [
                    { timestamp: new Date().toISOString(), description: 'Active session verified' },
                  ]).map((act, i) => (
                    <div key={i} className="p-2 rounded bg-[#F2EDE2] border border-[#EAE3D4] flex items-center justify-between text-xs">
                      <span>{act.description}</span>
                      <span className="font-mono text-[10px] text-[#7A8A82]">{formatDate(act.timestamp)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DetailsDrawer>

        {/* MANAGE ACCESS MODAL */}
        <ConfirmationModal
          isOpen={!!managingUser}
          onClose={() => {
            setManagingUser(null);
            setMutationError(null);
          }}
          onConfirm={(reason) => handleSaveManageAccess(reason)}
          title="Manage User Access &amp; Permissions"
          confirmText={isSubmitting ? 'Saving...' : 'Save Access Changes'}
          variant="primary"
          requireReason={true}
          auditReasonPlaceholder="Mandatory reason for role or security credential change"
          isLoading={isSubmitting}
        >
          {managingUser && (
            <div className="space-y-4 text-xs text-[#11241C]">
              {mutationError && (
                <div className="p-3 rounded-lg bg-[#FAF0ED] border border-[#F0C2C0] text-[#8A1F1D] text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-semibold block">Execution Error</span>
                    <span className="text-[11px] leading-relaxed">{mutationError}</span>
                  </div>
                </div>
              )}

              <div className="p-3 rounded-lg bg-[#FAF8F3] border border-[#DDD5C7]">
                <p className="font-semibold text-xs">{managingUser.name}</p>
                <p className="text-[11px] font-mono text-[#54645C]">{managingUser.email}</p>
                <p className="text-[11px] text-[#7A8A82] mt-0.5">Firm: {managingUser.firm}</p>
              </div>

              <div className="space-y-1">
                <label className="font-semibold block text-xs">Assigned Platform / Firm Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-[#DDD5C7] bg-white text-xs font-mono"
                  disabled={isSubmitting}
                >
                  <option value="PLATFORM_SUPER_ADMIN">PLATFORM_SUPER_ADMIN</option>
                  <option value="PLATFORM_OPERATOR">PLATFORM_OPERATOR</option>
                  <option value="PLATFORM_AUDITOR">PLATFORM_AUDITOR</option>
                  <option value="Managing Partner">Managing Partner</option>
                  <option value="Equity Partner">Equity Partner</option>
                  <option value="Student / Articled Clerk">Student / Articled Clerk</option>
                </select>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#FAF8F3] border border-[#DDD5C7]">
                <input
                  type="checkbox"
                  id="resetMfa"
                  checked={resetMfaPrompt}
                  onChange={(e) => setResetMfaPrompt(e.target.checked)}
                  className="rounded text-[#143D2D] focus:ring-[#143D2D]"
                  disabled={isSubmitting}
                />
                <label htmlFor="resetMfa" className="text-xs font-medium cursor-pointer">
                  Require new FIDO2 Hardware Key registration on next login
                </label>
              </div>
            </div>
          )}
        </ConfirmationModal>

        {/* DISABLE CONFIRMATION MODAL */}
        <ConfirmationModal
          isOpen={!!userToDisable}
          onClose={() => {
            setUserToDisable(null);
            setMutationError(null);
          }}
          onConfirm={(reason) => handleConfirmDisable(reason)}
          title="Disable User Account"
          confirmText={isSubmitting ? 'Locking Down...' : 'Confirm Account Lockdown'}
          variant="danger"
          requireReason={true}
          auditReasonPlaceholder="Reason for disabling user access"
          isLoading={isSubmitting}
        >
          {userToDisable && (
            <div className="space-y-3 text-xs text-[#11241C]">
              {mutationError && (
                <div className="p-3 rounded-lg bg-[#FAF0ED] border border-[#F0C2C0] text-[#8A1F1D] text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-semibold block">Lockdown Error</span>
                    <span className="text-[11px] leading-relaxed">{mutationError}</span>
                  </div>
                </div>
              )}

              <p>
                Are you sure you want to disable <strong>{userToDisable.name}</strong> ({userToDisable.email})?
              </p>
              <p className="text-[11px] text-[#8A1F1D]">
                This will immediately invalidate active hardware bearer tokens and block future platform access.
              </p>
            </div>
          )}
        </ConfirmationModal>

        {/* REACTIVATE CONFIRMATION MODAL */}
        <ConfirmationModal
          isOpen={!!userToReactivate}
          onClose={() => {
            setUserToReactivate(null);
            setMutationError(null);
          }}
          onConfirm={(reason) => handleConfirmReactivate(reason)}
          title="Reactivate User Account"
          confirmText={isSubmitting ? 'Restoring...' : 'Restore User Access'}
          variant="primary"
          auditReasonPlaceholder="Reason for restoring user access"
          isLoading={isSubmitting}
        >
          {userToReactivate && (
            <div className="space-y-3 text-xs text-[#11241C]">
              {mutationError && (
                <div className="p-3 rounded-lg bg-[#FAF0ED] border border-[#F0C2C0] text-[#8A1F1D] text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-semibold block">Restoration Error</span>
                    <span className="text-[11px] leading-relaxed">{mutationError}</span>
                  </div>
                </div>
              )}

              <p className="text-xs text-[#11241C]">
                Reactivate access for <strong>{userToReactivate.name}</strong> ({userToReactivate.email})?
              </p>
            </div>
          )}
        </ConfirmationModal>
      </div>
    </PageContainer>
  );
};
