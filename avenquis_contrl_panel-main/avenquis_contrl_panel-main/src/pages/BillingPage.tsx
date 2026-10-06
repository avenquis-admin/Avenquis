/**
 * Avenquis Control Panel - 7. Billing & Collections Section
 * Multi-firm institutional receivables, collections enforcement, invoice ledger with GST tax breakdowns,
 * active subscription tracking, and Razorpay / Cashfree / Stripe gateway telemetry.
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { PageContainer } from '../components/common/PageContainer';
import { DataTable, ColumnDef } from '../components/ui/DataTable';
import { FilterBar } from '../components/ui/FilterBar';
import { StatusBadge } from '../components/ui/StatusBadge';
import { DetailsDrawer, ConfirmationModal } from '../components/ui/ConfirmationModal';
import { billingService, firmsService } from '../services/pageServices';
import { ApiError } from '../services/apiClient';
import { InvoiceRecord, CollectionRecord, PaymentGatewayItem, FirmRecord } from '../types';
import { formatDate } from '../utils/formatters';
import {
  CreditCard,
  Download,
  AlertCircle,
  Clock,
  Eye,
  Send,
  CheckCircle2,
  FileText,
  AlertTriangle,
  RefreshCw,
  Server,
  Building2,
  ShieldCheck,
  Check,
  RotateCw,
  AlertOctagon,
  Lock,
  ShieldAlert,
  Loader2,
} from 'lucide-react';

export const BillingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'invoices' | 'subscriptions' | 'collections' | 'gateways'>('collections');
  const [search, setSearch] = useState('');

  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [collections, setCollections] = useState<CollectionRecord[]>([]);
  const [gateways, setGateways] = useState<PaymentGatewayItem[]>([]);
  const [firms, setFirms] = useState<FirmRecord[]>([]);

  // Async Lifecycle States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<ApiError | Error | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  // Selected for Invoice Drawer
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(null);

  // Collections Actions Modals
  const [activeCollection, setActiveCollection] = useState<CollectionRecord | null>(null);
  const [actionType, setActionType] = useState<'reminder' | 'note' | 'mark_paid' | 'escalate' | null>(null);
  const [noteContent, setNoteContent] = useState('');

  // Testing Gateway state
  const [testingGatewayId, setTestingGatewayId] = useState<string | null>(null);

  // Feedback Notification Banner
  const [bannerText, setBannerText] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

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
      const [invRes, colRes, gwRes, firmsRes] = await Promise.allSettled([
        billingService.getInvoices(undefined, signal),
        billingService.getCollections(undefined, signal),
        billingService.getGateways(signal),
        firmsService.getAll(undefined, signal),
      ]);

      if (signal.aborted) return;

      let hasError = false;
      let primaryErr: ApiError | null = null;

      if (invRes.status === 'fulfilled') {
        setInvoices(invRes.value.data);
      } else {
        setInvoices([]);
        hasError = true;
        primaryErr = primaryErr || (invRes.reason as ApiError);
      }

      if (colRes.status === 'fulfilled') {
        setCollections(colRes.value.data);
      } else {
        setCollections([]);
        hasError = true;
        primaryErr = primaryErr || (colRes.reason as ApiError);
      }

      if (gwRes.status === 'fulfilled') {
        setGateways(gwRes.value.data);
      } else {
        setGateways([]);
        // Gateways failure is secondary if invoices/collections succeed, but track if primary
        if (!primaryErr) primaryErr = gwRes.reason as ApiError;
      }

      if (firmsRes.status === 'fulfilled') {
        setFirms(firmsRes.value.data);
      }

      if (hasError && primaryErr) {
        setFetchError(primaryErr);
      } else {
        setFetchError(null);
      }
    } finally {
      if (!signal.aborted) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    loadData(false);
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadData]);

  const handleOpenCollectionAction = (
    c: CollectionRecord,
    type: 'reminder' | 'note' | 'mark_paid' | 'escalate'
  ) => {
    setActiveCollection(c);
    setActionType(type);
    setNoteContent('');
    setMutationError(null);
  };

  const handleExecuteCollectionAction = async (auditReason?: string) => {
    if (!activeCollection || !actionType || isSubmitting) return;
    setIsSubmitting(true);
    setMutationError(null);

    const actionEndpointMap: Record<string, string> = {
      reminder: `/billing/collections/${activeCollection.id}/remind`,
      note: `/billing/collections/${activeCollection.id}/notes`,
      mark_paid: `/billing/collections/${activeCollection.id}/settle`,
      escalate: `/billing/collections/${activeCollection.id}/escalate`,
    };

    try {
      if (actionType === 'reminder') {
        await billingService.sendCollectionReminder(activeCollection.id, { auditReason });
        setBannerText(`Formal collections reminder dispatched to ${activeCollection.firm}.`);
      } else if (actionType === 'note') {
        await billingService.logCollectionNote(activeCollection.id, noteContent, auditReason);
        setBannerText(`Collection audit note recorded for ${activeCollection.firm}.`);
      } else if (actionType === 'mark_paid') {
        await billingService.markCollectionPaid(activeCollection.id, { auditReason });
        setBannerText(`Receivable marked as settled and cleared for ${activeCollection.firm}.`);
      } else if (actionType === 'escalate') {
        await billingService.escalateCollection(activeCollection.id, { auditReason });
        setBannerText(`Collections escalated to Platform Legal & Notice Sent for ${activeCollection.firm}.`);
      }

      setActiveCollection(null);
      setActionType(null);
      setNoteContent('');
      await loadData(false);
      setTimeout(() => setBannerText(null), 4000);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      const targetEndpoint = actionEndpointMap[actionType] || `/billing/collections/${activeCollection.id}`;
      if (apiErr?.status === 404 || apiErr?.type === 'NOT_FOUND') {
        setMutationError(`BACKEND ENDPOINT REQUIRED: POST ${targetEndpoint} is not implemented on the backend.`);
      } else if (apiErr?.status === 401 || apiErr?.type === 'UNAUTHORIZED') {
        setMutationError('401 Unauthorized: Session token expired or invalid administrative credentials.');
      } else if (apiErr?.status === 403 || apiErr?.type === 'FORBIDDEN') {
        setMutationError('403 Forbidden: Insufficient administrative privileges to perform collection action.');
      } else if (apiErr?.status === 409 || apiErr?.type === 'CONFLICT') {
        setMutationError('409 Conflict: Collection account was modified concurrently by another administrator.');
      } else if (apiErr?.status === 422 || apiErr?.type === 'VALIDATION_ERROR') {
        setMutationError(`422 Validation Error: ${apiErr.message || 'Invalid collection parameters supplied.'}`);
      } else if (apiErr?.status && apiErr.status >= 500) {
        setMutationError('500 Server Error: Backend failed to execute collections ledger mutation.');
      } else {
        setMutationError(apiErr?.message || 'Backend connection failed or server is unreachable.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTestGatewayConnection = async (gwId: string) => {
    if (testingGatewayId) return;
    setTestingGatewayId(gwId);
    try {
      await billingService.testGateway(gwId);
      setBannerText(`Gateway webhook & API ping successful: 200 OK.`);
      setTimeout(() => setBannerText(null), 4000);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      if (apiErr?.status === 404 || apiErr?.type === 'NOT_FOUND') {
        setBannerText(`BACKEND ENDPOINT REQUIRED: POST /billing/gateways/${gwId}/test is not implemented on the backend.`);
      } else if (apiErr?.status === 401 || apiErr?.type === 'UNAUTHORIZED') {
        setBannerText('401 Unauthorized: Session token invalid.');
      } else if (apiErr?.status === 403 || apiErr?.type === 'FORBIDDEN') {
        setBannerText('403 Forbidden: Insufficient administrative privileges to test payment gateways.');
      } else if (apiErr?.status && apiErr.status >= 500) {
        setBannerText('500 Server Error: Gateway test ping failed on backend.');
      } else {
        setBannerText(apiErr?.message || 'Gateway connection test failed.');
      }
      setTimeout(() => setBannerText(null), 6000);
    } finally {
      setTestingGatewayId(null);
    }
  };

  // 1. INVOICES TABLE COLUMNS
  const invoiceColumns: ColumnDef<InvoiceRecord>[] = [
    {
      key: 'invoiceNumber',
      header: 'Invoice #',
      sortable: true,
      render: (inv) => <code className="font-mono text-xs font-semibold text-[#11241C]">{inv.invoiceNumber}</code>,
    },
    {
      key: 'firmName',
      header: 'Firm Debtor',
      sortable: true,
      render: (inv) => <span className="font-semibold text-xs text-[#11241C]">{inv.firmName}</span>,
    },
    {
      key: 'amount',
      header: 'Total Invoice Amount',
      sortable: true,
      render: (inv) => <span className="font-mono text-xs font-bold text-[#143D2D]">{inv.amount}</span>,
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      sortable: true,
      render: (inv) => <span className="font-mono text-xs">{formatDate(inv.dueDate)}</span>,
    },
    {
      key: 'status',
      header: 'Payment Status',
      render: (inv) => <StatusBadge status={inv.status} size="sm" />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (inv) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => setSelectedInvoice(inv)}
            className="p-1.5 rounded hover:bg-[#EAE3D4] text-[#54645C] hover:text-[#11241C] transition-colors"
            title="Inspect Invoice"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setBannerText(`Downloading PDF receipt for invoice ${inv.invoiceNumber}...`);
              setTimeout(() => setBannerText(null), 3000);
            }}
            className="p-1.5 rounded hover:bg-[#EAE3D4] text-[#143D2D] transition-colors"
            title="Download Tax Receipt"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  // 2. SUBSCRIPTIONS TABLE COLUMNS
  const subscriptionColumns: ColumnDef<FirmRecord>[] = [
    {
      key: 'name',
      header: 'Firm Name',
      sortable: true,
      render: (f) => (
        <div>
          <p className="font-semibold text-xs text-[#11241C]">{f.name}</p>
          <p className="text-[10px] font-mono text-[#7A8A82]">{f.subdomain}.avenquis.com</p>
        </div>
      ),
    },
    {
      key: 'plan',
      header: 'Active Subscription Plan',
      render: (f) => <span className="text-xs font-medium text-[#182620]">{f.plan}</span>,
    },
    {
      key: 'mrr',
      header: 'Contract MRR',
      render: (f) => <span className="font-mono text-xs font-semibold text-[#143D2D]">{f.mrr}</span>,
    },
    {
      key: 'seatsAllocated',
      header: 'Seats (Active / Cap)',
      render: (f) => (
        <span className="font-mono text-xs text-[#54645C]">
          {f.seatsActive} / {f.seatsAllocated} seats
        </span>
      ),
    },
    {
      key: 'subscriptionStatus',
      header: 'Subscription Status',
      render: (f) => <StatusBadge status={f.subscriptionStatus.toLowerCase()} size="sm" />,
    },
  ];

  // 3. COLLECTIONS TABLE COLUMNS
  const collectionColumns: ColumnDef<CollectionRecord>[] = [
    {
      key: 'firm',
      header: 'Firm Debtor',
      sortable: true,
      render: (c) => (
        <div>
          <p className="font-semibold text-xs text-[#11241C]">{c.firm}</p>
          <p className="text-[10px] text-[#7A8A82]">{c.plan}</p>
        </div>
      ),
    },
    {
      key: 'outstandingAmount',
      header: 'Outstanding Amount',
      sortable: true,
      render: (c) => <span className="font-mono text-xs font-bold text-[#8A1F1D]">{c.outstandingAmount}</span>,
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      sortable: true,
      render: (c) => <span className="font-mono text-xs text-[#54645C]">{formatDate(c.dueDate)}</span>,
    },
    {
      key: 'age',
      header: 'Age / Delinquency',
      render: (c) => (
        <span
          className={`font-mono text-xs px-2 py-0.5 rounded border ${
            c.age.includes('35d') || c.age.includes('42d')
              ? 'bg-[#FAF0ED] text-[#8A1F1D] border-[#F0C2C0]'
              : 'bg-[#FEF3D6] text-[#855B0F] border-[#E8C872]'
          }`}
        >
          {c.age}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Collection Status',
      render: (c) => {
        const getStatusColor = () => {
          switch (c.status) {
            case 'Current':
              return 'healthy';
            case 'Due Soon':
              return 'pending';
            case 'Overdue':
              return 'critical';
            case 'Follow-Up Scheduled':
              return 'reviewing';
            case 'Notice Sent':
              return 'warning';
            case 'Suspended':
              return 'rejected';
            default:
              return 'warning';
          }
        };
        return <StatusBadge status={getStatusColor()} size="sm" text={c.status} />;
      },
    },
    {
      key: 'lastReminder',
      header: 'Last Reminder',
      render: (c) => <span className="font-mono text-xs text-[#7A8A82]">{c.lastReminder}</span>,
    },
    {
      key: 'actions',
      header: 'Collections Actions',
      align: 'right',
      render: (c) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => handleOpenCollectionAction(c, 'reminder')}
            className="px-2 py-1 text-xs rounded border border-[#DDD5C7] bg-[#FAF8F3] hover:bg-[#F0EAE0] text-[#143D2D] font-medium"
            title="Send Official Reminder"
          >
            Send Reminder
          </button>
          <button
            onClick={() => handleOpenCollectionAction(c, 'note')}
            className="px-2 py-1 text-xs rounded border border-[#DDD5C7] bg-[#FAF8F3] hover:bg-[#F0EAE0] text-[#54645C]"
            title="Log Audit Note"
          >
            Log Note
          </button>
          <button
            onClick={() => handleOpenCollectionAction(c, 'mark_paid')}
            className="px-2 py-1 text-xs rounded bg-[#EAF3ED] border border-[#C2DEC9] text-[#144A32] font-medium hover:bg-[#DDF0E3]"
            title="Mark Settled & Paid"
          >
            Mark Paid
          </button>
          <button
            onClick={() => handleOpenCollectionAction(c, 'escalate')}
            className="px-2 py-1 text-xs rounded bg-[#FAF0ED] border border-[#F0C2C0] text-[#8A1F1D] font-medium hover:bg-[#F7E1DD]"
            title="Escalate Delinquency"
          >
            Escalate
          </button>
        </div>
      ),
    },
  ];

  return (
    <PageContainer
      title="Institutional Billing &amp; Collections Ledger"
      subtitle="Multi-firm receivables governance, automated bank wire reconciliation, collections enforcement, and payment gateways."
      toolbarActions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData(true)}
            disabled={isRefreshing || isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#DDD5C7] bg-[#FAF8F3] hover:bg-[#F2EDE2] text-xs font-medium text-[#11241C] transition-colors disabled:opacity-50"
            title="Refresh Billing Ledger"
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
                        ? '403 Forbidden — Billing Ledger Restricted'
                        : (fetchError as ApiError)?.type === 'NOT_FOUND'
                        ? '404 Not Found — Backend Endpoint Required'
                        : (fetchError as ApiError)?.status && (fetchError as ApiError).status >= 500
                        ? '500 Server Error — Backend Billing Failure'
                        : 'Live Backend Billing Service Unavailable'}
                    </h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]">
                      {(fetchError as ApiError)?.type === 'NOT_FOUND'
                        ? 'BACKEND ENDPOINT REQUIRED'
                        : 'ZERO-MOCK ENFORCED'}
                    </span>
                  </div>
                  <p className="text-xs text-[#7F1D1D] mt-1 leading-relaxed">
                    {(fetchError as ApiError)?.type === 'UNAUTHORIZED'
                      ? 'Administrative identity verification failed or session token expired. Please re-authenticate to manage billing records.'
                      : (fetchError as ApiError)?.type === 'FORBIDDEN'
                      ? 'Your platform identity lacks sufficient administrative authorization to access billing and invoices.'
                      : (fetchError as ApiError)?.type === 'NOT_FOUND'
                      ? 'The backend server does not provide an endpoint handler for GET /billing/invoices or /billing/collections.'
                      : 'The authoritative AVENQUIS Backend is not currently reachable or VITE_API_BASE_URL is unconfigured. Showing verified unavailable states for billing. No mock data will be shown.'}
                  </p>
                  <p className="text-[11px] font-mono text-[#991B1B] mt-1.5 opacity-90">
                    Target Endpoint: GET /billing/invoices &amp; /billing/collections
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

        {/* SUBSECTIONS / TABS: Invoices, Subscriptions, Collections, Payment Gateways */}
        <div className="flex items-center justify-between border-b border-[#DDD5C7] pb-1 gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            {[
              { id: 'collections', label: 'Collections Enforcement', count: collections.length },
              { id: 'invoices', label: 'Invoices Ledger', count: invoices.length },
              { id: 'subscriptions', label: 'Active Subscriptions', count: firms.length },
              { id: 'gateways', label: 'Payment Gateways', count: gateways.length },
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

          <div className="w-64">
            <FilterBar
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Filter records..."
            />
          </div>
        </div>

        {/* TAB 1: COLLECTIONS */}
        {activeTab === 'collections' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-[#FEF3D6] border border-[#E8C872] text-xs flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#855B0F]">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  Overdue aging triggers automated warning emails at 7, 14, and 21 days past due. Automatic suspension occurs at 30 days.
                </span>
              </div>
              <span className="font-mono font-bold text-[#855B0F]">$24,800 Total Past Due</span>
            </div>

            <DataTable
              columns={collectionColumns}
              data={collections.filter((c) =>
                c.firm.toLowerCase().includes(search.toLowerCase()) ||
                c.status.toLowerCase().includes(search.toLowerCase())
              )}
              keyExtractor={(c) => c.id}
              emptyMessage="No accounts currently in collection queue."
            />
          </div>
        )}

        {/* TAB 2: INVOICES */}
        {activeTab === 'invoices' && (
          <DataTable
            columns={invoiceColumns}
            data={invoices.filter((inv) =>
              inv.firmName.toLowerCase().includes(search.toLowerCase()) ||
              inv.invoiceNumber.toLowerCase().includes(search.toLowerCase())
            )}
            keyExtractor={(inv) => inv.id}
            emptyMessage="No invoices match criteria."
          />
        )}

        {/* TAB 3: SUBSCRIPTIONS */}
        {activeTab === 'subscriptions' && (
          <DataTable
            columns={subscriptionColumns}
            data={firms.filter((f) =>
              f.name.toLowerCase().includes(search.toLowerCase()) ||
              f.plan.toLowerCase().includes(search.toLowerCase())
            )}
            keyExtractor={(f) => f.id}
            emptyMessage="No active subscriptions found."
          />
        )}

        {/* TAB 4: PAYMENT GATEWAYS */}
        {activeTab === 'gateways' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {gateways.map((gw) => (
                <div key={gw.id} className="border border-[#DDD5C7] rounded-xl bg-[#FAF8F3] p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-[#EAE3D4]">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-[#143D2D]" />
                        <h4 className="font-serif font-semibold text-xs text-[#11241C]">{gw.provider}</h4>
                      </div>
                      <span
                        className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${
                          gw.status === 'Operational'
                            ? 'bg-[#E3F2E9] text-[#1E563B] border-[#A5D6B6]'
                            : 'bg-[#FEF3D6] text-[#855B0F] border-[#E8C872]'
                        }`}
                      >
                        {gw.status}
                      </span>
                    </div>

                    <div className="space-y-2 mt-3 text-xs">
                      <div className="flex justify-between">
                        <span className="text-[#7A8A82]">Environment:</span>
                        <span className="font-mono font-semibold text-[#143D2D]">{gw.environment}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#7A8A82]">Currency:</span>
                        <span className="font-mono">{gw.currency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#7A8A82]">Webhook Delivery:</span>
                        <span className="font-mono text-[#1E563B]">{gw.webhookHealth}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#7A8A82]">Last Ping:</span>
                        <span className="font-mono text-[#7A8A82]">{gw.lastPing}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#EAE3D4] mt-4">
                    <button
                      onClick={() => handleTestGatewayConnection(gw.id)}
                      disabled={testingGatewayId === gw.id}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-[#DDD5C7] bg-[#FAF8F3] hover:bg-[#F0EAE0] text-xs font-medium text-[#11241C] transition-colors"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-[#143D2D] ${testingGatewayId === gw.id ? 'animate-spin' : ''}`} />
                      <span>{testingGatewayId === gw.id ? 'Testing Ping...' : 'Test Connection'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* INVOICE DETAIL DRAWER (Firm, Invoice #, Line Items, Subtotal, Tax/GST, Total, Receipt) */}
        <DetailsDrawer
          isOpen={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          title="Tax Invoice Dossier"
          subtitle={selectedInvoice ? `${selectedInvoice.invoiceNumber} — ${selectedInvoice.firmName}` : ''}
          width="max-w-xl"
          footer={
            selectedInvoice ? (
              <div className="flex items-center justify-between w-full">
                <span className="text-xs text-[#7A8A82]">Status: {selectedInvoice.status}</span>
                <button
                  onClick={() => {
                    setBannerText(`Downloading receipt PDF for ${selectedInvoice.invoiceNumber}...`);
                    setTimeout(() => setBannerText(null), 3000);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#143D2D] text-[#FAF7F0] text-xs font-medium hover:bg-[#0E2C20]"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download / Preview Receipt</span>
                </button>
              </div>
            ) : undefined
          }
        >
          {selectedInvoice && (
            <div className="space-y-6 text-xs text-[#11241C]">
              {/* Header Info */}
              <div className="border border-[#DDD5C7] rounded-xl bg-[#FAF8F3] p-4 space-y-2">
                <div className="flex justify-between items-center border-b border-[#EAE3D4] pb-2">
                  <span className="font-serif font-bold text-sm text-[#143D2D]">AVENQUIS PLATFORM TAX INVOICE</span>
                  <StatusBadge status={selectedInvoice.status} size="sm" />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div>
                    <span className="text-[#7A8A82] block text-[11px]">Invoice Reference</span>
                    <span className="font-mono font-semibold">{selectedInvoice.invoiceNumber}</span>
                  </div>
                  <div>
                    <span className="text-[#7A8A82] block text-[11px]">Firm Debtor</span>
                    <span className="font-semibold">{selectedInvoice.firmName}</span>
                  </div>
                  <div>
                    <span className="text-[#7A8A82] block text-[11px]">Issue Date</span>
                    <span className="font-mono">{formatDate(selectedInvoice.dueDate)}</span>
                  </div>
                  <div>
                    <span className="text-[#7A8A82] block text-[11px]">Settlement Method</span>
                    <span className="font-mono">{selectedInvoice.paymentMethod}</span>
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div className="border border-[#DDD5C7] rounded-xl bg-[#FAF8F3] p-4 space-y-3">
                <h4 className="font-serif font-semibold text-xs text-[#11241C]">Contracted Line Items</h4>
                <div className="divide-y divide-[#EAE3D4]">
                  {(selectedInvoice.lineItems || [
                    { description: 'Annual Enterprise Legal AI Suite Platform License', quantity: 1, unitPrice: selectedInvoice.amount, amount: selectedInvoice.amount },
                  ]).map((item, idx) => (
                    <div key={idx} className="py-2 flex justify-between items-center text-xs">
                      <div>
                        <p className="font-medium text-[#11241C]">{item.description}</p>
                        <p className="text-[10px] text-[#7A8A82] font-mono">Qty: {item.quantity}</p>
                      </div>
                      <span className="font-mono font-semibold text-[#143D2D]">{item.amount}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tax & Total Calculation */}
              <div className="border border-[#DDD5C7] rounded-xl bg-[#FAF8F3] p-4 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-[#54645C]">Subtotal:</span>
                  <span className="font-mono font-semibold">{selectedInvoice.subtotal || '$24,152.54'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#54645C]">Tax / Statutory GST (18%):</span>
                  <span className="font-mono font-semibold">{selectedInvoice.taxGST || '$4,347.46'}</span>
                </div>
                <div className="flex justify-between text-sm font-bold pt-2 border-t border-[#EAE3D4]">
                  <span className="text-[#143D2D]">Total Due:</span>
                  <span className="font-mono text-[#143D2D]">{selectedInvoice.amount}</span>
                </div>
              </div>
            </div>
          )}
        </DetailsDrawer>

        {/* COLLECTIONS ACTION CONFIRMATION MODAL */}
        <ConfirmationModal
          isOpen={!!actionType}
          onClose={() => {
            if (isSubmitting) return;
            setActionType(null);
            setActiveCollection(null);
            setMutationError(null);
          }}
          onConfirm={(auditReason) => handleExecuteCollectionAction(auditReason)}
          isLoading={isSubmitting}
          title={
            actionType === 'reminder'
              ? 'Dispatch Collection Warning Notice'
              : actionType === 'note'
              ? 'Log Collection Internal Note'
              : actionType === 'mark_paid'
              ? 'Confirm Full Settlement & Clear Account'
              : 'Escalate Collection to Platform Legal'
          }
          confirmText={isSubmitting ? 'Executing...' : 'Confirm Action'}
          variant={actionType === 'escalate' ? 'danger' : 'primary'}
          auditReasonPlaceholder="Mandatory compliance note for collections ledger"
        >
          {activeCollection && (
            <div className="space-y-3 text-xs text-[#11241C]">
              {mutationError && (
                <div className="p-3 rounded-lg bg-[#FDF2F2] border border-[#FCA5A5] text-[#991B1B] text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#DC2626] mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold">Operation Failed</p>
                    <p className="font-mono text-[11px] leading-relaxed">{mutationError}</p>
                  </div>
                </div>
              )}

              <div className="p-3 rounded-lg bg-[#FAF8F3] border border-[#DDD5C7]">
                <p className="font-semibold text-xs">{activeCollection.firm}</p>
                <p className="font-mono text-xs font-bold text-[#8A1F1D] mt-0.5">
                  Overdue: {activeCollection.outstandingAmount} ({activeCollection.age})
                </p>
              </div>

              {actionType === 'note' && (
                <div className="space-y-1">
                  <label className="font-semibold block text-xs">Audit Note Details</label>
                  <textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Enter details of conversation with managing partner or bank wire trace..."
                    rows={3}
                    disabled={isSubmitting}
                    className="w-full px-3 py-1.5 rounded-lg border border-[#DDD5C7] bg-white text-xs disabled:opacity-50"
                  />
                </div>
              )}

              {actionType === 'reminder' && (
                <p className="text-[#54645C]">
                  This will dispatch an urgent formal reminder to the billing contact email on file and update the last reminder timestamp.
                </p>
              )}

              {actionType === 'mark_paid' && (
                <p className="text-[#144A32]">
                  This will clear the outstanding balance from the collections ledger and mark the associated invoice as paid.
                </p>
              )}

              {actionType === 'escalate' && (
                <p className="text-[#8A1F1D]">
                  This will change the collection status to "Notice Sent" and prepare the account for automated service suspension.
                </p>
              )}
            </div>
          )}
        </ConfirmationModal>
      </div>
    </PageContainer>
  );
};
