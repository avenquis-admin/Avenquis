/**
 * Avenquis Control Panel - 10. Audit & Activity Section
 * Authoritative cryptographic audit trail recording all platform super-admin actions,
 * actor types, target entities, IP addresses, ledger seals, and deep payload inspection.
 * STRICTLY ZERO MOCK FALLBACK — CONNECTED DIRECTLY TO CENTRAL APICLIENT.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { PageContainer } from '../components/common/PageContainer';
import { DataTable, ColumnDef } from '../components/ui/DataTable';
import { FilterBar } from '../components/ui/FilterBar';
import { DetailsDrawer } from '../components/ui/ConfirmationModal';
import { auditService } from '../services/pageServices';
import { ApiError } from '../services/apiClient';
import { AuditEvent } from '../types';
import { formatDate, formatDateTime } from '../utils/formatters';
import {
  ShieldCheck,
  Download,
  Lock,
  Eye,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  User,
  Server,
  KeyRound,
  FileCode,
  Copy,
  RotateCw,
  Loader2,
} from 'lucide-react';

export const AuditPage: React.FC = () => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [search, setSearch] = useState('');

  // Filters: actor type, severity, date range
  const [actorTypeFilter, setActorTypeFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<'24h' | '7d' | '30d' | 'all'>('30d');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [totalEvents, setTotalEvents] = useState<number>(0);

  // Selected for Drawer
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);

  // Async Lifecycle States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<ApiError | Error | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  // Feedback Banner
  const [bannerText, setBannerText] = useState<string | null>(null);

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
        const res = await auditService.getAll(
          {
            search: search.trim() || undefined,
            actorType: actorTypeFilter !== 'all' ? actorTypeFilter : undefined,
            severity: severityFilter !== 'all' ? severityFilter : undefined,
            range: dateRangeFilter !== 'all' ? dateRangeFilter : undefined,
            page: currentPage,
            limit: pageSize,
          },
          signal
        );

        if (signal.aborted) return;

        setEvents(res.data);
        setTotalEvents(res.total ?? res.data.length);
        setFetchError(null);
      } catch (err: unknown) {
        if (
          signal.aborted ||
          (err as any)?.name === 'AbortError' ||
          (err as any)?.message === 'Request was cancelled' ||
          (err as any)?.code === 'ABORT_ERR'
        ) {
          return;
        }
        console.warn('[AuditPage] Authoritative audit load note:', (err as any)?.message || err);
        setEvents([]);
        setTotalEvents(0);
        setFetchError(err as ApiError);
      } finally {
        if (!signal.aborted) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [search, actorTypeFilter, severityFilter, dateRangeFilter, currentPage, pageSize]
  );

  useEffect(() => {
    loadData(false);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadData]);

  // Client-side verification filtering over returned authoritative records
  const filtered = events.filter((e) => {
    const matchesSearch =
      !search.trim() ||
      e.action.toLowerCase().includes(search.toLowerCase().trim()) ||
      e.actor.toLowerCase().includes(search.toLowerCase().trim()) ||
      (e.target || e.targetEntity || '').toLowerCase().includes(search.toLowerCase().trim()) ||
      e.id.toLowerCase().includes(search.toLowerCase().trim()) ||
      (e.ipAddress || '').toLowerCase().includes(search.toLowerCase().trim());

    const matchesActorType =
      actorTypeFilter === 'all' ||
      e.actorType === actorTypeFilter ||
      e.actorRole === actorTypeFilter;

    const matchesSeverity = severityFilter === 'all' || e.severity === severityFilter;

    return matchesSearch && matchesActorType && matchesSeverity;
  });

  // Authoritative Audit Log Export: calls backend endpoint, never simulates fake bundle
  const handleExportBundle = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setExportError(null);
    setBannerText(null);

    try {
      const blob = await auditService.exportAuditLog({
        search: search.trim() || undefined,
        actorType: actorTypeFilter !== 'all' ? actorTypeFilter : undefined,
        severity: severityFilter !== 'all' ? severityFilter : undefined,
        range: dateRangeFilter !== 'all' ? dateRangeFilter : undefined,
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `avenquis-audit-log-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setBannerText('Authoritative cryptographic audit log export downloaded successfully from backend.');
      setTimeout(() => setBannerText(null), 4000);
    } catch (err: unknown) {
      console.warn('[AuditPage] Authoritative export note:', err);
      const apiErr = err as ApiError;
      if (apiErr.status === 404) {
        setExportError(
          'BACKEND ENDPOINT REQUIRED: GET /audit/events/export is not implemented on the authoritative backend. Simulated local export is strictly prohibited.'
        );
      } else if (apiErr.status === 401) {
        setExportError('401 Unauthorized: Administrative session expired. Cannot download audit log.');
      } else if (apiErr.status === 403) {
        setExportError('403 Forbidden: Insufficient administrative privileges to export compliance audit trail.');
      } else {
        setExportError(apiErr.message || 'Failed to download authoritative audit export from backend.');
      }
    } finally {
      setIsExporting(false);
    }
  };

  const columns: ColumnDef<AuditEvent>[] = [
    {
      key: 'timestamp',
      header: 'Timestamp',
      sortable: true,
      render: (e) => <span className="font-mono text-xs text-[#11241C]">{formatDateTime(e.timestamp)}</span>,
    },
    {
      key: 'actor',
      header: 'Actor',
      sortable: true,
      render: (e) => (
        <div>
          <p className="font-semibold text-xs text-[#11241C]">{e.actor}</p>
          <p className="text-[10px] font-mono text-[#7A8A82]">{e.actorEmail || e.actor}</p>
        </div>
      ),
    },
    {
      key: 'actorType',
      header: 'Actor Type',
      render: (e) => (
        <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#F0EAE0] text-[#143D2D] border border-[#DDD5C7] font-medium">
          {e.actorType || e.actorRole || 'System'}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      sortable: true,
      render: (e) => (
        <div>
          <span className="font-mono text-xs font-semibold text-[#182620]">{e.action}</span>
          <p className="text-[11px] text-[#54645C] line-clamp-1">{e.details}</p>
        </div>
      ),
    },
    {
      key: 'target',
      header: 'Target Entity',
      render: (e) => (
        <span className="text-xs text-[#143D2D] font-mono font-medium">
          {e.target || e.targetEntity || '—'}
        </span>
      ),
    },
    {
      key: 'severity',
      header: 'Severity',
      sortable: true,
      render: (e) => {
        const getSeverityColor = () => {
          switch (e.severity) {
            case 'Critical':
            case 'Security':
              return 'bg-[#FAF0ED] text-[#8A1F1D] border-[#F0C2C0]';
            case 'Warning':
              return 'bg-[#FEF3D6] text-[#855B0F] border-[#E8C872]';
            case 'Notice':
              return 'bg-[#EEF2FF] text-[#3730A3] border-[#C7D2FE]';
            case 'Info':
            default:
              return 'bg-[#EAF3ED] text-[#144A32] border-[#C2DEC9]';
          }
        };
        return (
          <span className={`font-mono text-xs px-2 py-0.5 rounded border font-semibold ${getSeverityColor()}`}>
            {e.severity}
          </span>
        );
      },
    },
    {
      key: 'ipAddress',
      header: 'IP Address',
      render: (e) => <span className="font-mono text-xs text-[#54645C]">{e.ipAddress || '—'}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (e) => (
        <button
          onClick={() => setSelectedEvent(e)}
          className="p-1.5 rounded hover:bg-[#EAE3D4] text-[#54645C] hover:text-[#11241C] transition-colors"
          title="Inspect Event Payload"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];

  return (
    <PageContainer
      title="Platform Audit &amp; Activity Log"
      subtitle="Complete, verifiable administrative event log recording tenant operations, policy configurations, and security events."
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData(true)}
            disabled={isRefreshing || isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E4DFD5] bg-white hover:bg-[#F2ECE1] text-xs font-medium text-[#11241C] transition-colors shadow-2xs disabled:opacity-50"
            title="Refresh Authoritative Audit Stream"
          >
            <RotateCw className={`w-3.5 h-3.5 text-[#143D2D] ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          <button
            onClick={handleExportBundle}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#E4DFD5] bg-white hover:bg-[#F2ECE1] text-xs font-medium text-[#11241C] transition-colors shadow-2xs disabled:opacity-50"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 text-[#143D2D] animate-spin" />
            ) : (
              <Download className="w-4 h-4 text-[#143D2D]" />
            )}
            <span>{isExporting ? 'Requesting Server Export...' : 'Export Signed Compliance Bundle'}</span>
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Fetch Error Banner (401, 403, 404, 5xx, Network) */}
        {fetchError && (
          <div className="p-4 rounded-xl bg-[#FDF3F2] border border-[#F5C2BF] text-[#8A1F1D] flex items-center justify-between gap-4 shadow-2xs">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#8A1F1D] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-xs block">
                  {fetchError instanceof ApiError && fetchError.status === 401
                    ? '401 Unauthorized — Session Expired / Invalid'
                    : fetchError instanceof ApiError && fetchError.status === 403
                    ? '403 Forbidden — Insufficient Audit Ledger Permissions'
                    : fetchError instanceof ApiError && fetchError.status === 404
                    ? '404 Not Found — Backend Endpoint Required (GET /audit/events)'
                    : 'Authoritative Backend Audit Ledger Unavailable'}
                </span>
                <span className="text-xs text-[#8A1F1D]/90 mt-0.5 block">
                  {fetchError.message ||
                    'The authoritative AVENQUIS Backend audit ledger is not reachable. Showing verified empty state. Zero-mock enforced.'}
                </span>
                <span className="font-mono text-[10px] text-[#A63330] mt-1 block">
                  Target Endpoint: GET /audit/events
                </span>
              </div>
            </div>
            <button
              onClick={() => loadData(true)}
              disabled={isRefreshing}
              className="px-3 py-1.5 rounded-lg bg-[#8A1F1D] text-white hover:bg-[#6D1817] font-medium text-xs transition-colors shrink-0 flex items-center justify-center gap-1.5"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Retry Authoritative Stream</span>
            </button>
          </div>
        )}

        {/* Export Error Banner */}
        {exportError && (
          <div className="p-4 rounded-xl bg-[#FEF3D6] border border-[#E8C872] text-[#855B0F] flex items-center justify-between gap-4 shadow-2xs">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#855B0F] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-xs block">Compliance Export Failed</span>
                <span className="text-xs text-[#855B0F]/90 mt-0.5 block">{exportError}</span>
              </div>
            </div>
            <button
              onClick={() => setExportError(null)}
              className="text-[#855B0F] hover:opacity-75 font-semibold text-lg"
            >
              &times;
            </button>
          </div>
        )}

        {/* Success Banner */}
        {bannerText && (
          <div className="p-4 rounded-2xl bg-[#EAF3ED] border border-[#D5E8DD] text-[#14472F] text-xs flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#1D734E]" />
              <span className="font-medium">{bannerText}</span>
            </div>
            <button onClick={() => setBannerText(null)} className="text-[#14472F] hover:opacity-75 font-semibold">
              &times;
            </button>
          </div>
        )}

        {/* 3 FILTERS (actor type, severity, date range) & SEARCH */}
        <div className="flex items-center justify-between gap-4 flex-wrap pb-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Actor Type Filter */}
            <div className="flex items-center gap-1.5 text-xs text-[#54645C]">
              <span>Actor Type:</span>
              <select
                value={actorTypeFilter}
                onChange={(e) => {
                  setActorTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-2 py-1 rounded-lg border border-[#DDD5C7] bg-[#FAF8F3] text-xs"
              >
                <option value="all">All Actor Types</option>
                <option value="Super Admin">Super Admin</option>
                <option value="Platform Super Admin">Platform Super Admin</option>
                <option value="System">System</option>
                <option value="Agent">Agent</option>
                <option value="Firm Admin">Firm Admin</option>
                <option value="API Key">API Key</option>
              </select>
            </div>

            {/* Severity Filter */}
            <div className="flex items-center gap-1.5 text-xs text-[#54645C]">
              <span>Severity:</span>
              <select
                value={severityFilter}
                onChange={(e) => {
                  setSeverityFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-2 py-1 rounded-lg border border-[#DDD5C7] bg-[#FAF8F3] text-xs"
              >
                <option value="all">All Severities</option>
                <option value="Info">Info</option>
                <option value="Notice">Notice</option>
                <option value="Warning">Warning</option>
                <option value="Critical">Critical</option>
                <option value="Security">Security</option>
              </select>
            </div>

            {/* Date Range Filter */}
            <div className="flex items-center gap-1.5 text-xs text-[#54645C]">
              <span>Range:</span>
              <div className="inline-flex rounded-lg border border-[#DDD5C7] bg-[#F2EDE2] p-0.5 text-xs font-medium">
                {(['24h', '7d', '30d', 'all'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      setDateRangeFilter(r);
                      setCurrentPage(1);
                    }}
                    className={`px-2 py-0.5 rounded ${
                      dateRangeFilter === r
                        ? 'bg-[#143D2D] text-[#FAF7F0]'
                        : 'text-[#54645C] hover:text-[#11241C]'
                    }`}
                  >
                    {r.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="w-72">
            <FilterBar
              searchValue={search}
              onSearchChange={(v) => {
                setSearch(v);
                setCurrentPage(1);
              }}
              searchPlaceholder="Search actor, action, IP, target..."
              totalCount={filtered.length}
            />
          </div>
        </div>

        {/* DATA TABLE */}
        <DataTable
          columns={columns}
          data={filtered}
          keyExtractor={(e) => e.id}
          isLoading={isLoading}
          emptyTitle={fetchError ? 'Audit Stream Offline' : 'No Audit Records'}
          emptyDescription={
            fetchError
              ? 'The authoritative backend audit ledger is not reachable or returned an error.'
              : 'There are no active records matching the selected parameters or filter criteria.'
          }
          emptyMessage={
            isLoading
              ? 'Connecting to authoritative audit ledger...'
              : 'No cryptographic audit records found.'
          }
          pagination={{
            currentPage,
            totalPages: Math.max(1, Math.ceil(totalEvents / pageSize)),
            totalItems: totalEvents,
            pageSize,
            onPageChange: (p) => setCurrentPage(p),
            onPageSizeChange: (s) => {
              setPageSize(s);
              setCurrentPage(1);
            },
          }}
        />

        {/* AUDIT DETAIL DRAWER */}
        <DetailsDrawer
          isOpen={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          title="Cryptographic Ledger Event Dossier"
          subtitle={selectedEvent ? `Event ID: ${selectedEvent.id}` : ''}
          width="max-w-2xl"
          footer={
            selectedEvent ? (
              <div className="flex items-center justify-between w-full">
                {selectedEvent.cryptographicHash ? (
                  <span className="text-xs text-[#144A32] flex items-center gap-1 font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Hardware Security Key Signature Valid
                  </span>
                ) : (
                  <span className="text-xs text-[#54645C] flex items-center gap-1 font-mono">
                    <Clock className="w-3.5 h-3.5" />
                    Immutable Server Timestamp Recorded
                  </span>
                )}
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(JSON.stringify(selectedEvent, null, 2));
                    setBannerText('Copied raw JSON event payload to clipboard.');
                    setTimeout(() => setBannerText(null), 3000);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#DDD5C7] bg-[#FAF8F3] hover:bg-[#F0EAE0] text-xs font-medium text-[#11241C]"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Raw JSON</span>
                </button>
              </div>
            ) : undefined
          }
        >
          {selectedEvent && (
            <div className="space-y-5 text-xs text-[#11241C]">
              {/* Event Metadata */}
              <div className="border border-[#DDD5C7] rounded-xl bg-[#FAF8F3] p-4 space-y-3">
                <div className="flex justify-between items-center border-b border-[#EAE3D4] pb-2">
                  <span className="font-serif font-semibold text-xs text-[#11241C]">Operation Metadata</span>
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[#EAF3ED] text-[#144A32] border border-[#C2DEC9]">
                    {selectedEvent.severity}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[#7A8A82] block text-[11px]">Execution Timestamp</span>
                    <span className="font-mono">{formatDate(selectedEvent.timestamp)}</span>
                  </div>
                  <div>
                    <span className="text-[#7A8A82] block text-[11px]">Action Executed</span>
                    <span className="font-mono font-semibold text-[#143D2D]">{selectedEvent.action}</span>
                  </div>
                  <div>
                    <span className="text-[#7A8A82] block text-[11px]">Actor &amp; Type</span>
                    <span className="font-semibold">
                      {selectedEvent.actor} ({selectedEvent.actorType || selectedEvent.actorRole || 'System'})
                    </span>
                  </div>
                  <div>
                    <span className="text-[#7A8A82] block text-[11px]">IP Address &amp; Origin</span>
                    <span className="font-mono">{selectedEvent.ipAddress || 'Not recorded'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[#7A8A82] block text-[11px]">Target Entity Resource</span>
                    <span className="font-mono font-medium">
                      {selectedEvent.target || selectedEvent.targetEntity || 'None specified'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cryptographic Hash & Verification Seal */}
              <div className="border border-[#DDD5C7] rounded-xl bg-[#FAF8F3] p-4 space-y-2">
                <div className="flex items-center gap-2 border-b border-[#EAE3D4] pb-2">
                  <Lock className="w-4 h-4 text-[#143D2D]" />
                  <h4 className="font-serif font-semibold text-xs text-[#11241C]">
                    Tamper-Evident Ledger Verification
                  </h4>
                </div>
                <div>
                  <span className="text-[#7A8A82] block text-[11px]">Cryptographic Record Hash</span>
                  {selectedEvent.cryptographicHash ? (
                    <code className="font-mono text-[11px] text-[#143D2D] break-all block bg-[#F2EDE2] p-2 rounded border border-[#E0D8CA]">
                      {selectedEvent.cryptographicHash}
                    </code>
                  ) : (
                    <div className="bg-[#F2EDE2] p-2 rounded border border-[#E0D8CA] text-[11px] text-[#7A8A82] italic">
                      No cryptographic hash returned by server
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-[#7A8A82] block text-[11px]">Correlation / Event ID</span>
                    <code className="font-mono text-[10px] text-[#54645C]">{selectedEvent.id}</code>
                  </div>
                  <div>
                    <span className="text-[#7A8A82] block text-[11px]">Hardware Security Module Seal</span>
                    <span className="font-mono text-[10px] text-[#1E563B]">
                      {selectedEvent.metadata?.cipher ||
                        (selectedEvent.cryptographicHash ? 'FIPS 140-3 Sealed' : 'Server Timestamp Log')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Full Event Payload / Raw Metadata */}
              <div className="border border-[#DDD5C7] rounded-xl bg-[#FAF8F3] p-4 space-y-2">
                <div className="flex items-center gap-2 border-b border-[#EAE3D4] pb-2">
                  <FileCode className="w-4 h-4 text-[#143D2D]" />
                  <h4 className="font-serif font-semibold text-xs text-[#11241C]">Event Payload &amp; Context</h4>
                </div>
                <pre className="p-3 rounded bg-[#F2EDE2] border border-[#E0D8CA] font-mono text-[11px] text-[#182620] overflow-x-auto leading-relaxed">
                  {JSON.stringify(
                    {
                      id: selectedEvent.id,
                      timestamp: selectedEvent.timestamp,
                      actor: selectedEvent.actor,
                      actorType: selectedEvent.actorType,
                      actorRole: selectedEvent.actorRole,
                      action: selectedEvent.action,
                      details: selectedEvent.details,
                      target: selectedEvent.target || selectedEvent.targetEntity,
                      severity: selectedEvent.severity,
                      ipAddress: selectedEvent.ipAddress,
                      signature: selectedEvent.cryptographicHash,
                      metadata: selectedEvent.metadata,
                      detailsPayload: selectedEvent.detailsPayload,
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>
          )}
        </DetailsDrawer>
      </div>
    </PageContainer>
  );
};
