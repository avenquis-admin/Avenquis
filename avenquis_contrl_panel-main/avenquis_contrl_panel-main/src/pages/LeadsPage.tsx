/**
 * Avenquis Control Panel - 5. Leads & Demos Section
 * High-touch commercial and demo pipeline for prospective law firms with tabs for
 * Access Requests, Demo Requests, Commercial Leads, 6 lifecycle statuses, activity timeline,
 * and seamless conversion action into managed firm tenancies.
 * 
 * STRICT ZERO-MOCK COMPLIANCE:
 * - Real backend data only via leadsService and apiClient
 * - Zero fallback to hardcoded records
 * - Transparent error and unavailable states with retry
 */

import React, { useEffect, useState, useCallback } from 'react';
import { PageContainer } from '../components/common/PageContainer';
import { DataTable, ColumnDef } from '../components/ui/DataTable';
import { FilterBar } from '../components/ui/FilterBar';
import { StatusBadge } from '../components/ui/StatusBadge';
import { DetailsDrawer, ConfirmationModal } from '../components/ui/ConfirmationModal';
import { leadsService } from '../services/pageServices';
import { LeadRecord } from '../types';
import { formatDate } from '../utils/formatters';
import { TableSkeleton } from '../components/ui/LoadingSkeleton';
import { ApiError } from '../services/apiClient';
import {
  Calendar,
  Building2,
  User,
  Mail,
  Eye,
  Send,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  MessageSquare,
  Plus,
  AlertTriangle,
  RefreshCw,
  Loader2,
  XCircle,
} from 'lucide-react';

