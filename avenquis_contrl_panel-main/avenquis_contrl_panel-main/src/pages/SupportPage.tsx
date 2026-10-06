/**
 * Avenquis Control Panel - 8. Support Section
 * Enterprise law firm support queue, SLA response tracking, incident escalation,
 * conversation threads, internal staff notes, and triage controls.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { PageContainer } from '../components/common/PageContainer';
import { DataTable, ColumnDef } from '../components/ui/DataTable';
import { FilterBar } from '../components/ui/FilterBar';
import { StatusBadge } from '../components/ui/StatusBadge';
import { DetailsDrawer, ConfirmationModal } from '../components/ui/ConfirmationModal';
import { supportService } from '../services/pageServices';
import { ApiError } from '../services/apiClient';
import { SupportTicket, TicketMessage, TicketInternalNote } from '../types';
import { formatDate } from '../utils/formatters';
import {
  Headphones,
  Eye,
  MessageSquare,
  AlertTriangle,
  UserCheck,
  Send,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building2,
  ArrowUpRight,
  FileText,
  RotateCw,
  AlertOctagon,
  AlertCircle,
  Loader2
} from 'lucide-react';

export const SupportPage: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [search, setSearch] = useState('');

  // Filters: status, priority, category, assignee, firm
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [firmFilter, setFirmFilter] = useState('all');

  // Selected Ticket for Drawer
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [drawerTab, setDrawerTab] = useState<'messages' | 'notes'>('messages');
  const [replyInput, setReplyInput] = useState('');
  const [noteInput, setNoteInput] = useState('');

  // Assign Staff Modal
  const [assigningTicket, setAssigningTicket] = useState<SupportTicket | null>(null);
  const [selectedStaff, setSelectedStaff] = useState('Vikramaditya Rao');

  // Escalate Modal
  const [escalatingTicket, setEscalatingTicket] = useState<SupportTicket | null>(null);

  // Banner & Feedback
  const [bannerText, setBannerText] = useState<string | null>(null);
  const [drawerMutationError, setDrawerMutationError] = useState<string | null>(null);
  const [modalMutationError, setModalMutationError] = useState<string | null>(null);

  // Asynchronous lifecycle states
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState<ApiError | Error | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const loadData = useCallback(async (isManual = false) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    if (isManual) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setFetchError(null);

    try {
      const res = await supportService.getAll(undefined, controller.signal);
      if (controller.signal.aborted) return;
      setTickets(res.data || []);
    } catch (err: any) {
      if (
        controller.signal.aborted ||
        err?.name === 'AbortError' ||
        err?.message === 'Request was cancelled' ||
        err?.code === 'ABORT_ERR'
      ) {
        return;
      }
      console.warn('[SupportPage] Authoritative support queue fetch note:', err?.message || err);
      setFetchError(err);
      setTickets([]);
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    loadData();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadData]);

  const distinctFirms = Array.from(new Set(tickets.map((t) => t.firmName))).filter(Boolean);
  const distinctAssignees = Array.from(new Set(tickets.map((t) => t.assignee || t.assignedTo))).filter(Boolean);
  const distinctCategories = Array.from(new Set(tickets.map((t) => t.category))).filter(Boolean);

  const filtered = tickets.filter((t) => {
    const matchesSearch =
      (t.ticketNumber || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.firmName || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.subject || '').toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
    const matchesAssignee = assigneeFilter === 'all' || (t.assignee || t.assignedTo) === assigneeFilter;
    const matchesFirm = firmFilter === 'all' || t.firmName === firmFilter;

    return matchesSearch && matchesStatus && matchesPriority && matchesCategory && matchesAssignee && matchesFirm;
  });

  const handleOpenTicket = async (t: SupportTicket) => {
    setSelectedTicket(t);
    setDrawerMutationError(null);
    try {
      const fresh = await supportService.getById(t.id);
      if (fresh.data) {
        setSelectedTicket(fresh.data);
      }
    } catch {
      // Retain current row snapshot if getById is unavailable
    }
  };

  const handleSendReply = async () => {
    if (!selectedTicket || !replyInput.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setDrawerMutationError(null);

    try {
      await supportService.replyTicket(selectedTicket.id, replyInput.trim());
      setReplyInput('');
      setBannerText(`Reply dispatched to ${selectedTicket.firmName}.`);
      setTimeout(() => setBannerText(null), 3500);
      await loadData(false);

      try {
        const refreshed = await supportService.getById(selectedTicket.id);
        if (refreshed.data) setSelectedTicket(refreshed.data);
      } catch {
        // Retain local view updated
      }
    } catch (err: any) {
      console.warn('[SupportPage] Send reply note:', err);
      const apiErr = err as ApiError;
      if (apiErr.status === 404) {
        setDrawerMutationError('BACKEND ENDPOINT REQUIRED: POST /support/tickets/:id/reply is not implemented on backend.');
      } else if (apiErr.status === 401) {
        setDrawerMutationError('401 Unauthorized: Session token expired. Please re-authenticate.');
      } else if (apiErr.status === 403) {
        setDrawerMutationError('403 Forbidden: Insufficient administrative privileges to dispatch support reply.');
      } else if (apiErr.status === 422) {
        setDrawerMutationError(`422 Validation Error: ${apiErr.message || 'Invalid reply message content.'}`);
      } else {
        setDrawerMutationError(apiErr.message || 'Failed to dispatch reply to backend.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddInternalNote = async () => {
    if (!selectedTicket || !noteInput.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setDrawerMutationError(null);

    try {
      await supportService.addInternalNote(selectedTicket.id, noteInput.trim());
      setNoteInput('');
      setBannerText(`Internal audit note recorded for ${selectedTicket.ticketNumber}.`);
      setTimeout(() => setBannerText(null), 3500);
      await loadData(false);

      try {
        const refreshed = await supportService.getById(selectedTicket.id);
        if (refreshed.data) setSelectedTicket(refreshed.data);
      } catch {
        // Retain local view updated
      }
    } catch (err: any) {
      console.warn('[SupportPage] Add internal note note:', err);
      const apiErr = err as ApiError;
      if (apiErr.status === 404) {
        setDrawerMutationError('BACKEND ENDPOINT REQUIRED: POST /support/tickets/:id/notes is not implemented on backend.');
      } else if (apiErr.status === 401) {
        setDrawerMutationError('401 Unauthorized: Session token expired.');
      } else if (apiErr.status === 403) {
        setDrawerMutationError('403 Forbidden: Insufficient administrative privileges to record internal notes.');
      } else if (apiErr.status === 422) {
        setDrawerMutationError(`422 Validation Error: ${apiErr.message || 'Invalid note content.'}`);
      } else {
        setDrawerMutationError(apiErr.message || 'Failed to record internal note on backend.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatusAndPriority = async (
    ticketId: string,
    newStatus: SupportTicket['status'],
    newPriority: SupportTicket['priority']
  ) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setDrawerMutationError(null);

    try {
      await supportService.updateStatus(ticketId, newStatus, newPriority);
      setBannerText(`Updated ticket status to "${newStatus}" and priority to "${newPriority}".`);
      setTimeout(() => setBannerText(null), 3500);
      await loadData(false);

      if (selectedTicket && selectedTicket.id === ticketId) {
        try {
          const refreshed = await supportService.getById(ticketId);
          if (refreshed.data) setSelectedTicket(refreshed.data);
        } catch {
          setSelectedTicket((prev) => (prev ? { ...prev, status: newStatus, priority: newPriority } : null));
        }
      }
    } catch (err: any) {
      console.warn('[SupportPage] Update status note:', err);
      const apiErr = err as ApiError;
      if (apiErr.status === 404) {
        setDrawerMutationError('BACKEND ENDPOINT REQUIRED: PATCH /support/tickets/:id/status is not implemented on backend.');
        setBannerText('BACKEND ENDPOINT REQUIRED: PATCH /support/tickets/:id/status');
      } else if (apiErr.status === 401) {
        setDrawerMutationError('401 Unauthorized: Session invalid.');
      } else if (apiErr.status === 403) {
        setDrawerMutationError('403 Forbidden: Insufficient administrative privileges.');
      } else {
        setDrawerMutationError(apiErr.message || 'Failed to update ticket status on backend.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmAssignStaff = async (auditReason?: string) => {
    if (!assigningTicket || isSubmitting) return;
    setIsSubmitting(true);
    setModalMutationError(null);

    try {
      await supportService.assignStaff(assigningTicket.id, selectedStaff, auditReason);
      setBannerText(`Ticket ${assigningTicket.ticketNumber} assigned to ${selectedStaff}.`);
      setAssigningTicket(null);
      setTimeout(() => setBannerText(null), 3500);
      await loadData(false);

      if (selectedTicket && selectedTicket.id === assigningTicket.id) {
        try {
          const refreshed = await supportService.getById(assigningTicket.id);
          if (refreshed.data) setSelectedTicket(refreshed.data);
        } catch {
          setSelectedTicket((prev) => (prev ? { ...prev, assignedTo: selectedStaff, assignee: selectedStaff } : null));
        }
      }
    } catch (err: any) {
      console.warn('[SupportPage] Assign staff note:', err);
      const apiErr = err as ApiError;
      if (apiErr.status === 404) {
        setModalMutationError('BACKEND ENDPOINT REQUIRED: POST /support/tickets/:id/assign is not implemented on backend.');
      } else if (apiErr.status === 401) {
        setModalMutationError('401 Unauthorized: Session expired.');
      } else if (apiErr.status === 403) {
        setModalMutationError('403 Forbidden: Insufficient administrative privileges to reassign ticket.');
      } else {
        setModalMutationError(apiErr.message || 'Failed to assign staff lead on backend.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmEscalate = async (auditReason?: string) => {
    if (!escalatingTicket || isSubmitting) return;
    setIsSubmitting(true);
    setModalMutationError(null);

    try {
      await supportService.escalate(escalatingTicket.id, auditReason);
      setBannerText(`Ticket ${escalatingTicket.ticketNumber} escalated to Urgent / Lead SRE.`);
      setEscalatingTicket(null);
      setTimeout(() => setBannerText(null), 3500);
      await loadData(false);

      if (selectedTicket && selectedTicket.id === escalatingTicket.id) {
        try {
          const refreshed = await supportService.getById(escalatingTicket.id);
          if (refreshed.data) setSelectedTicket(refreshed.data);
        } catch {
          setSelectedTicket((prev) => (prev ? { ...prev, priority: 'Urgent', status: 'In Progress' } : null));
        }
      }
    } catch (err: any) {
      console.warn('[SupportPage] Escalate ticket note:', err);
      const apiErr = err as ApiError;
      if (apiErr.status === 404) {
        setModalMutationError('BACKEND ENDPOINT REQUIRED: POST /support/tickets/:id/escalate is not implemented on backend.');
      } else if (apiErr.status === 401) {
        setModalMutationError('401 Unauthorized: Session expired.');
      } else if (apiErr.status === 403) {
        setModalMutationError('403 Forbidden: Insufficient administrative privileges to escalate ticket.');
      } else {
        setModalMutationError(apiErr.message || 'Failed to escalate incident on backend.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: ColumnDef<SupportTicket>[] = [
    {
      key: 'ticketNumber',
      header: 'Ticket #',
      sortable: true,
      render: (t) => <code className="font-mono text-xs font-semibold text-[#11241C]">{t.ticketNumber}</code>,
    },
    {
      key: 'firmName',
      header: 'Firm Name',
      sortable: true,
      render: (t) => <span className="font-semibold text-xs text-[#11241C]">{t.firmName}</span>,
    },
    {
      key: 'subject',
      header: 'Subject',
      render: (t) => <p className="text-xs text-[#283931] line-clamp-1 max-w-sm">{t.subject}</p>,
    },
    {
      key: 'priority',
      header: 'Priority',
      sortable: true,
      render: (t) => {
        const getPriorityBadge = () => {
          switch (t.priority) {
            case 'Urgent':
              return 'bg-[#FAF0ED] text-[#8A1F1D] border-[#F0C2C0]';
            case 'High':
              return 'bg-[#FEF3D6] text-[#855B0F] border-[#E8C872]';
            case 'Medium':
              return 'bg-[#F2EDE2] text-[#54645C] border-[#DDD5C7]';
            case 'Low':
              return 'bg-[#EAF3ED] text-[#144A32] border-[#C2DEC9]';
            default:
              return 'bg-[#F2EDE2] text-[#54645C] border-[#DDD5C7]';
          }
        };
        return (
          <span className={`font-mono text-xs font-semibold px-2 py-0.5 rounded border ${getPriorityBadge()}`}>
            {t.priority}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (t) => {
        const getStatusBadge = () => {
          switch (t.status) {
            case 'Open':
              return 'pending';
            case 'In Progress':
              return 'reviewing';
            case 'Waiting on Firm':
              return 'warning';
            case 'Resolved':
              return 'healthy';
            case 'Closed':
              return 'approved';
            default:
              return 'pending';
          }
        };
        return <StatusBadge status={getStatusBadge()} size="sm" text={t.status} />;
      },
    },
    {
      key: 'category',
      header: 'Category',
      render: (t) => <span className="text-xs text-[#54645C] font-mono">{t.category}</span>,
    },
    {
      key: 'assignedTo',
      header: 'Assignee',
      render: (t) => (
        <span className="text-xs text-[#143D2D] font-medium font-mono">
          {t.assignedTo || t.assignee || 'Unassigned'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created At',
      sortable: true,
      render: (t) => <span className="font-mono text-xs text-[#7A8A82]">{formatDate(t.createdAt)}</span>,
    },
    {
      key: 'lastUpdated',
      header: 'Last Updated',
      sortable: true,
      render: (t) => <span className="font-mono text-xs text-[#7A8A82]">{formatDate(t.lastUpdated)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (t) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => handleOpenTicket(t)}
            className="p-1.5 rounded hover:bg-[#EAE3D4] text-[#54645C] hover:text-[#11241C] transition-colors"
            title="View & Reply"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              setAssigningTicket(t);
              setSelectedStaff(t.assignedTo || t.assignee || 'Vikramaditya Rao');
              setModalMutationError(null);
            }}
            className="p-1.5 rounded hover:bg-[#EAE3D4] text-[#143D2D] transition-colors"
            title="Assign Staff"
          >
            <UserCheck className="w-3.5 h-3.5" />
          </button>

          {t.priority !== 'Urgent' && (
            <button
              onClick={() => {
                setEscalatingTicket(t);
                setModalMutationError(null);
              }}
              className="p-1.5 rounded hover:bg-[#FAF0ED] text-[#8A1F1D] transition-colors"
              title="Escalate Ticket"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <PageContainer
      title="Institutional Support &amp; SLA Management"
      subtitle="Enterprise law firm support queue, SLA response tracking, incident escalation, and partner communications."
      actions={
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-block text-[11px] font-mono text-[#54645C] bg-[#FAF8F3] px-2.5 py-1 rounded-md border border-[#DDD5C7]">
            Live Support Queue (Zero-Mock)
          </span>
          <button
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#DDD5C7] bg-[#FAF8F3] hover:bg-[#F0EAE0] text-xs font-medium text-[#11241C] disabled:opacity-50 transition-colors shadow-xs"
            title="Refetch authoritative tickets from backend"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Fetch Error Banner */}
        {fetchError && (
          <div className="p-4 rounded-xl bg-[#FAF0ED] border border-[#F0C2C0] text-[#8A1F1D] text-xs flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-2.5">
              <AlertOctagon className="w-4 h-4 text-[#8A1F1D] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block text-sm">
                  {fetchError instanceof ApiError && fetchError.status === 401
                    ? '401 Unauthorized — Session Invalid'
                    : fetchError instanceof ApiError && fetchError.status === 403
                    ? '403 Forbidden — Access Restricted'
                    : fetchError instanceof ApiError && fetchError.status === 404
                    ? '404 Not Found — Backend Endpoint Required'
                    : 'Authoritative Backend Support Queue Error'}
                </span>
                <span className="text-xs text-[#8A1F1D]/90 mt-0.5 block">
                  {fetchError.message ||
                    'The authoritative AVENQUIS Backend support queue is not reachable. Showing verified empty state. Zero-mock enforced.'}
                </span>
                <span className="font-mono text-[10px] text-[#A63330] mt-1 block">
                  Target Endpoint: GET /support/tickets
                </span>
              </div>
            </div>
            <button
              onClick={() => loadData(true)}
              disabled={isRefreshing}
              className="px-3 py-1.5 rounded-lg bg-[#8A1F1D] text-white hover:bg-[#6D1817] font-medium text-xs transition-colors shrink-0 flex items-center justify-center gap-1.5"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Retry Authoritative Queue</span>
            </button>
          </div>
        )}

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

        {/* 5 FILTERS & SEARCH */}
        <div className="flex items-center justify-between gap-3 flex-wrap pb-1">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5 text-xs text-[#54645C]">
              <span>Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2 py-1 rounded-lg border border-[#DDD5C7] bg-[#FAF8F3] text-xs"
              >
                <option value="all">All</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Waiting on Firm">Waiting on Firm</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div className="flex items-center gap-1.5 text-xs text-[#54645C]">
              <span>Priority:</span>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-2 py-1 rounded-lg border border-[#DDD5C7] bg-[#FAF8F3] text-xs"
              >
                <option value="all">All</option>
                <option value="Urgent">Urgent</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-1.5 text-xs text-[#54645C]">
              <span>Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-2 py-1 rounded-lg border border-[#DDD5C7] bg-[#FAF8F3] text-xs max-w-[130px] truncate"
              >
                <option value="all">All</option>
                {distinctCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Assignee Filter */}
            <div className="flex items-center gap-1.5 text-xs text-[#54645C]">
              <span>Assignee:</span>
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="px-2 py-1 rounded-lg border border-[#DDD5C7] bg-[#FAF8F3] text-xs max-w-[140px] truncate"
              >
                <option value="all">All</option>
                {distinctAssignees.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            {/* Firm Filter */}
            <div className="flex items-center gap-1.5 text-xs text-[#54645C]">
              <span>Firm:</span>
              <select
                value={firmFilter}
                onChange={(e) => setFirmFilter(e.target.value)}
                className="px-2 py-1 rounded-lg border border-[#DDD5C7] bg-[#FAF8F3] text-xs max-w-[140px] truncate"
              >
                <option value="all">All</option>
                {distinctFirms.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="w-64">
            <FilterBar
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search ticket #, subject..."
              totalCount={filtered.length}
            />
          </div>
        </div>

        {/* DATA TABLE */}
        <DataTable
          columns={columns}
          data={filtered}
          keyExtractor={(t) => t.id}
          emptyMessage={
            isLoading
              ? 'Connecting to authoritative support queue...'
              : 'No support tickets found matching the filters.'
          }
        />

        {/* TICKET DETAIL DRAWER (Thread, Internal Notes, Status Changer, Reply Box) */}
        <DetailsDrawer
          isOpen={!!selectedTicket}
          onClose={() => {
            setSelectedTicket(null);
            setDrawerMutationError(null);
          }}
          title={`Support Dossier: ${selectedTicket?.ticketNumber || ''}`}
          subtitle={selectedTicket ? `${selectedTicket.firmName} — ${selectedTicket.subject}` : ''}
          width="max-w-2xl"
          footer={
            selectedTicket ? (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#7A8A82]">Quick Status:</span>
                  <select
                    value={selectedTicket.status}
                    disabled={isSubmitting}
                    onChange={(e) =>
                      handleUpdateStatusAndPriority(
                        selectedTicket.id,
                        e.target.value as any,
                        selectedTicket.priority
                      )
                    }
                    className="px-2 py-1 rounded border border-[#DDD5C7] bg-white text-xs font-semibold text-[#143D2D] disabled:opacity-50"
                  >
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Waiting on Firm">Waiting on Firm</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setAssigningTicket(selectedTicket);
                      setSelectedStaff(selectedTicket.assignedTo || selectedTicket.assignee || 'Vikramaditya Rao');
                      setModalMutationError(null);
                    }}
                    disabled={isSubmitting}
                    className="px-3 py-1.5 rounded-lg border border-[#DDD5C7] bg-[#FAF8F3] hover:bg-[#F0EAE0] text-xs font-medium text-[#11241C] disabled:opacity-50"
                  >
                    Reassign Staff
                  </button>
                  {selectedTicket.priority !== 'Urgent' && (
                    <button
                      onClick={() => {
                        setEscalatingTicket(selectedTicket);
                        setModalMutationError(null);
                      }}
                      disabled={isSubmitting}
                      className="px-3 py-1.5 rounded-lg border border-[#F0C2C0] bg-[#FAF0ED] text-[#8A1F1D] text-xs font-medium hover:bg-[#F7E1DD] disabled:opacity-50"
                    >
                      Escalate to Urgent
                    </button>
                  )}
                </div>
              </div>
            ) : undefined
          }
        >
          {selectedTicket && (
            <div className="space-y-5 text-xs text-[#11241C]">
              {/* Drawer Mutation Error Banner */}
              {drawerMutationError && (
                <div className="p-3 rounded-lg bg-[#FAF0ED] border border-[#F0C2C0] text-[#8A1F1D] text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-[#8A1F1D] shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-semibold block">Action Blocked / Error</span>
                    <span className="text-[11px] leading-relaxed block">{drawerMutationError}</span>
                  </div>
                </div>
              )}

              {/* Metadata & Status/Priority Changer */}
              <div className="border border-[#DDD5C7] rounded-xl bg-[#FAF8F3] p-4 space-y-3">
                <div className="flex justify-between items-center border-b border-[#EAE3D4] pb-2">
                  <span className="font-serif font-semibold text-xs text-[#11241C]">Ticket Metadata &amp; Controls</span>
                  <span className="font-mono text-[10px] text-[#7A8A82]">SLA: 1 hour critical window</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[#7A8A82] block text-[11px]">Law Firm</span>
                    <span className="font-semibold">{selectedTicket.firmName}</span>
                  </div>
                  <div>
                    <span className="text-[#7A8A82] block text-[11px]">Incident Category</span>
                    <span className="font-mono">{selectedTicket.category}</span>
                  </div>
                  <div>
                    <span className="text-[#7A8A82] block text-[11px]">Assigned Engineer</span>
                    <span className="font-mono font-medium text-[#143D2D]">
                      {selectedTicket.assignedTo || selectedTicket.assignee}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#7A8A82] block text-[11px]">Priority Level</span>
                    <select
                      value={selectedTicket.priority}
                      disabled={isSubmitting}
                      onChange={(e) =>
                        handleUpdateStatusAndPriority(
                          selectedTicket.id,
                          selectedTicket.status,
                          e.target.value as any
                        )
                      }
                      className="px-2 py-0.5 rounded border border-[#DDD5C7] bg-white text-xs font-semibold disabled:opacity-50"
                    >
                      <option value="Urgent">Urgent (P1)</option>
                      <option value="High">High (P2)</option>
                      <option value="Medium">Medium (P3)</option>
                      <option value="Low">Low (P4)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Subtabs: Conversation Messages VS Internal Notes */}
              <div className="border-b border-[#DDD5C7] flex gap-4">
                <button
                  onClick={() => setDrawerTab('messages')}
                  className={`pb-2 text-xs font-medium border-b-2 transition-colors ${
                    drawerTab === 'messages'
                      ? 'border-[#143D2D] text-[#143D2D]'
                      : 'border-transparent text-[#7A8A82] hover:text-[#11241C]'
                  }`}
                >
                  Firm Conversation Thread ({(selectedTicket.messages || []).length})
                </button>
                <button
                  onClick={() => setDrawerTab('notes')}
                  className={`pb-2 text-xs font-medium border-b-2 transition-colors ${
                    drawerTab === 'notes'
                      ? 'border-[#143D2D] text-[#143D2D]'
                      : 'border-transparent text-[#7A8A82] hover:text-[#11241C]'
                  }`}
                >
                  Internal Staff Notes ({(selectedTicket.internalNotes || []).length})
                </button>
              </div>

              {/* TAB 1: CONVERSATION MESSAGES */}
              {drawerTab === 'messages' && (
                <div className="space-y-4">
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {(selectedTicket.messages || [
                      { sender: selectedTicket.firmName, role: 'Firm Partner', timestamp: selectedTicket.createdAt, content: selectedTicket.subject },
                    ]).map((msg, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border text-xs ${
                          msg.role.includes('Super Admin') || msg.role.includes('Staff') || msg.role.includes('Support')
                            ? 'bg-[#EAF3ED] border-[#C2DEC9] ml-4'
                            : 'bg-[#FAF8F3] border-[#DDD5C7] mr-4'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1 text-[10px] text-[#7A8A82]">
                          <span className="font-semibold text-[#11241C]">
                            {msg.sender} ({msg.role})
                          </span>
                          <span className="font-mono">{formatDate(msg.timestamp)}</span>
                        </div>
                        <p className="text-xs text-[#182620] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    ))}
                  </div>

                  {/* Reply Box */}
                  <div className="space-y-2 pt-2 border-t border-[#EAE3D4]">
                    <label className="font-semibold block text-xs">Dispatch Response to Firm</label>
                    <textarea
                      value={replyInput}
                      disabled={isSubmitting}
                      onChange={(e) => setReplyInput(e.target.value)}
                      placeholder="Type response to partner counsel..."
                      rows={3}
                      className="w-full px-3 py-2 rounded-lg border border-[#DDD5C7] bg-white text-xs disabled:opacity-50"
                    />
                    <button
                      onClick={handleSendReply}
                      disabled={!replyInput.trim() || isSubmitting}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#143D2D] hover:bg-[#0E2C20] text-[#FAF7F0] text-xs font-medium disabled:opacity-50 transition-colors shadow-xs"
                    >
                      {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      <span>{isSubmitting ? 'Dispatching...' : 'Send Official Reply'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: INTERNAL STAFF NOTES */}
              {drawerTab === 'notes' && (
                <div className="space-y-4">
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {(selectedTicket.internalNotes || []).length === 0 ? (
                      <p className="text-xs text-[#7A8A82] italic py-2">No internal staff notes recorded yet.</p>
                    ) : (
                      selectedTicket.internalNotes?.map((n, idx) => (
                        <div key={idx} className="p-2.5 rounded-lg bg-[#F2EDE2] border border-[#E0D8CA] text-xs">
                          <div className="flex justify-between items-center text-[10px] text-[#7A8A82] mb-1">
                            <span className="font-semibold text-[#143D2D]">{n.author}</span>
                            <span className="font-mono">{formatDate(n.timestamp)}</span>
                          </div>
                          <p className="text-xs text-[#182620]">{n.note}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Note Box */}
                  <div className="space-y-2 pt-2 border-t border-[#EAE3D4]">
                    <label className="font-semibold block text-xs">Add Confidential Internal Note</label>
                    <textarea
                      value={noteInput}
                      disabled={isSubmitting}
                      onChange={(e) => setNoteInput(e.target.value)}
                      placeholder="Only visible to platform super administrators and engineers..."
                      rows={2}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#DDD5C7] bg-white text-xs disabled:opacity-50"
                    />
                    <button
                      onClick={handleAddInternalNote}
                      disabled={!noteInput.trim() || isSubmitting}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#DDD5C7] bg-[#FAF8F3] hover:bg-[#F0EAE0] text-xs font-medium text-[#11241C] disabled:opacity-50 transition-colors"
                    >
                      {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      <span>{isSubmitting ? 'Recording...' : 'Record Internal Note'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DetailsDrawer>

        {/* ASSIGN STAFF MODAL */}
        <ConfirmationModal
          isOpen={!!assigningTicket}
          onClose={() => {
            setAssigningTicket(null);
            setModalMutationError(null);
          }}
          onConfirm={handleConfirmAssignStaff}
          title={`Assign Incident Lead: ${assigningTicket?.ticketNumber || ''}`}
          confirmText={isSubmitting ? 'Assigning...' : 'Confirm Staff Assignment'}
          isLoading={isSubmitting}
          variant="primary"
          auditReasonPlaceholder="Reason for reassigning support incident"
        >
          {assigningTicket && (
            <div className="space-y-3 text-xs text-[#11241C]">
              {modalMutationError && (
                <div className="p-2.5 rounded-lg bg-[#FAF0ED] border border-[#F0C2C0] text-[#8A1F1D] text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-[#8A1F1D] shrink-0 mt-0.5" />
                  <span className="text-[11px] leading-relaxed">{modalMutationError}</span>
                </div>
              )}

              <div className="p-3 rounded-lg bg-[#FAF8F3] border border-[#DDD5C7]">
                <p className="font-semibold text-xs">{assigningTicket.subject}</p>
                <p className="text-[11px] text-[#54645C] mt-0.5">Firm: {assigningTicket.firmName}</p>
              </div>

              <div className="space-y-1">
                <label className="font-semibold block text-xs">Select Lead Staff Member / SRE</label>
                <select
                  value={selectedStaff}
                  disabled={isSubmitting}
                  onChange={(e) => setSelectedStaff(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-[#DDD5C7] bg-white text-xs font-medium disabled:opacity-50"
                >
                  <option value="Vikramaditya Rao">Vikramaditya Rao (Lead Platform SRE)</option>
                  <option value="Devika Nambiar">Devika Nambiar (Senior Cryptography Operator)</option>
                  <option value="Siddharth Menon">Siddharth Menon (Legal Systems Architect)</option>
                  <option value="Platform Support Desk">Platform Support Desk (Shared Pool)</option>
                </select>
              </div>
            </div>
          )}
        </ConfirmationModal>

        {/* ESCALATE MODAL */}
        <ConfirmationModal
          isOpen={!!escalatingTicket}
          onClose={() => {
            setEscalatingTicket(null);
            setModalMutationError(null);
          }}
          onConfirm={handleConfirmEscalate}
          title={`Escalate Incident ${escalatingTicket?.ticketNumber || ''}`}
          confirmText={isSubmitting ? 'Escalating...' : 'Escalate to Urgent / P1'}
          isLoading={isSubmitting}
          variant="danger"
          auditReasonPlaceholder="Emergency technical ground or legal breach threat"
        >
          {escalatingTicket && (
            <div className="space-y-2 text-xs text-[#11241C]">
              {modalMutationError && (
                <div className="p-2.5 rounded-lg bg-[#FAF0ED] border border-[#F0C2C0] text-[#8A1F1D] text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-[#8A1F1D] shrink-0 mt-0.5" />
                  <span className="text-[11px] leading-relaxed">{modalMutationError}</span>
                </div>
              )}

              <div className="p-3 rounded-lg bg-[#FAF0ED] border border-[#F0C2C0]">
                <p className="font-semibold text-xs text-[#8A1F1D]">{escalatingTicket.subject}</p>
                <p className="text-[11px] text-[#A63330] mt-1">
                  Escalating this ticket elevates priority to <strong>Urgent</strong>, triggers on-call pager duty for Platform SREs, and notifies the managing partner.
                </p>
              </div>
            </div>
          )}
        </ConfirmationModal>
      </div>
    </PageContainer>
  );
};
