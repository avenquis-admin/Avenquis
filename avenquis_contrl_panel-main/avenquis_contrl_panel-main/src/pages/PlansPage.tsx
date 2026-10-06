/**
 * Avenquis Control Panel - 6. Plans & Subscriptions Section
 * Tier configuration, institutional packaging for the 4 official pricing structures:
 * 1. Single Article Student (₹7,500/year, 1 Student Login)
 * 2. Individual Proprietor / Firm Owner (₹15,000/year, 1 Login)
 * 3. Proprietor Firm with 5 Student Login (₹30,000/year, 1 Firm Login + 5 Student Logins)
 * 4. Partnership Firm (₹50,000/year, 4 Partner Logins + 10 Student Logins)
 * Features cards, edit modals, subscribed firm drawers, active subscriptions summary table,
 * and plan assignment workflow UI.
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { PageContainer } from '../components/common/PageContainer';
import { DataTable, ColumnDef } from '../components/ui/DataTable';
import { StatusBadge } from '../components/ui/StatusBadge';
import { DetailsDrawer, ConfirmationModal } from '../components/ui/ConfirmationModal';
import { plansService, firmsService } from '../services/pageServices';
import { ApiError } from '../services/apiClient';
import { PlanRecord, FirmRecord } from '../types';
import { formatDate } from '../utils/formatters';
import {
  Layers,
  Check,
  Building2,
  Users,
  Edit2,
  Plus,
  Eye,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Cpu,
  RotateCw,
  AlertOctagon,
  Lock,
  ShieldAlert,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

export const PlansPage: React.FC = () => {
  const [plans, setPlans] = useState<PlanRecord[]>([]);
  const [firms, setFirms] = useState<FirmRecord[]>([]);

  // Async Lifecycle States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<ApiError | Error | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  // Modals & Drawers
  const [editingPlan, setEditingPlan] = useState<PlanRecord | null>(null);
  const [viewingFirmsPlan, setViewingFirmsPlan] = useState<PlanRecord | null>(null);
  const [createPlanModalOpen, setCreatePlanModalOpen] = useState(false);
  const [assignPlanModalOpen, setAssignPlanModalOpen] = useState(false);

  // New Plan form state
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanPrice, setNewPlanPrice] = useState('₹40,000');
  const [newPlanCycle, setNewPlanCycle] = useState('Annual (Yearly)');
  const [newPlanLogins, setNewPlanLogins] = useState('2 Partner Logins + 5 Student Logins');
  const [newPlanDesc, setNewPlanDesc] = useState('');

  // Assign Plan form state
  const [assignFirmId, setAssignFirmId] = useState('');
  const [assignTargetPlan, setAssignTargetPlan] = useState('');

  // Notification Banner
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
      const [plansRes, firmsRes] = await Promise.allSettled([
        plansService.getAll(undefined, signal),
        firmsService.getAll(undefined, signal),
      ]);

      if (signal.aborted) return;

      if (plansRes.status === 'fulfilled') {
        setPlans(plansRes.value.data);
        setFetchError(null);
      } else {
        setPlans([]);
        setFetchError(plansRes.reason as ApiError);
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
  }, []);

  useEffect(() => {
    loadData(false);
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadData]);

  const handleOpenEditPlan = (plan: PlanRecord) => {
    setEditingPlan({ ...plan });
    setMutationError(null);
  };

  const handleSaveEditPlan = async (reason?: string) => {
    if (!editingPlan || isSubmitting) return;
    setIsSubmitting(true);
    setMutationError(null);

    try {
      await plansService.update(editingPlan.id, editingPlan, reason);
      setBannerText(`Plan "${editingPlan.name}" updated successfully.`);
      setEditingPlan(null);
      await loadData(false);
      setTimeout(() => setBannerText(null), 3500);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      if (apiErr?.status === 404 || apiErr?.type === 'NOT_FOUND') {
        setMutationError(`BACKEND ENDPOINT REQUIRED: PATCH /plans/${editingPlan.id} is not implemented on the backend.`);
      } else if (apiErr?.status === 401 || apiErr?.type === 'UNAUTHORIZED') {
        setMutationError('401 Unauthorized: Session token expired or invalid administrative credentials.');
      } else if (apiErr?.status === 403 || apiErr?.type === 'FORBIDDEN') {
        setMutationError('403 Forbidden: Insufficient administrative privileges to modify plan configuration.');
      } else if (apiErr?.status === 409 || apiErr?.type === 'CONFLICT') {
        setMutationError('409 Conflict: Plan tier was modified concurrently by another administrator.');
      } else if (apiErr?.status === 422 || apiErr?.type === 'VALIDATION_ERROR') {
        setMutationError(`422 Validation Error: ${apiErr.message || 'Invalid plan parameters supplied.'}`);
      } else if (apiErr?.status && apiErr.status >= 500) {
        setMutationError('500 Server Error: Backend failed to update plan definition.');
      } else {
        setMutationError(apiErr?.message || 'Backend connection failed or server is unreachable.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenCreateVariant = () => {
    setNewPlanName('');
    setNewPlanPrice('₹40,000');
    setNewPlanCycle('Annual (Yearly)');
    setNewPlanLogins('2 Partner Logins + 5 Student Logins');
    setNewPlanDesc('');
    setMutationError(null);
    setCreatePlanModalOpen(true);
  };

  const handleCreatePlanVariant = async (reason?: string) => {
    if (!newPlanName.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setMutationError(null);

    try {
      await plansService.createVariant(
        {
          name: newPlanName.trim(),
          price: newPlanPrice.trim(),
          billingCycle: newPlanCycle.trim(),
          description: newPlanDesc.trim() || 'Custom institutional legal packaging.',
          allowedLogins: newPlanLogins.trim(),
          features: ['Dedicated Tenant Isolation', 'Verifiable Audit Trail', 'Priority Legal AI'],
          activeSubscriptionsCount: 0,
          status: 'Active',
        },
        reason
      );
      setBannerText(`Created new plan tier: "${newPlanName}".`);
      setCreatePlanModalOpen(false);
      setNewPlanName('');
      await loadData(false);
      setTimeout(() => setBannerText(null), 3500);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      if (apiErr?.status === 404 || apiErr?.type === 'NOT_FOUND') {
        setMutationError('BACKEND ENDPOINT REQUIRED: POST /plans is not implemented on the backend.');
      } else if (apiErr?.status === 401 || apiErr?.type === 'UNAUTHORIZED') {
        setMutationError('401 Unauthorized: Session token expired or invalid administrative credentials.');
      } else if (apiErr?.status === 403 || apiErr?.type === 'FORBIDDEN') {
        setMutationError('403 Forbidden: Insufficient administrative privileges to create plan tiers.');
      } else if (apiErr?.status === 409 || apiErr?.type === 'CONFLICT') {
        setMutationError('409 Conflict: A plan tier with this name or code already exists.');
      } else if (apiErr?.status === 422 || apiErr?.type === 'VALIDATION_ERROR') {
        setMutationError(`422 Validation Error: ${apiErr.message || 'Invalid plan parameters supplied.'}`);
      } else if (apiErr?.status && apiErr.status >= 500) {
        setMutationError('500 Server Error: Backend failed to create plan variant.');
      } else {
        setMutationError(apiErr?.message || 'Backend connection failed or server is unreachable.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenAssignPlan = () => {
    setAssignFirmId(firms[0]?.id || '');
    setAssignTargetPlan(plans[0]?.name || '');
    setMutationError(null);
    setAssignPlanModalOpen(true);
  };

  const handleConfirmAssignPlan = async (reason?: string) => {
    if (!assignFirmId || !assignTargetPlan || isSubmitting) return;
    setIsSubmitting(true);
    setMutationError(null);

    try {
      await firmsService.updatePlan(assignFirmId, assignTargetPlan);
      const firmName = firms.find((f) => f.id === assignFirmId)?.name || 'Firm';
      setBannerText(`Assigned plan "${assignTargetPlan}" to ${firmName}.`);
      setAssignPlanModalOpen(false);
      await loadData(false);
      setTimeout(() => setBannerText(null), 3500);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      if (apiErr?.status === 404 || apiErr?.type === 'NOT_FOUND') {
        setMutationError(`BACKEND ENDPOINT REQUIRED: PATCH /firms/${assignFirmId} is not implemented on the backend.`);
      } else if (apiErr?.status === 401 || apiErr?.type === 'UNAUTHORIZED') {
        setMutationError('401 Unauthorized: Session token expired or invalid administrative credentials.');
      } else if (apiErr?.status === 403 || apiErr?.type === 'FORBIDDEN') {
        setMutationError('403 Forbidden: Insufficient administrative privileges to reassign firm plans.');
      } else if (apiErr?.status === 409 || apiErr?.type === 'CONFLICT') {
        setMutationError('409 Conflict: Firm plan was modified concurrently by another administrator.');
      } else if (apiErr?.status === 422 || apiErr?.type === 'VALIDATION_ERROR') {
        setMutationError(`422 Validation Error: ${apiErr.message || 'Invalid subscription parameters supplied.'}`);
      } else if (apiErr?.status && apiErr.status >= 500) {
        setMutationError('500 Server Error: Backend failed to assign subscription plan to firm.');
      } else {
        setMutationError(apiErr?.message || 'Backend connection failed or server is unreachable.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Firms subscribed to viewingFirmsPlan
  const subscribedFirms = firms.filter((f) => viewingFirmsPlan && f.plan === viewingFirmsPlan.name);

  // Subscribed Firms columns
  const subscribedFirmsColumns: ColumnDef<FirmRecord>[] = [
    {
      key: 'name',
      header: 'Firm Name',
      render: (f) => (
        <div>
          <p className="font-semibold text-xs text-[#11241C]">{f.name}</p>
          <p className="text-[10px] font-mono text-[#7A8A82]">{f.subdomain}.avenquis.com</p>
        </div>
      ),
    },
    {
      key: 'seatsActive',
      header: 'Seat Utilization',
      render: (f) => (
        <span className="font-mono text-xs text-[#143D2D]">
          {f.seatsActive} / {f.seatsAllocated} seats
        </span>
      ),
    },
    {
      key: 'subscriptionStatus',
      header: 'Subscription Status',
      render: (f) => <StatusBadge status={f.subscriptionStatus.toLowerCase()} size="sm" />,
    },
    {
      key: 'mrr',
      header: 'Contract MRR',
      render: (f) => <span className="font-mono text-xs font-semibold">{f.mrr}</span>,
    },
  ];

  // Active Subscriptions Summary Table columns
  const activeSubColumns: ColumnDef<FirmRecord>[] = [
    {
      key: 'name',
      header: 'Law Firm Tenancy',
      render: (f) => (
        <div>
          <p className="font-semibold text-xs text-[#11241C]">{f.name}</p>
          <p className="text-[10px] font-mono text-[#7A8A82]">{f.subdomain}.avenquis.com</p>
        </div>
      ),
    },
    {
      key: 'plan',
      header: 'Subscribed Plan Tier',
      render: (f) => <span className="font-medium text-xs text-[#143D2D]">{f.plan}</span>,
    },
    {
      key: 'seatsAllocated',
      header: 'Allocated Seats',
      render: (f) => <span className="font-mono text-xs">{f.seatsAllocated} Seats</span>,
    },
    {
      key: 'subscriptionStatus',
      header: 'Billing Status',
      render: (f) => <StatusBadge status={f.subscriptionStatus.toLowerCase()} size="sm" />,
    },
    {
      key: 'mrr',
      header: 'Annual Value (ARR Equiv)',
      render: (f) => (
        <span className="font-mono text-xs font-semibold text-[#11241C]">
          {f.plan?.includes('50,000') || f.plan === 'Partnership Firm'
            ? '₹50,000/yr'
            : f.plan?.includes('30,000') || f.plan?.includes('Proprietor Firm with 5')
            ? '₹30,000/yr'
            : f.plan?.includes('15,000') || f.plan?.includes('Individual Proprietor')
            ? '₹15,000/yr'
            : '₹7,500/yr'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      render: (f) => (
        <button
          onClick={() => {
            setAssignFirmId(f.id);
            setAssignTargetPlan(f.plan);
            setMutationError(null);
            setAssignPlanModalOpen(true);
          }}
          className="text-xs px-2.5 py-1 rounded border border-[#DDD5C7] bg-[#FAF8F3] hover:bg-[#F2EDE2] text-[#143D2D] font-medium"
        >
          Change Plan
        </button>
      ),
    },
  ];

  return (
    <PageContainer
      title="Plans &amp; Subscription Packages"
      subtitle="Official pricing structures, login quota rules, feature matrix, and firm tier entitlements."
      toolbarActions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData(true)}
            disabled={isRefreshing || isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#DDD5C7] bg-[#FAF8F3] hover:bg-[#F2EDE2] text-xs font-medium text-[#11241C] transition-colors disabled:opacity-50"
            title="Refresh Plan Tiers"
          >
            <RotateCw
              className={`w-3.5 h-3.5 text-[#6B7280] ${
                isRefreshing ? 'animate-spin text-[#143D2D]' : ''
              }`}
            />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleOpenAssignPlan}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#DDD5C7] bg-[#FAF8F3] hover:bg-[#F2EDE2] text-xs font-medium text-[#11241C] transition-colors"
          >
            <CreditCard className="w-3.5 h-3.5 text-[#143D2D]" />
            <span>Assign Plan to Firm</span>
          </button>

          <button
            onClick={handleOpenCreateVariant}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#143D2D] hover:bg-[#0E2C20] text-[#FAF7F0] text-xs font-medium transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Plan Variant</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
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
                        ? '403 Forbidden — Plan Management Restricted'
                        : (fetchError as ApiError)?.type === 'NOT_FOUND'
                        ? '404 Not Found — Backend Endpoint Required'
                        : (fetchError as ApiError)?.status && (fetchError as ApiError).status >= 500
                        ? '500 Server Error — Backend Plan Service Failure'
                        : 'Live Backend Plan Catalog Unavailable'}
                    </h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]">
                      {(fetchError as ApiError)?.type === 'NOT_FOUND'
                        ? 'BACKEND ENDPOINT REQUIRED'
                        : 'ZERO-MOCK ENFORCED'}
                    </span>
                  </div>
                  <p className="text-xs text-[#7F1D1D] mt-1 leading-relaxed">
                    {(fetchError as ApiError)?.type === 'UNAUTHORIZED'
                      ? 'Administrative identity verification failed or session token expired. Please re-authenticate to configure plans.'
                      : (fetchError as ApiError)?.type === 'FORBIDDEN'
                      ? 'Your platform identity lacks sufficient administrative authorization to access the plan catalog.'
                      : (fetchError as ApiError)?.type === 'NOT_FOUND'
                      ? 'The backend server does not provide an endpoint handler for GET /plans.'
                      : 'The authoritative AVENQUIS Backend is not currently reachable or VITE_API_BASE_URL is unconfigured. Showing verified unavailable states for plan catalog. No mock data will be shown.'}
                  </p>
                  <p className="text-[11px] font-mono text-[#991B1B] mt-1.5 opacity-90">
                    Target Endpoint: GET /plans
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

        {/* 4 OFFICIAL PLAN CARDS GRID */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#7A8A82]">
              Standard Enterprise Packaging Matrix
            </h3>
            <span className="text-[11px] text-[#7A8A82]">All tiers enforce annual billing &amp; compliant data residency</span>
          </div>

          {isLoading && plans.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="border border-[#DDD5C7] rounded-xl bg-[#FAF8F3] p-5 animate-pulse space-y-4">
                  <div className="h-4 bg-[#EAE3D4] rounded w-1/3"></div>
                  <div className="h-6 bg-[#EAE3D4] rounded w-2/3"></div>
                  <div className="h-10 bg-[#EAE3D4] rounded w-full"></div>
                  <div className="h-20 bg-[#EAE3D4] rounded w-full"></div>
                </div>
              ))}
            </div>
          ) : plans.length === 0 && !fetchError ? (
            <div className="border border-[#DDD5C7] rounded-xl bg-[#FAF8F3] p-8 text-center text-xs text-[#54645C]">
              No plan tier definitions returned from backend catalog. Click "Create Plan Variant" to deploy a new plan.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className="border border-[#DDD5C7] rounded-xl bg-[#FAF8F3] p-5 shadow-xs flex flex-col justify-between hover:border-[#143D2D] transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#EAE3D4] text-[#143D2D]">
                        {plan.billingCycle || plan.billingInterval || 'Annual'}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                          plan.status === 'Active' || plan.status === 'active'
                            ? 'bg-[#E3F2E9] text-[#1E563B] border-[#A5D6B6]'
                            : 'bg-[#F2EDE2] text-[#7A8A82] border-[#DDD5C7]'
                        }`}
                      >
                        {plan.status}
                      </span>
                    </div>

                    <h4 className="font-serif font-semibold text-sm text-[#11241C] mt-2.5">{plan.name}</h4>
                    <p className="text-[11px] text-[#54645C] mt-1 min-h-[32px]">{plan.description}</p>

                    <div className="my-3 pb-3 border-b border-[#EAE3D4]">
                      <div className="flex items-baseline gap-1">
                        <span className="font-serif font-bold text-xl text-[#143D2D]">
                          {plan.price || plan.priceDisplay || plan.basePrice || 'Custom'}
                        </span>
                        <span className="text-[11px] text-[#7A8A82]">/ year</span>
                      </div>
                      <p className="text-[11px] font-semibold text-[#855B0F] mt-1 font-mono">
                        {plan.allowedLogins || plan.seatConfiguration || 'Custom Seats'}
                      </p>
                    </div>

                    {/* Feature Checklist */}
                    <div className="space-y-1.5 mb-4">
                      <span className="text-[10px] uppercase font-semibold text-[#7A8A82] block tracking-wide">
                        Entitlements:
                      </span>
                      {(plan.features || ['Dedicated Tenant Isolation', 'Verifiable Audit Trail', 'Priority Legal AI']).map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-1.5 text-xs text-[#283931]">
                          <Check className="w-3.5 h-3.5 text-[#143D2D] shrink-0 mt-0.5" />
                          <span className="text-[11px]">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="p-2 rounded bg-[#F2EDE2] border border-[#E0D8CA] mb-3 flex items-center justify-between text-xs">
                      <span className="text-[#54645C]">Active Subscriptions:</span>
                      <span className="font-mono font-bold text-[#143D2D]">
                        {plan.activeSubscriptionsCount ?? plan.activeSubscriptions ?? 0} Firms
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setViewingFirmsPlan(plan)}
                        className="inline-flex items-center justify-center gap-1 py-1.5 rounded-lg border border-[#DDD5C7] bg-[#FAF8F3] hover:bg-[#F0EAE0] text-xs font-medium text-[#11241C]"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Firms</span>
                      </button>
                      <button
                        onClick={() => handleOpenEditPlan(plan)}
                        className="inline-flex items-center justify-center gap-1 py-1.5 rounded-lg bg-[#143D2D] hover:bg-[#0E2C20] text-[#FAF7F0] text-xs font-medium shadow-xs"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit Plan</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ACTIVE SUBSCRIPTIONS SUMMARY TABLE */}
        <div className="border border-[#DDD5C7] rounded-xl bg-[#FAF8F3] p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#EAE3D4]">
            <div>
              <h3 className="text-sm font-serif font-semibold text-[#11241C]">
                Active Law Firm Subscriptions Ledger
              </h3>
              <p className="text-xs text-[#54645C]">
                Real-time mapping of managed enterprise tenancies to enrolled packaging contracts
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-[#143D2D]">
              Total Managed: {firms.length} Firms
            </span>
          </div>

          <DataTable
            columns={activeSubColumns}
            data={firms}
            keyExtractor={(f) => f.id}
            emptyMessage="No active law firm subscriptions enrolled."
          />
        </div>

        {/* VIEW SUBSCRIBED FIRMS DRAWER */}
        <DetailsDrawer
          isOpen={!!viewingFirmsPlan}
          onClose={() => setViewingFirmsPlan(null)}
          title={`Subscribed Firms — ${viewingFirmsPlan?.name || ''}`}
          subtitle={`Annual Fee: ${viewingFirmsPlan?.price}/yr • ${viewingFirmsPlan?.allowedLogins}`}
          width="max-w-xl"
        >
          {viewingFirmsPlan && (
            <div className="space-y-4">
              <p className="text-xs text-[#54645C]">
                The following {subscribedFirms.length} law firm tenancies are currently active under the{' '}
                <strong>{viewingFirmsPlan.name}</strong> packaging agreement:
              </p>
              <DataTable
                columns={subscribedFirmsColumns}
                data={subscribedFirms}
                keyExtractor={(f) => f.id}
                emptyMessage="No law firms currently subscribed to this tier."
              />
            </div>
          )}
        </DetailsDrawer>

        {/* EDIT PLAN MODAL */}
        <ConfirmationModal
          isOpen={!!editingPlan}
          onClose={() => {
            if (!isSubmitting) {
              setEditingPlan(null);
              setMutationError(null);
            }
          }}
          onConfirm={handleSaveEditPlan}
          title={`Edit Tier: ${editingPlan?.name || ''}`}
          confirmText={isSubmitting ? 'Saving Changes...' : 'Save Plan Modifications'}
          variant="primary"
          isLoading={isSubmitting}
          auditReasonPlaceholder="Mandatory reason for pricing or login allocation modification"
        >
          {editingPlan && (
            <div className="space-y-3 text-xs text-[#11241C]">
              {mutationError && (
                <div className="p-3 rounded-lg bg-[#FDF2F2] border border-[#F5D3D3] text-[#991B1B] text-xs flex items-start gap-2">
                  <AlertOctagon className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold">Plan Mutation Failed</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed">{mutationError}</p>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="font-semibold block text-xs">Plan Name</label>
                <input
                  type="text"
                  disabled={isSubmitting}
                  value={editingPlan.name}
                  onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-[#DDD5C7] bg-white text-xs disabled:opacity-60"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-semibold block text-xs">Annual Price</label>
                  <input
                    type="text"
                    disabled={isSubmitting}
                    value={editingPlan.price || ''}
                    onChange={(e) => setEditingPlan({ ...editingPlan, price: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-[#DDD5C7] bg-white text-xs font-mono disabled:opacity-60"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold block text-xs">Billing Cycle</label>
                  <input
                    type="text"
                    disabled={isSubmitting}
                    value={editingPlan.billingCycle || ''}
                    onChange={(e) => setEditingPlan({ ...editingPlan, billingCycle: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-[#DDD5C7] bg-white text-xs disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold block text-xs">Allowed Logins &amp; Role Breakdown</label>
                <input
                  type="text"
                  disabled={isSubmitting}
                  value={String(editingPlan.allowedLogins || '')}
                  onChange={(e) => setEditingPlan({ ...editingPlan, allowedLogins: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-[#DDD5C7] bg-white text-xs font-mono disabled:opacity-60"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold block text-xs">Description</label>
                <textarea
                  disabled={isSubmitting}
                  value={editingPlan.description || ''}
                  onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-1.5 rounded-lg border border-[#DDD5C7] bg-white text-xs disabled:opacity-60"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold block text-xs">Status</label>
                <select
                  disabled={isSubmitting}
                  value={editingPlan.status}
                  onChange={(e) => setEditingPlan({ ...editingPlan, status: e.target.value as any })}
                  className="w-full px-3 py-1.5 rounded-lg border border-[#DDD5C7] bg-white text-xs disabled:opacity-60"
                >
                  <option value="Active">Active</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>
            </div>
          )}
        </ConfirmationModal>

        {/* CREATE PLAN VARIANT MODAL */}
        <ConfirmationModal
          isOpen={createPlanModalOpen}
          onClose={() => {
            if (!isSubmitting) {
              setCreatePlanModalOpen(false);
              setMutationError(null);
            }
          }}
          onConfirm={handleCreatePlanVariant}
          title="Create New Enterprise Plan Variant"
          confirmText={isSubmitting ? 'Deploying...' : 'Deploy Plan Definition'}
          variant="primary"
          isLoading={isSubmitting}
          auditReasonPlaceholder="Commercial justification for custom tier variant"
        >
          <div className="space-y-3 text-xs text-[#11241C]">
            {mutationError && (
              <div className="p-3 rounded-lg bg-[#FDF2F2] border border-[#F5D3D3] text-[#991B1B] text-xs flex items-start gap-2">
                <AlertOctagon className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">Creation Failed</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed">{mutationError}</p>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="font-semibold block text-xs">Plan Title</label>
              <input
                type="text"
                disabled={isSubmitting}
                value={newPlanName}
                onChange={(e) => setNewPlanName(e.target.value)}
                placeholder="e.g. Mid-Market Specialized Chambers"
                className="w-full px-3 py-1.5 rounded-lg border border-[#DDD5C7] bg-white text-xs disabled:opacity-60"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="font-semibold block text-xs">Annual Price (INR)</label>
                <input
                  type="text"
                  disabled={isSubmitting}
                  value={newPlanPrice}
                  onChange={(e) => setNewPlanPrice(e.target.value)}
                  placeholder="₹40,000"
                  className="w-full px-3 py-1.5 rounded-lg border border-[#DDD5C7] bg-white text-xs font-mono disabled:opacity-60"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold block text-xs">Billing Interval</label>
                <input
                  type="text"
                  disabled={isSubmitting}
                  value={newPlanCycle}
                  onChange={(e) => setNewPlanCycle(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-[#DDD5C7] bg-white text-xs disabled:opacity-60"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold block text-xs">Allowed Logins &amp; Role Breakdown</label>
              <input
                type="text"
                disabled={isSubmitting}
                value={newPlanLogins}
                onChange={(e) => setNewPlanLogins(e.target.value)}
                placeholder="e.g. 2 Partner Logins + 5 Student Logins"
                className="w-full px-3 py-1.5 rounded-lg border border-[#DDD5C7] bg-white text-xs font-mono disabled:opacity-60"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold block text-xs">Plan Scope &amp; Target Firms</label>
              <textarea
                disabled={isSubmitting}
                value={newPlanDesc}
                onChange={(e) => setNewPlanDesc(e.target.value)}
                placeholder="Institutional description of suitable practice scale..."
                rows={2}
                className="w-full px-3 py-1.5 rounded-lg border border-[#DDD5C7] bg-white text-xs disabled:opacity-60"
              />
            </div>
          </div>
        </ConfirmationModal>

        {/* PLAN ASSIGNMENT / CHANGE WORKFLOW MODAL */}
        <ConfirmationModal
          isOpen={assignPlanModalOpen}
          onClose={() => {
            if (!isSubmitting) {
              setAssignPlanModalOpen(false);
              setMutationError(null);
            }
          }}
          onConfirm={handleConfirmAssignPlan}
          title="Assign Plan Packaging to Law Firm"
          confirmText={isSubmitting ? 'Executing Assignment...' : 'Execute Plan Assignment'}
          variant="primary"
          isLoading={isSubmitting}
          auditReasonPlaceholder="Reason for subscription migration or renewal"
        >
          <div className="space-y-3 text-xs text-[#11241C]">
            {mutationError && (
              <div className="p-3 rounded-lg bg-[#FDF2F2] border border-[#F5D3D3] text-[#991B1B] text-xs flex items-start gap-2">
                <AlertOctagon className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">Assignment Failed</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed">{mutationError}</p>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="font-semibold block text-xs">Select Target Law Firm</label>
              <select
                disabled={isSubmitting}
                value={assignFirmId}
                onChange={(e) => setAssignFirmId(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-[#DDD5C7] bg-white text-xs disabled:opacity-60"
              >
                {firms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} (Current: {f.plan})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold block text-xs">Select New Subscription Plan</label>
              <select
                disabled={isSubmitting}
                value={assignTargetPlan}
                onChange={(e) => setAssignTargetPlan(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-[#DDD5C7] bg-white text-xs font-semibold text-[#143D2D] disabled:opacity-60"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name} — {p.price || p.priceDisplay || ''}/year ({p.allowedLogins || p.seatConfiguration || ''})
                  </option>
                ))}
              </select>
            </div>

            <p className="text-[11px] text-[#54645C]">
              Notice: Modifying a firm's subscription adjusts seat ceilings immediately and schedules invoice adjustments for pro-rated billing.
            </p>
          </div>
        </ConfirmationModal>
      </div>
    </PageContainer>
  );
};