export const LeadsPage: React.FC = () => {
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<ApiError | Error | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'access' | 'demo' | 'commercial'>('demo');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Selected Lead for Detail Drawer
  const [selectedLead, setSelectedLead] = useState<LeadRecord | null>(null);

  // Status Change & Mutation In-flight States
  const [mutatingLeadId, setMutatingLeadId] = useState<string | null>(null);
  const [newNoteInput, setNewNoteInput] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);

  // Convert Lead Modal State
  const [convertingLead, setConvertingLead] = useState<LeadRecord | null>(null);
  const [targetPlan, setTargetPlan] = useState('Partnership Firm');
  const [convertAuditReason, setConvertAuditReason] = useState('');
  const [isConverting, setIsConverting] = useState(false);

  // Feedback Banner
  const [bannerText, setBannerText] = useState<string | null>(null);

  const loadData = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await leadsService.getAll(undefined, signal);
      setLeads(res.data || []);
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.message === 'Request was cancelled') {
        return;
      }
      setFetchError(err);
      setLeads([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort();
  }, [loadData]);

  const tabCounts = {
    access: leads.filter((l) => l.requestType === 'Access Request').length,
    demo: leads.filter((l) => l.requestType === 'Demo Request').length,
    commercial: leads.filter((l) => l.requestType === 'Commercial Lead').length,
  };

  const filtered = leads.filter((l) => {
    const tabMatch =
      activeTab === 'access'
        ? l.requestType === 'Access Request'
        : activeTab === 'demo'
        ? l.requestType === 'Demo Request'
        : l.requestType === 'Commercial Lead';

    const statusMatch = statusFilter === 'all' || l.status === statusFilter;

    const searchMatch =
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.email.toLowerCase().includes(search.toLowerCase()) ||
      l.companyFirm.toLowerCase().includes(search.toLowerCase()) ||
      l.source.toLowerCase().includes(search.toLowerCase()) ||
      l.owner.toLowerCase().includes(search.toLowerCase());

    return tabMatch && statusMatch && searchMatch;
  });

  const handleUpdateStatus = async (leadId: string, newStatus: LeadRecord['status']) => {
    setMutatingLeadId(leadId);
    setMutationError(null);
    try {
      await leadsService.updateStatus(leadId, newStatus);
      setBannerText(`Updated lead status to "${newStatus}".`);
      await loadData();
      if (selectedLead && selectedLead.id === leadId) {
        setSelectedLead((prev) => (prev ? { ...prev, status: newStatus, lastUpdated: new Date().toISOString() } : null));
      }
      setTimeout(() => setBannerText(null), 3500);
    } catch (err: any) {
      setMutationError(err.message || `Failed to update status for lead ${leadId}`);
    } finally {
      setMutatingLeadId(null);
    }
  };

  const handleAddNote = async () => {
    if (!selectedLead || !newNoteInput.trim() || isAddingNote) return;
    setIsAddingNote(true);
    setMutationError(null);
    try {
      await leadsService.addNote(selectedLead.id, newNoteInput.trim());
      setNewNoteInput('');
      await loadData();
      const refreshed = await leadsService.getAll();
      const updated = refreshed.data.find((l) => l.id === selectedLead.id);
      if (updated) setSelectedLead(updated);
      setBannerText('Administrative note successfully recorded.');
      setTimeout(() => setBannerText(null), 3500);
    } catch (err: any) {
      setMutationError(err.message || `Failed to record note for lead ${selectedLead.id}`);
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleConfirmConvert = async () => {
    if (!convertingLead || isConverting) return;
    setIsConverting(true);
    setMutationError(null);
    try {
      await leadsService.convert(convertingLead.id, { plan: targetPlan });
      setBannerText(`Lead "${convertingLead.companyFirm}" successfully converted to active firm tenancy.`);
      setConvertingLead(null);
      setConvertAuditReason('');
      if (selectedLead?.id === convertingLead.id) {
        setSelectedLead(null);
      }
      await loadData();
      setTimeout(() => setBannerText(null), 4000);
    } catch (err: any) {
      setMutationError(err.message || `Failed to convert lead "${convertingLead.companyFirm}" to active tenancy`);
    } finally {
      setIsConverting(false);
    }
  };

  const columns: ColumnDef<LeadRecord>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (l) => (
        <div>
          <p className="font-semibold text-xs text-[#11241C]">{l.name}</p>
          <p className="text-[10px] font-mono text-[#7A8A82]">{l.id}</p>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: (l) => <span className="font-mono text-xs text-[#54645C]">{l.email}</span>,
    },
    {
      key: 'companyFirm',
      header: 'Company / Firm',
      sortable: true,
      render: (l) => <span className="text-xs text-[#11241C] font-medium">{l.companyFirm}</span>,
    },
    {
      key: 'source',
      header: 'Source',
      render: (l) => (
        <span className="text-xs px-2 py-0.5 rounded bg-[#F0EAE0] text-[#36473F] border border-[#DDD5C7]">
          {l.source}
        </span>
      ),
    },
    {
      key: 'requestType',
      header: 'Request Type',
      render: (l) => <span className="text-xs text-[#54645C]">{l.requestType}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (l) => {
        const getBadgeStatus = () => {
          switch (l.status) {
            case 'New':
              return 'reviewing';
            case 'Contacted':
              return 'pending';
            case 'Qualified':
              return 'active';
            case 'Approved':
              return 'healthy';
            case 'Converted':
              return 'approved';
            case 'Lost':
              return 'rejected';
            default:
              return 'pending';
          }
        };
        return <StatusBadge status={getBadgeStatus()} size="sm" text={l.status} />;
      },
    },
    {
      key: 'owner',
      header: 'Owner',
      render: (l) => <span className="text-xs text-[#143D2D] font-medium">{l.owner}</span>,
    },
    {
      key: 'createdAt',
      header: 'Created At',
      sortable: true,
      render: (l) => <span className="font-mono text-xs text-[#54645C]">{formatDate(l.createdAt || l.createdDate)}</span>,
    },
    {
      key: 'lastUpdated',
      header: 'Last Updated',
      sortable: true,
      render: (l) => <span className="font-mono text-xs text-[#7A8A82]">{formatDate(l.lastUpdated)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (l) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => setSelectedLead(l)}
            className="p-1.5 rounded hover:bg-[#EAE3D4] text-[#54645C] hover:text-[#11241C] transition-colors"
            title="Inspect Dossier"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          {l.status !== 'Converted' && l.status !== 'Lost' && (
            <button
              onClick={() => {
                setConvertingLead(l);
                setTargetPlan('Partnership Firm');
              }}
              disabled={mutatingLeadId === l.id}
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#143D2D] hover:bg-[#0E2C20] text-[#FAF7F0] text-xs font-medium transition-colors shadow-xs disabled:opacity-50"
              title="Convert to Firm Tenancy"
            >
              <span>Convert</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <PageContainer
      title="Enterprise Leads &amp; Demonstration Pipeline"
      subtitle="Prospective law firm inquiries, institutional demo requests, and commercial qualification pipeline."
    >
      <div className="space-y-4">
        {/* Mutation Error Banner */}
        {mutationError && (
          <div className="p-4 rounded-xl bg-[#FDF2F2] border border-[#F8D7DA] text-[#9A2222] text-xs flex items-start gap-3 shadow-xs">
            <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#DC2626]" />
            <div className="flex-1">
              <span className="font-semibold block">Authoritative Mutation Rejected</span>
              <p className="mt-0.5">{mutationError}</p>
            </div>
            <button
              onClick={() => setMutationError(null)}
              className="p-1 rounded hover:bg-[#F8D7DA]/60 text-[#9A2222] transition-colors"
              aria-label="Dismiss error"
            >
              &times;
            </button>
          </div>
        )}

        {/* Fetch Error Banner */}
        {fetchError && (
          <div className="p-4 rounded-xl bg-[#FDF9F0] border border-[#F3E2B8] text-[#8C6B1F] text-xs flex items-start justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#B88728] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block text-sm text-[#684D12]">
                  {(fetchError as ApiError)?.status === 401
                    ? '401 Unauthorized — PLATFORM AUTHENTICATION REQUIRED'
                    : (fetchError as ApiError)?.status === 403
                    ? '403 Forbidden — PLATFORM SUPER ADMIN CLEARANCE REQUIRED'
                    : (fetchError as ApiError)?.status === 404
                    ? '404 Not Found — BACKEND ENDPOINT REQUIRED: GET /leads'
                    : 'Backend Leads Service Unavailable (Zero-Mock Enforced)'}
                </span>
                <p className="mt-1 text-xs text-[#7D5E19]">
                  {fetchError.message ||
                    'The authoritative AVENQUIS Backend is not reachable. Showing verified empty state without mock fallbacks.'}
                </p>
              </div>
            </div>
            <button
              onClick={() => loadData()}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#DDC68A] bg-white text-[#684D12] hover:bg-[#FAF6EC] font-medium text-xs transition-colors shrink-0 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Retry Sync</span>
            </button>
          </div>
        )}

        {/* Feedback Banner */}
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

        {/* TABS: Access Requests, Demo Requests, Commercial Leads */}
        <div className="flex items-center justify-between border-b border-[#DDD5C7] pb-1 gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            {[
              { id: 'access', label: 'Access Requests', count: tabCounts.access },
              { id: 'demo', label: 'Demo Requests', count: tabCounts.demo },
              { id: 'commercial', label: 'Commercial Leads', count: tabCounts.commercial },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-t-lg text-xs font-medium transition-colors border-b-2 flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-[#143D2D] text-[#143D2D] bg-[#F2EDE2]'
                    : 'border-transparent text-[#54645C] hover:text-[#11241C]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    activeTab === tab.id
                      ? 'bg-[#143D2D] text-[#FAF7F0]'
                      : 'bg-[#E5DFD3] text-[#54645C]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5 text-xs text-[#54645C]">
              <span>Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2 py-1 rounded-lg border border-[#DDD5C7] bg-[#FAF8F3] text-xs"
              >
                <option value="all">All Statuses</option>
                <option value="New">New</option>
                <option value="Contacted">Contacted</option>
                <option value="Qualified">Qualified</option>
                <option value="Approved">Approved</option>
                <option value="Converted">Converted</option>
                <option value="Lost">Lost</option>
              </select>
            </div>

            <div className="w-64">
              <FilterBar
                searchValue={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search leads, firms, emails..."
                totalCount={filtered.length}
              />
            </div>
          </div>
        </div>

        {/* DATA TABLE / SKELETON */}
        {isLoading && leads.length === 0 ? (
          <TableSkeleton rows={6} columns={6} />
        ) : (
          <DataTable
            columns={columns}
            data={filtered}
            keyExtractor={(l) => l.id}
            emptyMessage={
              fetchError
                ? 'Leads data currently unavailable from backend.'
                : 'No leads found in this pipeline segment.'
            }
          />
        )}

        {/* LEAD DETAIL DRAWER */}
        <DetailsDrawer
          isOpen={!!selectedLead}
          onClose={() => setSelectedLead(null)}
          title="Lead &amp; Demonstration Dossier"
          subtitle={selectedLead ? `${selectedLead.companyFirm} — ${selectedLead.name}` : ''}
          width="max-w-2xl"
          footer={
            selectedLead && selectedLead.status !== 'Converted' ? (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#7A8A82]">Status:</span>
                  <select
                    value={selectedLead.status}
                    disabled={mutatingLeadId === selectedLead.id}
                    onChange={(e) => handleUpdateStatus(selectedLead.id, e.target.value as any)}
                    className="px-2.5 py-1 rounded-lg border border-[#DDD5C7] bg-white text-xs font-semibold text-[#143D2D] disabled:opacity-50"
                  >
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Approved">Approved</option>
                    <option value="Converted">Converted</option>
                    <option value="Lost">Lost</option>
                  </select>
                  {mutatingLeadId === selectedLead.id && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#143D2D]" />}
                </div>

                <button
                  onClick={() => {
                    setConvertingLead(selectedLead);
                    setTargetPlan('Partnership Firm');
                  }}
                  className="inline-flex items-center gap-1 px-4 py-1.5 rounded-lg bg-[#143D2D] hover:bg-[#0E2C20] text-[#FAF7F0] text-xs font-medium shadow-xs"
                >
                  <span>Convert to Law Firm Tenancy</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : undefined
          }
        >
          {selectedLead && (
            <div className="space-y-6 text-xs text-[#11241C]">
              {/* Lead Identity & Contact */}
              <div className="border border-[#DDD5C7] rounded-xl bg-[#FAF8F3] p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[#EAE3D4] pb-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#143D2D]" />
                    <h4 className="font-serif font-semibold text-xs text-[#11241C]">Prospective Entity</h4>
                  </div>
                  {/* Status Change Control in Drawer */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-[#7A8A82]">Lifecycle:</span>
                    <select
                      value={selectedLead.status}
                      disabled={mutatingLeadId === selectedLead.id}
                      onChange={(e) => handleUpdateStatus(selectedLead.id, e.target.value as any)}
                      className="px-2 py-0.5 rounded border border-[#DDD5C7] bg-white text-xs font-semibold text-[#143D2D] disabled:opacity-50"
                    >
                      <option value="New">New</option>
                      <option value="Contacted">Contacted</option>
                      <option value="Qualified">Qualified</option>
                      <option value="Approved">Approved</option>
                      <option value="Converted">Converted</option>
                      <option value="Lost">Lost</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-[#7A8A82] block">Firm Name</span>
                    <span className="font-semibold text-xs">{selectedLead.companyFirm}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#7A8A82] block">Contact Person</span>
                    <span className="font-medium text-xs">{selectedLead.name}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#7A8A82] block">Email</span>
                    <span className="font-mono text-xs text-[#143D2D]">{selectedLead.email}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#7A8A82] block">Acquisition Source</span>
                    <span>{selectedLead.source}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#7A8A82] block">Account Executive</span>
                    <span className="font-medium text-[#143D2D]">{selectedLead.owner}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#7A8A82] block">Estimated Seats</span>
                    <span className="font-mono">{selectedLead.estSeats || 25} Seats</span>
                  </div>
                </div>
              </div>

              {/* Notes & Activity Timeline */}
              <div className="border border-[#DDD5C7] rounded-xl bg-[#FAF8F3] p-4 space-y-3">
                <div className="flex items-center gap-2 border-b border-[#EAE3D4] pb-2">
                  <Clock className="w-4 h-4 text-[#143D2D]" />
                  <h4 className="font-serif font-semibold text-xs text-[#11241C]">Activity Timeline &amp; Notes</h4>
                </div>

                {/* Add Note Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newNoteInput}
                    disabled={isAddingNote}
                    onChange={(e) => setNewNoteInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                    placeholder="Record briefing outcome or follow-up task..."
                    className="flex-1 px-3 py-1.5 rounded-lg border border-[#DDD5C7] bg-white text-xs disabled:opacity-50"
                  />
                  <button
                    onClick={handleAddNote}
                    disabled={!newNoteInput.trim() || isAddingNote}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#143D2D] text-[#FAF7F0] text-xs font-medium hover:bg-[#0E2C20] disabled:opacity-50 transition-colors"
                  >
                    {isAddingNote && <Loader2 className="w-3 h-3 animate-spin" />}
                    <span>Add Note</span>
                  </button>
                </div>

                {/* Timeline Items */}
                <div className="space-y-2 mt-3">
                  {(selectedLead.notes && selectedLead.notes.length > 0 ? (
                    selectedLead.notes.map((n, i) => (
                      <div key={i} className="p-2.5 rounded bg-[#F2EDE2] border border-[#EAE3D4] space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-[#7A8A82]">
                          <span className="font-medium text-[#143D2D]">{n.author}</span>
                          <span className="font-mono">{formatDate(n.date || n.timestamp)}</span>
                        </div>
                        <p className="text-xs text-[#182620]">{n.text}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-[#7A8A82] py-2 italic text-center">
                      No activity notes currently recorded for this dossier.
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DetailsDrawer>

        {/* CONVERT LEAD CONFIRMATION MODAL */}
        <ConfirmationModal
          isOpen={!!convertingLead}
          onClose={() => {
            if (!isConverting) {
              setConvertingLead(null);
              setConvertAuditReason('');
            }
          }}
          onConfirm={handleConfirmConvert}
          title="Convert Lead to Institutional Firm Tenancy"
          confirmText={isConverting ? "Provisioning..." : "Provision Firm & Workspace"}
          variant="primary"
          auditReasonPlaceholder="Reference contract ID or enterprise proposal #"
        >
          {convertingLead && (
            <div className="space-y-4 text-xs text-[#11241C]">
              <div className="p-3 rounded-lg bg-[#FAF8F3] border border-[#DDD5C7]">
                <p className="font-semibold text-xs">{convertingLead.companyFirm}</p>
                <p className="text-[11px] text-[#54645C] mt-0.5">
                  Primary Contact: {convertingLead.name} ({convertingLead.email})
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-semibold block text-xs">Assign Initial Subscription Plan</label>
                <select
                  value={targetPlan}
                  disabled={isConverting}
                  onChange={(e) => setTargetPlan(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-[#DDD5C7] bg-white text-xs font-medium text-[#143D2D] disabled:opacity-50"
                >
                  <option value="Partnership Firm">Partnership Firm (4 Partners + 10 Student Logins)</option>
                  <option value="Proprietor Firm with 5 Student Login">Proprietor Firm with 5 Student Login</option>
                  <option value="Individual Proprietor / Firm Owner">Individual Proprietor / Firm Owner (1 Login)</option>
                  <option value="Single Article Student">Single Article Student (1 Login)</option>
                </select>
              </div>

              <p className="text-[11px] text-[#54645C]">
                Converting this lead marks it as "Converted", provisions a new law firm tenant record, and dispatches invitation credentials to the primary contact.
              </p>
            </div>
          )}
        </ConfirmationModal>
      </div>
    </PageContainer>
  );
};
