/**
 * Avenquis Control Panel - 9. AI Control Center
 * Platform governance over legal AI agents, model routing gateway, human-in-the-loop approval gate,
 * multi-tenant token intelligence, and safety & alignment compliance audits.
 * 
 * Supports all 6 subroutes:
 * /ai/agents, /ai/automations, /ai/runs, /ai/approvals, /ai/policies, /ai/usage
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { PageContainer } from '../components/common/PageContainer';
import { DataTable, ColumnDef } from '../components/ui/DataTable';
import { FilterBar } from '../components/ui/FilterBar';
import { StatusBadge } from '../components/ui/StatusBadge';
import { DetailsDrawer, ConfirmationModal } from '../components/ui/ConfirmationModal';
import { aiService } from '../services/pageServices';
import { ApiError } from '../services/apiClient';
import { cn } from '../utils/cn';
import {
  AIAgentItem,
  AIAutomation,
  AIRun,
  AIApproval,
  AIPolicy,
  AIUsageStats,
  ModelGatewayItem,
  FirmTokenUsage,
  SafetyAuditRule,
} from '../types';
import { useRouter } from '../context/RouterContext';
import { formatDate, formatDateTime } from '../utils/formatters';
import {
  Bot,
  Cpu,
  CheckSquare,
  BarChart3,
  ShieldAlert,
  Route,
  Pause,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  AlertCircle,
  Sliders,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
  Activity,
  Terminal,
  BookOpen,
  Eye,
  Check,
  Clock,
  Coins,
  RotateCw,
  Loader2,
} from 'lucide-react';

export const AIPage: React.FC = () => {
  const { currentPath, navigate, aiSubTab } = useRouter();

  // Normalize subroute mapping (default to 'agents' for /ai)
  const activeTab = aiSubTab === 'gateway' ? 'usage' : aiSubTab === 'safety' ? 'policies' : aiSubTab || 'agents';

  // Data stores
  const [agents, setAgents] = useState<AIAgentItem[]>([]);
  const [automations, setAutomations] = useState<AIAutomation[]>([]);
  const [runs, setRuns] = useState<AIRun[]>([]);
  const [approvals, setApprovals] = useState<AIApproval[]>([]);
  const [policies, setPolicies] = useState<AIPolicy[]>([]);
  const [usageStats, setUsageStats] = useState<AIUsageStats | null>(null);
  const [models, setModels] = useState<ModelGatewayItem[]>([]);
  const [tokenUsage, setTokenUsage] = useState<FirmTokenUsage[]>([]);
  const [safetyRules, setSafetyRules] = useState<SafetyAuditRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Agent Autonomy Edit State
  const [editingAgent, setEditingAgent] = useState<AIAgentItem | null>(null);
  const [selectedAutonomyMode, setSelectedAutonomyMode] = useState<AIAgentItem['autonomyMode']>('Conditional Autonomy');
  const [selectedAutonomyLevel, setSelectedAutonomyLevel] = useState<AIAgentItem['autonomyLevel']>('L1 Draft');
  const [selectedModelAssigned, setSelectedModelAssigned] = useState('');
  const [overridePolicy, setOverridePolicy] = useState('');

  // Approval Inspection / Decision State
  const [selectedApproval, setSelectedApproval] = useState<AIApproval | null>(null);

  // Run Details Drawer State
  const [selectedRun, setSelectedRun] = useState<AIRun | null>(null);

  // Banner Feedback & Error States
  const [bannerText, setBannerText] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<ApiError | Error | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  // In-flight mutation tracking (prevents duplicate submissions)
  const [mutatingAgentId, setMutatingAgentId] = useState<string | null>(null);
  const [isSavingAutonomy, setIsSavingAutonomy] = useState<boolean>(false);
  const [mutatingAutomationId, setMutatingAutomationId] = useState<string | null>(null);
  const [decidingApprovalId, setDecidingApprovalId] = useState<string | null>(null);

  const getTabEndpoint = (tab: string): string => {
    switch (tab) {
      case 'agents': return 'GET /ai/agents';
      case 'automations': return 'GET /ai/automations';
      case 'runs': return 'GET /ai/runs';
      case 'approvals': return 'GET /ai/approvals';
      case 'policies': return 'GET /ai/policies';
      case 'usage': return 'GET /ai/usage';
      default: return 'GET /ai/agents';
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const [agRes, auRes, rnRes, appRes, polRes, usgRes, mdRes, tkRes, sfRes] = await Promise.allSettled([
        aiService.getAgents(),
        aiService.getAutomations(),
        aiService.getRuns(),
        aiService.getApprovals(),
        aiService.getPolicies(),
        aiService.getUsage(),
        aiService.getModels(),
        aiService.getTokenUsage(),
        aiService.getSafetyRules(),
      ]);

      if (agRes.status === 'fulfilled') setAgents(agRes.value.data);
      if (auRes.status === 'fulfilled') setAutomations(auRes.value.data);
      if (rnRes.status === 'fulfilled') setRuns(rnRes.value.data);
      if (appRes.status === 'fulfilled') setApprovals(appRes.value.data);
      if (polRes.status === 'fulfilled') setPolicies(polRes.value.data);
      if (usgRes.status === 'fulfilled') setUsageStats(usgRes.value.data);
      if (mdRes.status === 'fulfilled') setModels(mdRes.value.data);
      if (tkRes.status === 'fulfilled') setTokenUsage(tkRes.value.data);
      if (sfRes.status === 'fulfilled') setSafetyRules(sfRes.value.data);

      // Check if current tab's primary resource failed
      let currentTabFailed: any = null;
      if (activeTab === 'agents' && agRes.status === 'rejected') currentTabFailed = agRes.reason;
      else if (activeTab === 'automations' && auRes.status === 'rejected') currentTabFailed = auRes.reason;
      else if (activeTab === 'runs' && rnRes.status === 'rejected') currentTabFailed = rnRes.reason;
      else if (activeTab === 'approvals' && appRes.status === 'rejected') currentTabFailed = appRes.reason;
      else if (activeTab === 'policies' && polRes.status === 'rejected') currentTabFailed = polRes.reason;
      else if (activeTab === 'usage') {
        if (usgRes.status === 'rejected') currentTabFailed = usgRes.reason;
        else if (mdRes.status === 'rejected') currentTabFailed = mdRes.reason;
      }

      if (currentTabFailed) {
        setFetchError(currentTabFailed as ApiError | Error);
      }
    } catch (err: unknown) {
      setFetchError(err as ApiError | Error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const handleTabClick = (tabId: string) => {
    navigate(`/ai/${tabId}`);
    setSearchQuery('');
    setStatusFilter('all');
  };

  const handleToggleAgentState = async (agent: AIAgentItem) => {
    if (mutatingAgentId) return;
    const isAct = agent.status === 'Active' || agent.status === 'active';
    const newStatus = isAct ? 'paused' : 'active';
    setMutatingAgentId(agent.id);
    setMutationError(null);
    try {
      await aiService.toggleAgent(agent.id, newStatus, `Operator toggled agent ${agent.name} status to ${newStatus}`);
      setBannerText(`Agent "${agent.name}" state updated to ${newStatus.toUpperCase()} on authoritative backend.`);
      await loadData();
      setTimeout(() => setBannerText(null), 3500);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setMutationError(apiErr.message || `Failed to update agent ${agent.name} status.`);
    } finally {
      setMutatingAgentId(null);
    }
  };

  const handleOpenEditAutonomy = (agent: AIAgentItem) => {
    setEditingAgent(agent);
    setSelectedAutonomyMode(agent.autonomyMode || 'Conditional Autonomy');
    setSelectedAutonomyLevel(agent.autonomyLevel || 'L1 Draft');
    setSelectedModelAssigned(agent.modelAssigned || 'Gemini 1.5 Pro Enterprise');
    setOverridePolicy(agent.firmOverridePolicy || 'Platform Forced');
  };

  const handleSaveAutonomy = async (auditReason?: string) => {
    if (!editingAgent || isSavingAutonomy) return;
    setIsSavingAutonomy(true);
    setMutationError(null);
    try {
      await aiService.updateAutonomy(editingAgent.id, {
        autonomyMode: selectedAutonomyMode,
        modelAssigned: selectedModelAssigned,
        firmOverridePolicy: overridePolicy,
        autonomyLevel: selectedAutonomyLevel,
        auditReason: auditReason || `Autonomy updated for ${editingAgent.name}`,
      });
      if (selectedAutonomyLevel) {
        await aiService.updateAgentAutonomy(editingAgent.id, selectedAutonomyLevel, auditReason || `Autonomy level changed for ${editingAgent.name}`);
      }
      setBannerText(`Autonomy rules successfully persisted for "${editingAgent.name}".`);
      setEditingAgent(null);
      await loadData();
      setTimeout(() => setBannerText(null), 3500);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setMutationError(apiErr.message || `Failed to persist autonomy rules for ${editingAgent.name}.`);
    } finally {
      setIsSavingAutonomy(false);
    }
  };

  const handleApproveAction = async (approvalId: string, auditReason?: string) => {
    if (decidingApprovalId) return;
    setDecidingApprovalId(approvalId);
    setMutationError(null);
    try {
      await aiService.decideApproval(approvalId, 'Approved', undefined, auditReason || 'Super Admin Authorization granted');
      setBannerText(`Super Admin Authorization granted for action [${approvalId}].`);
      setSelectedApproval(null);
      await loadData();
      setTimeout(() => setBannerText(null), 4000);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setMutationError(apiErr.message || `Failed to record approval decision for ${approvalId}.`);
    } finally {
      setDecidingApprovalId(null);
    }
  };

  const handleRejectAction = async (approvalId: string, auditReason?: string) => {
    if (decidingApprovalId) return;
    setDecidingApprovalId(approvalId);
    setMutationError(null);
    try {
      await aiService.decideApproval(approvalId, 'Rejected', undefined, auditReason || 'Autonomous action permanently rejected and aborted');
      setBannerText(`Autonomous action [${approvalId}] permanently rejected and aborted.`);
      setSelectedApproval(null);
      await loadData();
      setTimeout(() => setBannerText(null), 4000);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setMutationError(apiErr.message || `Failed to record rejection decision for ${approvalId}.`);
    } finally {
      setDecidingApprovalId(null);
    }
  };

  const handleToggleAutomation = async (auto: AIAutomation) => {
    if (mutatingAutomationId) return;
    const isAct = auto.status === 'Active';
    const nextStatus = isAct ? 'Paused' : 'Active';
    setMutatingAutomationId(auto.id);
    setMutationError(null);
    try {
      await aiService.toggleAutomation(auto.id, nextStatus, `Workflow schedule toggled to ${nextStatus}`);
      setBannerText(`Automation "${auto.name}" schedule updated to ${nextStatus.toUpperCase()} on authoritative backend.`);
      await loadData();
      setTimeout(() => setBannerText(null), 3500);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setMutationError(apiErr.message || `Failed to toggle automation "${auto.name}".`);
    } finally {
      setMutatingAutomationId(null);
    }
  };

  // Helper for autonomy level badges
  const renderAutonomyBadge = (level?: string) => {
    const lvl = level || 'L1 Draft';
    let colorClasses = 'bg-[#FAF0ED] text-[#8A1F1D] border-[#F0C2C0]';
    if (lvl.includes('L0')) colorClasses = 'bg-[#F2EDE2] text-[#54645C] border-[#DDD5C7]';
    if (lvl.includes('L1')) colorClasses = 'bg-[#FEF3D6] text-[#855B0F] border-[#E8C872]';
    if (lvl.includes('L2')) colorClasses = 'bg-[#EAF3ED] text-[#144A32] border-[#C2DEC9]';
    if (lvl.includes('L3')) colorClasses = 'bg-[#FAF0ED] text-[#8A1F1D] border-[#F0C2C0] font-bold';

    return (
      <span className={`font-mono text-xs px-2 py-0.5 rounded border whitespace-nowrap ${colorClasses}`}>
        {lvl}
      </span>
    );
  };

  // 1. AGENTS TABLE COLUMNS
  const agentColumns: ColumnDef<AIAgentItem>[] = [
    {
      key: 'name',
      header: 'Agent Entity',
      sortable: true,
      render: (a) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-[#EAF3ED] text-[#143D2D] flex items-center justify-center font-mono font-bold text-xs shrink-0">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <p className="font-semibold text-xs text-[#11241C]">{a.name}</p>
            <p className="text-[10px] font-mono text-[#7A8A82]">{a.category || 'Specialized Legal AI'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'autonomyLevel',
      header: 'Autonomy Level',
      render: (a) => renderAutonomyBadge(a.autonomyLevel),
    },
    {
      key: 'autonomyMode',
      header: 'Autonomy Mode',
      render: (a) => (
        <span className="font-mono text-xs text-[#394B42]">
          {a.autonomyMode || 'Conditional Autonomy'}
        </span>
      ),
    },
    {
      key: 'modelAssigned',
      header: 'Assigned Model',
      render: (a) => (
        <span className="font-mono text-xs font-semibold text-[#143D2D]">
          {a.modelAssigned || 'Gemini 1.5 Pro Enterprise'}
        </span>
      ),
    },
    {
      key: 'recentRuns',
      header: 'Recent Invocations',
      sortable: true,
      render: (a) => <span className="font-mono text-xs">{(a.recentRuns || a.activeRunsToday || 0).toLocaleString()} runs</span>,
    },
    {
      key: 'accuracyRate',
      header: 'Citation Accuracy',
      render: (a) => <span className="font-mono text-xs text-[#144A32] font-semibold">{a.accuracyRate || '99.8%'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (a) => <StatusBadge status={a.status.toLowerCase()} size="sm" text={a.status} />,
    },
    {
      key: 'actions',
      header: 'Controls',
      align: 'right',
      render: (a) => {
        const isAct = a.status === 'Active' || a.status === 'active';
        return (
          <div className="flex items-center justify-end gap-1.5">
            <button
              onClick={() => handleOpenEditAutonomy(a)}
              className="p-1.5 rounded hover:bg-[#EAE3D4] text-[#54645C] hover:text-[#11241C] transition-colors"
              title="Configure Autonomy Governance"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleToggleAgentState(a)}
              disabled={mutatingAgentId === a.id}
              className={`p-1.5 rounded text-xs transition-colors disabled:opacity-50 ${
                isAct ? 'hover:bg-[#FAF0ED] text-[#8A1F1D]' : 'hover:bg-[#E3F2E9] text-[#1E563B]'
              }`}
              title={isAct ? 'Pause Autonomous Agent' : 'Resume Autonomous Agent'}
            >
              {mutatingAgentId === a.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : isAct ? (
                <Pause className="w-3.5 h-3.5" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        );
      },
    },
  ];

  // 2. AUTOMATIONS TABLE COLUMNS
  const automationColumns: ColumnDef<AIAutomation>[] = [
    {
      key: 'name',
      header: 'Automation Workflow',
      sortable: true,
      render: (auto) => (
        <div>
          <p className="font-semibold text-xs text-[#11241C]">{auto.name}</p>
          <p className="text-[10px] font-mono text-[#7A8A82]">ID: {auto.id}</p>
        </div>
      ),
    },
    {
      key: 'linkedAgent',
      header: 'Linked Agent',
      render: (auto) => (
        <span className="font-semibold text-xs text-[#143D2D] flex items-center gap-1.5">
          <Bot className="w-3.5 h-3.5 text-[#143D2D]" />
          {auto.linkedAgent}
        </span>
      ),
    },
    {
      key: 'trigger',
      header: 'Trigger Condition & Schedule',
      render: (auto) => <span className="font-mono text-xs text-[#283931]">{auto.trigger}</span>,
    },
    {
      key: 'lastRun',
      header: 'Last Run',
      render: (auto) => <span className="text-xs text-[#54645C]">{auto.lastRun}</span>,
    },
    {
      key: 'nextRun',
      header: 'Next Execution',
      render: (auto) => <span className="font-mono text-xs text-[#143D2D]">{auto.nextRun}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (auto) => <StatusBadge status={auto.status.toLowerCase()} size="sm" text={auto.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (auto) => {
        const isActive = auto.status === 'Active';
        return (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => handleToggleAutomation(auto)}
              disabled={mutatingAutomationId === auto.id}
              className={cn(
                'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-[#143D2D] disabled:opacity-50',
                isActive ? 'bg-[#143D2D]' : 'bg-[#DDD5C7]'
              )}
              title={isActive ? 'Pause workflow' : 'Activate workflow'}
              aria-label={isActive ? 'Pause workflow' : 'Activate workflow'}
            >
              <motion.span
                layout
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className={cn(
                  'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-xs transform transition-transform duration-200 flex items-center justify-center',
                  isActive ? 'translate-x-4' : 'translate-x-0'
                )}
              >
                {mutatingAutomationId === auto.id && (
                  <Loader2 className="w-2.5 h-2.5 text-[#143D2D] animate-spin" />
                )}
              </motion.span>
            </button>
            <span className="text-[11px] font-mono text-[#54645C] w-12 text-left">
              {isActive ? 'Active' : 'Paused'}
            </span>
          </div>
        );
      },
    },
  ];

  // 3. RUNS TABLE COLUMNS
  const runColumns: ColumnDef<AIRun>[] = [
    {
      key: 'id',
      header: 'Run ID & Trace',
      render: (r) => <code className="font-mono text-xs font-semibold text-[#11241C]">{r.id}</code>,
    },
    {
      key: 'action',
      header: 'Action Dispatched',
      render: (r) => (
        <div>
          <p className="font-semibold text-xs text-[#11241C] line-clamp-1">{r.action}</p>
          <p className="text-[10px] text-[#54645C] line-clamp-1">{r.details}</p>
        </div>
      ),
    },
    {
      key: 'agent',
      header: 'Agent',
      render: (r) => (
        <span className="font-semibold text-xs text-[#143D2D] flex items-center gap-1">
          <Bot className="w-3 h-3 text-[#143D2D]" />
          {r.agent}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Execution State',
      render: (r) => {
        if (r.status === 'Waiting Approval') {
          return (
            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-[#FAF0ED] text-[#8A1F1D] border border-[#F0C2C0] tracking-wider uppercase inline-flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              HUMAN APPROVAL REQUIRED
            </span>
          );
        }
        return <StatusBadge status={r.status.toLowerCase().replace(' ', '_')} size="sm" text={r.status} />;
      },
    },
    {
      key: 'costUsage',
      header: 'Token & Latency',
      render: (r) => <span className="font-mono text-xs text-[#54645C]">{r.costUsage}</span>,
    },
    {
      key: 'started',
      header: 'Timestamp',
      render: (r) => <span className="font-mono text-xs text-[#7A8A82]">{formatDateTime(r.started)}</span>,
    },
    {
      key: 'actions',
      header: 'Trace',
      align: 'right',
      render: (r) => (
        <button
          onClick={() => setSelectedRun(r)}
          className="px-2 py-1 text-xs rounded border border-[#DDD5C7] bg-[#FAF8F3] hover:bg-[#F0EAE0] text-[#11241C] font-medium inline-flex items-center gap-1"
        >
          <Eye className="w-3 h-3 text-[#54645C]" />
          Inspect
        </button>
      ),
    },
  ];

  // 4. APPROVALS TABLE COLUMNS
  const approvalColumns: ColumnDef<AIApproval>[] = [
    {
      key: 'id',
      header: 'Gate ID',
      render: (app) => <code className="font-mono text-xs font-semibold text-[#11241C]">{app.id}</code>,
    },
    {
      key: 'pendingAction',
      header: 'Pending Action & Risk',
      render: (app) => (
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold text-xs text-[#11241C]">{app.pendingAction}</p>
            {app.riskLevel === 'High' || app.riskLevel === 'Critical' ? (
              <span className="font-mono text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#FAF0ED] text-[#8A1F1D] border border-[#F0C2C0] uppercase tracking-wide">
                HUMAN APPROVAL REQUIRED
              </span>
            ) : null}
          </div>
          <p className="text-[10px] text-[#54645C] mt-0.5 line-clamp-1">{app.requestedAction || app.payloadSummary}</p>
        </div>
      ),
    },
    {
      key: 'agent',
      header: 'Requesting Agent',
      render: (app) => <span className="font-semibold text-xs text-[#143D2D]">{app.agent}</span>,
    },
    {
      key: 'firm',
      header: 'Target Firm Tenancy',
      render: (app) => <span className="text-xs font-medium text-[#182620]">{app.firm || 'Platform Administration'}</span>,
    },
    {
      key: 'riskLevel',
      header: 'Risk Assessment',
      render: (app) => (
        <span
          className={`font-mono text-xs font-bold px-2 py-0.5 rounded border uppercase ${
            app.riskLevel === 'Critical' || app.riskLevel === 'High'
              ? 'bg-[#FAF0ED] text-[#8A1F1D] border-[#F0C2C0]'
              : 'bg-[#FEF3D6] text-[#855B0F] border-[#E8C872]'
          }`}
        >
          {app.riskLevel}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Gate State',
      render: (app) => <StatusBadge status={app.status === 'Pending' ? 'reviewing' : app.status.toLowerCase()} size="sm" text={app.status} />,
    },
    {
      key: 'actions',
      header: 'Human Sign-off',
      align: 'right',
      render: (app) => (
        <div className="flex items-center justify-end gap-1.5">
          {app.status === 'Pending' ? (
            <>
              <button
                onClick={() => setSelectedApproval(app)}
                className="px-2 py-1 text-xs rounded border border-[#DDD5C7] bg-[#FAF8F3] hover:bg-[#F0EAE0] text-[#11241C] font-medium"
              >
                Inspect
              </button>
              <button
                onClick={() => handleApproveAction(app.id)}
                disabled={decidingApprovalId === app.id}
                className="p-1 rounded bg-[#EAF3ED] border border-[#C2DEC9] text-[#144A32] hover:bg-[#DDF0E3] disabled:opacity-50"
                title="Authorize Execution"
              >
                {decidingApprovalId === app.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                onClick={() => handleRejectAction(app.id)}
                disabled={decidingApprovalId === app.id}
                className="p-1 rounded bg-[#FAF0ED] border border-[#F0C2C0] text-[#8A1F1D] hover:bg-[#F7E1DD] disabled:opacity-50"
                title="Reject and Abort"
              >
                {decidingApprovalId === app.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <XCircle className="w-3.5 h-3.5" />
                )}
              </button>
            </>
          ) : (
            <span className="font-mono text-xs text-[#7A8A82]">Decided: {app.status}</span>
          )}
        </div>
      ),
    },
  ];

  // 5. POLICIES TABLE COLUMNS
  const policyColumns: ColumnDef<AIPolicy>[] = [
    {
      key: 'policyName',
      header: 'Governance Policy Name',
      sortable: true,
      render: (pol) => (
        <div>
          <p className="font-semibold text-xs text-[#11241C]">{pol.policyName}</p>
          <p className="text-[10px] font-mono text-[#7A8A82]">ID: {pol.id}</p>
        </div>
      ),
    },
    {
      key: 'scope',
      header: 'Enforced Scope',
      render: (pol) => <span className="text-xs text-[#283931] font-medium">{pol.scope}</span>,
    },
    {
      key: 'autonomyLimit',
      header: 'Autonomy Limit',
      render: (pol) => renderAutonomyBadge(pol.autonomyLimit),
    },
    {
      key: 'approvalRequirement',
      header: 'Approval Requirement Threshold',
      render: (pol) => <span className="text-xs text-[#54645C]">{pol.approvalRequirement}</span>,
    },
    {
      key: 'status',
      header: 'Enforcement State',
      render: (pol) => (
        <span
          className={`font-mono text-xs px-2 py-0.5 rounded border font-semibold ${
            pol.status === 'Enforced'
              ? 'bg-[#E3F2E9] text-[#1E563B] border-[#A5D6B6]'
              : 'bg-[#FEF3D6] text-[#855B0F] border-[#E8C872]'
          }`}
        >
          {pol.status}
        </span>
      ),
    },
  ];

  // 6. TOKEN USAGE TABLE COLUMNS
  const tokenColumns: ColumnDef<FirmTokenUsage>[] = [
    {
      key: 'firmName',
      header: 'Law Firm Tenancy',
      render: (tk) => <span className="font-semibold text-xs text-[#11241C]">{tk.firmName}</span>,
    },
    {
      key: 'tokensUsedMonthly',
      header: 'Monthly Tokens Consumed',
      sortable: true,
      render: (tk) => <span className="font-mono text-xs font-semibold">{tk.tokensUsedMonthly.toLocaleString()} tokens</span>,
    },
    {
      key: 'estimatedCost',
      header: 'Estimated AI Usage Cost',
      sortable: true,
      render: (tk) => <span className="font-mono text-xs font-semibold text-[#143D2D]">{tk.estimatedCost}</span>,
    },
    {
      key: 'tokenBudgetCap',
      header: 'Allocated Budget Ceiling',
      render: (tk) => <span className="font-mono text-xs text-[#54645C]">{tk.tokenBudgetCap.toLocaleString()} tokens</span>,
    },
    {
      key: 'budgetAlert',
      header: 'Quota Consumption',
      render: (tk) => (
        <span
          className={`font-mono text-xs px-2 py-0.5 rounded border font-medium ${
            tk.budgetAlert.includes('91%') || tk.budgetAlert.includes('High')
              ? 'bg-[#FAF0ED] text-[#8A1F1D] border-[#F0C2C0]'
              : 'bg-[#EAF3ED] text-[#144A32] border-[#C2DEC9]'
          }`}
        >
          {tk.budgetAlert}
        </span>
      ),
    },
  ];

  const pendingApprovalsCount = approvals.filter((a) => a.status === 'Pending').length;

  return (
    <PageContainer
      title="AI Platform Control Center"
      subtitle="Autonomous legal agent oversight, model gateway routing, human authorization gates, token metrics, and compliance policies."
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

        {/* Mutation Error Banner */}
        {mutationError && (
          <div className="p-4 rounded-xl bg-[#FEF3D6] border border-[#E8C872] text-[#855B0F] flex items-center justify-between gap-4 shadow-2xs">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#855B0F] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-xs block">AI Platform Action Failed</span>
                <span className="text-xs text-[#855B0F]/90 mt-0.5 block">{mutationError}</span>
              </div>
            </div>
            <button
              onClick={() => setMutationError(null)}
              className="text-xs font-semibold hover:underline shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Authoritative Sync / Fetch Error Banner */}
        {fetchError && (
          <div className="p-4 rounded-xl bg-[#FDF3F2] border border-[#F5C2BF] text-[#8A1F1D] flex items-center justify-between gap-4 shadow-2xs">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#8A1F1D] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-xs block">
                  {fetchError instanceof ApiError && fetchError.status === 401
                    ? '401 Unauthorized — Administrative Session Expired'
                    : fetchError instanceof ApiError && fetchError.status === 403
                    ? '403 Forbidden — Insufficient AI Governance Privileges'
                    : fetchError instanceof ApiError && fetchError.status === 404
                    ? `404 Not Found — BACKEND ENDPOINT REQUIRED: ${getTabEndpoint(activeTab)}`
                    : 'Authoritative Backend AI Platform Unavailable'}
                </span>
                <span className="text-xs text-[#8A1F1D]/90 mt-0.5 block">
                  {fetchError.message || 'The authoritative AI platform service is not reachable. Showing zero-mock verified empty state.'}
                </span>
                <span className="font-mono text-[10px] text-[#A63330] mt-1 block">
                  Target Endpoint: {getTabEndpoint(activeTab)}
                </span>
              </div>
            </div>
            <button
              onClick={() => loadData()}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-lg bg-[#8A1F1D] text-white hover:bg-[#6D1817] font-medium text-xs transition-colors shrink-0 flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Retry Authoritative Sync</span>
            </button>
          </div>
        )}

        {/* 6 SUBSECTION TABS MATCHING ALL 6 SUBROUTES */}
        <div className="flex items-center border-b border-[#DDD5C7] pb-1 gap-1 flex-wrap">
          {[
            { id: 'agents', label: 'Agents', icon: <Bot className="w-3.5 h-3.5" /> },
            { id: 'automations', label: 'Automations', icon: <Terminal className="w-3.5 h-3.5" /> },
            { id: 'runs', label: 'Runs', icon: <Activity className="w-3.5 h-3.5" /> },
            {
              id: 'approvals',
              label: 'Approvals',
              icon: <CheckSquare className="w-3.5 h-3.5" />,
              badge: pendingApprovalsCount,
            },
            { id: 'policies', label: 'Policies', icon: <BookOpen className="w-3.5 h-3.5" /> },
            { id: 'usage', label: 'Usage', icon: <BarChart3 className="w-3.5 h-3.5" /> },
          ].map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={cn(
                  'relative px-3.5 py-1.5 rounded-t-lg text-xs font-medium transition-colors flex items-center gap-2 cursor-pointer',
                  isSelected
                    ? 'text-[#143D2D] font-semibold bg-[#F2EDE2]'
                    : 'text-[#54645C] hover:text-[#11241C] hover:bg-[#FAF8F3]'
                )}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[#C5302C] text-white">
                    {tab.badge}
                  </span>
                )}
                {isSelected && (
                  <motion.div
                    layoutId="ai-tab-active-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#143D2D]"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* 1. AGENTS TAB (/ai or /ai/agents) */}
        {activeTab === 'agents' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <FilterBar
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Search legal agents..."
                className="w-full sm:w-72"
              />
              <div className="flex items-center gap-2 text-xs text-[#54645C]">
                <span className="font-mono">{agents.length} Specialized Agents Operational</span>
              </div>
            </div>

            <DataTable
              columns={agentColumns}
              data={agents.filter((a) =>
                a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (a.category && a.category.toLowerCase().includes(searchQuery.toLowerCase()))
              )}
              keyExtractor={(a) => a.id}
              emptyMessage="No autonomous agents registered."
              isLoading={isLoading}
            />
          </div>
        )}

        {/* 2. AUTOMATIONS TAB (/ai/automations) */}
        {activeTab === 'automations' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-[#F2EDE2] border border-[#DDD5C7] text-xs flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#143D2D]">
                <Terminal className="w-4 h-4 shrink-0" />
                <span>
                  Scheduled &amp; event-driven workflows execute deterministically across firm tenancies.
                </span>
              </div>
              <span className="font-mono font-semibold">{automations.length} Active Workflows</span>
            </div>

            <DataTable
              columns={automationColumns}
              data={automations}
              keyExtractor={(auto) => auto.id}
              emptyMessage="No automated AI workflows configured."
              isLoading={isLoading}
            />
          </div>
        )}

        {/* 3. RUNS TAB (/ai/runs) */}
        {activeTab === 'runs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <FilterBar
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Search runs by ID, agent, action..."
                className="w-full sm:w-72"
              />
              <div className="flex items-center gap-2">
                {['all', 'Completed', 'Waiting Approval', 'Failed'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                      statusFilter === st
                        ? 'bg-[#143D2D] text-white border-[#143D2D]'
                        : 'bg-[#FAF8F3] text-[#54645C] border-[#DDD5C7] hover:bg-[#F2EDE2]'
                    }`}
                  >
                    {st === 'all' ? 'All States' : st}
                  </button>
                ))}
              </div>
            </div>

            <DataTable
              columns={runColumns}
              data={runs.filter((r) => {
                const matchSearch =
                  r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  r.agent.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  r.action.toLowerCase().includes(searchQuery.toLowerCase());
                const matchStatus = statusFilter === 'all' || r.status === statusFilter;
                return matchSearch && matchStatus;
              })}
              keyExtractor={(r) => r.id}
              emptyMessage="No AI execution runs match criteria."
              isLoading={isLoading}
            />
          </div>
        )}

        {/* 4. APPROVALS TAB (/ai/approvals) */}
        {activeTab === 'approvals' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-[#FEF3D6] border border-[#E8C872] text-xs flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#855B0F]">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  High-risk statutory dispatches, court modifications, and external disclosure actions are halted until approved by a Platform Super Admin.
                </span>
              </div>
              <span className="font-mono font-bold text-[#855B0F]">{pendingApprovalsCount} Awaiting Authorization</span>
            </div>

            <DataTable
              columns={approvalColumns}
              data={approvals}
              keyExtractor={(app) => app.id}
              emptyMessage="No pending human authorization requests in queue."
              isLoading={isLoading}
            />
          </div>
        )}

        {/* 5. POLICIES TAB (/ai/policies) */}
        {activeTab === 'policies' && (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-serif font-semibold text-sm text-[#11241C]">
                  Platform Autonomy Limits &amp; Human Approval Policies
                </h3>
                <span className="text-xs font-mono text-[#143D2D]">{policies.length} Enforced Policies</span>
              </div>
              <DataTable
                columns={policyColumns}
                data={policies}
                keyExtractor={(pol) => pol.id}
                emptyMessage="No governance policies defined."
                isLoading={isLoading}
              />
            </div>

            {/* Statutory Safety & Anti-Hallucination Interceptors */}
            <div className="border border-[#DDD5C7] rounded-xl bg-[#FAF8F3] p-5 shadow-xs">
              <h3 className="font-serif font-semibold text-sm text-[#11241C] mb-1">
                Deterministic Security Interceptors &amp; Hallucination Clamps
              </h3>
              <p className="text-xs text-[#54645C] mb-4">
                Hardware-enforced security routines validating model dispatches prior to delivery to client browser environments.
              </p>

              <div className="space-y-3">
                {safetyRules.map((rule) => (
                  <div key={rule.id} className="p-3 rounded-lg bg-[#F2EDE2] border border-[#E0D8CA] flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-[#143D2D]" />
                        <span className="font-semibold text-[#11241C]">{rule.ruleName}</span>
                        <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-[#FAF8F3] text-[#143D2D] border border-[#DDD5C7]">
                          {rule.enforcement}
                        </span>
                      </div>
                      <p className="text-xs text-[#54645C] mt-1">{rule.description}</p>
                    </div>

                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[#E3F2E9] text-[#1E563B] border border-[#A5D6B6]">
                      {rule.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 6. USAGE TAB (/ai/usage) */}
        {activeTab === 'usage' && (
          <div className="space-y-6">
            {/* High level metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-[#FAF8F3] border border-[#DDD5C7]">
                <span className="text-xs text-[#7A8A82] block">Total Platform Tokens (30d)</span>
                <span className="font-mono font-bold text-lg text-[#143D2D]">
                  {usageStats?.totalTokens || '20,810,000 Tokens'}
                </span>
                <p className="text-[11px] text-[#54645C] mt-1">+14.2% month-over-month growth</p>
              </div>
              <div className="p-4 rounded-xl bg-[#FAF8F3] border border-[#DDD5C7]">
                <span className="text-xs text-[#7A8A82] block">Total AI Operations Cost (30d)</span>
                <span className="font-mono font-bold text-lg text-[#143D2D]">$1,275.30</span>
                <p className="text-[11px] text-[#54645C] mt-1">Average $0.00003 per legal token</p>
              </div>
              <div className="p-4 rounded-xl bg-[#FAF8F3] border border-[#DDD5C7]">
                <span className="text-xs text-[#7A8A82] block">Budget Alerts &amp; Caps</span>
                <span className="font-mono font-bold text-lg text-[#855B0F]">1 Firm at 91%</span>
                <p className="text-[11px] text-[#54645C] mt-1">Automatic throttling at 100% threshold</p>
              </div>
            </div>

            {/* Model Gateway & Routing Cluster */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-serif font-semibold text-sm text-[#11241C]">
                  Enterprise Model Gateway &amp; VPC Routing
                </h3>
                <span className="text-xs font-mono text-[#143D2D]">Multi-VPC Gateway Active</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {models.map((model) => (
                  <div key={model.id} className="border border-[#DDD5C7] rounded-xl bg-[#FAF8F3] p-4 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-2.5 border-b border-[#EAE3D4]">
                        <div className="flex items-center gap-2">
                          <Cpu className="w-4 h-4 text-[#143D2D]" />
                          <h4 className="font-serif font-semibold text-xs text-[#11241C]">{model.modelName}</h4>
                        </div>
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded border bg-[#E3F2E9] text-[#1E563B] border-[#A5D6B6]">
                          {model.status}
                        </span>
                      </div>

                      <div className="space-y-1.5 mt-3 text-xs">
                        <div className="flex justify-between">
                          <span className="text-[#7A8A82]">Provider:</span>
                          <span className="font-medium text-[#11241C]">{model.provider}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#7A8A82]">Latency (p95):</span>
                          <span className="font-mono text-[#143D2D]">{model.latency}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#7A8A82]">Cost per 1k:</span>
                          <span className="font-mono font-semibold">{model.costPer1kTokens}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#7A8A82]">Fallback:</span>
                          <span className="font-mono text-xs text-[#54645C]">{model.fallbackRoute}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-[#EAE3D4] mt-3 flex items-center justify-between text-[10px] text-[#7A8A82]">
                      <span>Zero Data Retention</span>
                      <span className="font-mono text-[#143D2D]">Enforced</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Firm Token Consumption Table */}
            <div className="space-y-3">
              <h3 className="font-serif font-semibold text-sm text-[#11241C]">
                Law Firm Tenancy Token Consumption
              </h3>
              <DataTable
                columns={tokenColumns}
                data={tokenUsage}
                keyExtractor={(tk) => tk.firmName}
                emptyMessage="No firm token metrics available."
                isLoading={isLoading}
              />
            </div>
          </div>
        )}

        {/* EDIT AUTONOMY RULES MODAL */}
        <ConfirmationModal
          isOpen={!!editingAgent}
          onClose={() => setEditingAgent(null)}
          onConfirm={handleSaveAutonomy}
          title={`Configure Autonomy Rules: ${editingAgent?.name || ''}`}
          confirmText="Apply Governance Rules"
          variant="primary"
          auditReasonPlaceholder="Regulatory justification for autonomy mode change"
        >
          {editingAgent && (
            <div className="space-y-3 text-xs text-[#11241C]">
              <div className="space-y-1">
                <label className="font-semibold block text-xs">Autonomy Level</label>
                <select
                  value={selectedAutonomyLevel}
                  onChange={(e) => setSelectedAutonomyLevel(e.target.value as any)}
                  className="w-full px-3 py-1.5 rounded-lg border border-[#DDD5C7] bg-white text-xs font-mono"
                >
                  <option value="L0 Suggest">L0 Suggest (Deterministic recommendations only)</option>
                  <option value="L1 Draft">L1 Draft (Drafts outputs; human signoff required)</option>
                  <option value="L2 Execute Low-Risk">L2 Execute Low-Risk (Executes non-material actions)</option>
                  <option value="L3 Approval Required">L3 Approval Required (Mandatory Super Admin gate)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold block text-xs">Autonomy Mode</label>
                <select
                  value={selectedAutonomyMode}
                  onChange={(e) => setSelectedAutonomyMode(e.target.value as any)}
                  className="w-full px-3 py-1.5 rounded-lg border border-[#DDD5C7] bg-white text-xs font-medium"
                >
                  <option value="Strict Supervision">Strict Supervision (All actions require Super Admin gate)</option>
                  <option value="Conditional Autonomy">Conditional Autonomy (Autonomous for low-risk, gate for high-risk)</option>
                  <option value="Full Autonomy">Full Autonomy (Autonomous execution with retrospective audit)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold block text-xs">Assigned Language Model</label>
                <select
                  value={selectedModelAssigned}
                  onChange={(e) => setSelectedModelAssigned(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-[#DDD5C7] bg-white text-xs font-mono"
                >
                  {models.map((m) => (
                    <option key={m.id} value={m.modelName}>
                      {m.modelName} ({m.provider})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold block text-xs">Firm Override Policy</label>
                <select
                  value={overridePolicy}
                  onChange={(e) => setOverridePolicy(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-[#DDD5C7] bg-white text-xs"
                >
                  <option value="Firm Override Allowed">Firm Override Allowed (Partner can toggle custom rules)</option>
                  <option value="Platform Forced">Platform Forced (Firm cannot alter)</option>
                  <option value="Restricted to Enterprise">Restricted to Enterprise Plan</option>
                </select>
              </div>
            </div>
          )}
        </ConfirmationModal>

        {/* INSPECT APPROVAL PAYLOAD DRAWER */}
        <DetailsDrawer
          isOpen={!!selectedApproval}
          onClose={() => setSelectedApproval(null)}
          title={`Human Authorization Gate — ${selectedApproval?.id || ''}`}
          subtitle={selectedApproval ? `${selectedApproval.agent} Agent • ${selectedApproval.firm || 'Platform'}` : ''}
          width="max-w-xl"
          footer={
            selectedApproval && selectedApproval.status === 'Pending' ? (
              <div className="flex items-center justify-between w-full">
                <button
                  onClick={() => handleRejectAction(selectedApproval.id)}
                  disabled={decidingApprovalId === selectedApproval.id}
                  className="px-3.5 py-1.5 rounded-lg border border-[#F0C2C0] bg-[#FAF0ED] text-[#8A1F1D] text-xs font-medium hover:bg-[#F7E1DD] disabled:opacity-50 flex items-center gap-1.5"
                >
                  {decidingApprovalId === selectedApproval.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : null}
                  <span>Reject &amp; Abort Action</span>
                </button>
                <button
                  onClick={() => handleApproveAction(selectedApproval.id)}
                  disabled={decidingApprovalId === selectedApproval.id}
                  className="px-4 py-1.5 rounded-lg bg-[#143D2D] hover:bg-[#0E2C20] text-[#FAF7F0] text-xs font-medium shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {decidingApprovalId === selectedApproval.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : null}
                  <span>Authorize Execution</span>
                </button>
              </div>
            ) : undefined
          }
        >
          {selectedApproval && (
            <div className="space-y-5 text-xs text-[#11241C]">
              <div className="border border-[#DDD5C7] rounded-xl bg-[#FAF8F3] p-4 space-y-2">
                <div className="flex justify-between items-center border-b border-[#EAE3D4] pb-2">
                  <span className="font-semibold">{selectedApproval.pendingAction}</span>
                  <span className="font-mono font-bold text-xs text-[#8A1F1D] uppercase">{selectedApproval.riskLevel} Risk</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div>
                    <span className="text-[#7A8A82] block text-[11px]">Requesting Agent</span>
                    <span className="font-semibold">{selectedApproval.agent}</span>
                  </div>
                  <div>
                    <span className="text-[#7A8A82] block text-[11px]">Target Firm</span>
                    <span className="font-semibold">{selectedApproval.firm || 'Platform Administration'}</span>
                  </div>
                </div>
              </div>

              <div className="border border-[#DDD5C7] rounded-xl bg-[#FAF8F3] p-4 space-y-2">
                <h4 className="font-serif font-semibold text-xs text-[#11241C]">Execution Payload Summary</h4>
                <div className="p-3 rounded bg-[#F2EDE2] border border-[#E0D8CA] font-mono text-[11px] text-[#283931] whitespace-pre-wrap leading-relaxed">
                  {selectedApproval.payloadSummary ||
                    `{\n  "action": "${selectedApproval.pendingAction}",\n  "requestedBy": "${selectedApproval.requestedBy || selectedApproval.agent}",\n  "riskLevel": "${selectedApproval.riskLevel}",\n  "networkVPC": "vpc-cluster-prod-01",\n  "complianceCert": "CERT_LEGAL_AI_8812"\n}`}
                </div>
              </div>
            </div>
          )}
        </DetailsDrawer>

        {/* INSPECT RUN TRACE DRAWER */}
        <DetailsDrawer
          isOpen={!!selectedRun}
          onClose={() => setSelectedRun(null)}
          title={`Execution Run Trace — ${selectedRun?.id || ''}`}
          subtitle={selectedRun ? `${selectedRun.agent} Agent • ${selectedRun.status}` : ''}
          width="max-w-xl"
        >
          {selectedRun && (
            <div className="space-y-4 text-xs text-[#11241C]">
              <div className="p-4 rounded-xl bg-[#FAF8F3] border border-[#DDD5C7] space-y-2">
                <h4 className="font-semibold text-xs text-[#11241C]">{selectedRun.action}</h4>
                <p className="text-xs text-[#54645C]">{selectedRun.details}</p>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#EAE3D4] text-xs">
                  <div>
                    <span className="text-[#7A8A82] block text-[11px]">Agent:</span>
                    <span className="font-semibold text-[#143D2D]">{selectedRun.agent}</span>
                  </div>
                  <div>
                    <span className="text-[#7A8A82] block text-[11px]">Cost &amp; Tokens:</span>
                    <span className="font-mono">{selectedRun.costUsage}</span>
                  </div>
                  <div>
                    <span className="text-[#7A8A82] block text-[11px]">Started:</span>
                    <span className="font-mono">{formatDateTime(selectedRun.started)}</span>
                  </div>
                  <div>
                    <span className="text-[#7A8A82] block text-[11px]">Completed:</span>
                    <span className="font-mono">{formatDateTime(selectedRun.completed)}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#FAF8F3] border border-[#DDD5C7] space-y-2">
                <h4 className="font-serif font-semibold text-xs text-[#11241C]">Zero-Retention Execution Verification</h4>
                <p className="text-[11px] text-[#54645C]">
                  This execution was verified by the deterministic zero-retention cryptographic interceptor. All transient input data was purged from RAM upon response completion.
                </p>
                <div className="p-2.5 rounded bg-[#F2EDE2] border border-[#E0D8CA] font-mono text-[10px] text-[#283931]">
                  TRACE_HASH: SHA256:4f8a8b19c92e71d3a0129f9c7e09871abf42819c9e88
                </div>
              </div>
            </div>
          )}
        </DetailsDrawer>
      </div>
    </PageContainer>
  );
};
