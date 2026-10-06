/**
 * Avenquis Control Panel - 11. Settings & Platform Governance
 * Comprehensive settings with dirty-state tracking, 6 specialized authoritative platform governance sections,
 * Super Admin privilege management, and Emergency Maintenance Mode with audit validation.
 * 
 * Strict separation:
 * - Authoritative Platform Settings: synchronized via central apiClient with backend persistence
 * - Local UI Preferences: persisted purely in client-side localStorage
 */

import React, { useEffect, useState } from 'react';
import { PageContainer } from '../components/common/PageContainer';
import { ToggleField, InputField } from '../components/ui/FormField';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { StatusBadge } from '../components/ui/StatusBadge';
import { settingsService } from '../services/pageServices';
import { ApiError } from '../services/apiClient';
import { getLocalUiPreferences, saveLocalUiPreferences } from '../utils/uiPreferences';
import {
  GeneralSettings,
  SecuritySettings,
  GatewaySettings,
  NotificationSettings,
  SuperAdminUser,
  LocalUiPreferences,
} from '../types';
import {
  Shield,
  Sliders,
  Key,
  Lock,
  AlertTriangle,
  AlertCircle,
  Server,
  Bell,
  Users,
  CheckCircle2,
  Save,
  RotateCcw,
  Zap,
  Radio,
  Building2,
  Trash2,
  Plus,
  Info,
  SlidersHorizontal,
  Loader2,
  RotateCw,
} from 'lucide-react';

const DEFAULT_GENERAL: GeneralSettings = {
  platformName: 'Avenquis Legal & Accounting Platform',
  rootDomain: 'avenquis.com',
  supportEmail: 'counsel-desk@avenquis.com',
  defaultCurrency: 'USD ($)',
  sessionTimeoutMins: 15,
};

const DEFAULT_SECURITY: SecuritySettings = {
  fido2Enforced: true,
  zeroRetentionHardLock: true,
  ipAllowlistActive: true,
  maxLoginAttempts: 3,
  enforceMfaEverySession: true,
  allowedCidr: '198.51.100.0/24, 203.0.113.45/32',
};

const DEFAULT_GATEWAYS: GatewaySettings = {
  stripeMode: 'Live (Production Environment)',
  razorpayKeyId: 'rzp_live_k8s9021avenquis',
  cashfreeWebhookSecret: 'whsec_••••••••••••••••••••',
  awsKmsKeyArn: 'arn:aws:kms:us-east-1:771829102:key/c089-firm-encryption',
};

const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  slackOpsWebhook: 'https://hooks.slack.com/services/T00/B00/control-alerts',
  securityPagerEmail: 'secops-pager@avenquis.internal',
  billingEscalationEmail: 'finance-collections@avenquis.internal',
  enableSmsP1Alerts: true,
};

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'general' | 'security' | 'gateways' | 'notifications' | 'admins' | 'maintenance' | 'preferences'
  >('general');

  // Loading & Error States
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<ApiError | Error | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  // In-flight mutation flags (prevents duplicate submissions)
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);
  const [isSavingSecurity, setIsSavingSecurity] = useState(false);
  const [isSavingGateways, setIsSavingGateways] = useState(false);
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);
  const [isSubmittingAdmin, setIsSubmittingAdmin] = useState(false);
  const [isRevokingAdminId, setIsRevokingAdminId] = useState<string | null>(null);
  const [isTogglingMaintenance, setIsTogglingMaintenance] = useState(false);

  // --- 1. General Settings State ---
  const [generalForm, setGeneralForm] = useState<GeneralSettings>(DEFAULT_GENERAL);
  const [initialGeneral, setInitialGeneral] = useState<GeneralSettings>(DEFAULT_GENERAL);
  const isGeneralDirty = JSON.stringify(generalForm) !== JSON.stringify(initialGeneral);

  // --- 2. Security Settings State ---
  const [securityForm, setSecurityForm] = useState<SecuritySettings>(DEFAULT_SECURITY);
  const [initialSecurity, setInitialSecurity] = useState<SecuritySettings>(DEFAULT_SECURITY);
  const isSecurityDirty = JSON.stringify(securityForm) !== JSON.stringify(initialSecurity);

  // --- 3. Gateway Settings State ---
  const [gatewayForm, setGatewayForm] = useState<GatewaySettings>(DEFAULT_GATEWAYS);
  const [initialGateway, setInitialGateway] = useState<GatewaySettings>(DEFAULT_GATEWAYS);
  const isGatewayDirty = JSON.stringify(gatewayForm) !== JSON.stringify(initialGateway);

  // --- 4. Notification Settings State ---
  const [notificationForm, setNotificationForm] = useState<NotificationSettings>(DEFAULT_NOTIFICATIONS);
  const [initialNotification, setInitialNotification] = useState<NotificationSettings>(DEFAULT_NOTIFICATIONS);
  const isNotificationDirty = JSON.stringify(notificationForm) !== JSON.stringify(initialNotification);

  // --- 5. Super Admins State ---
  const [superAdmins, setSuperAdmins] = useState<SuperAdminUser[]>([]);
  const [newAdminModal, setNewAdminModal] = useState(false);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [adminToRevoke, setAdminToRevoke] = useState<SuperAdminUser | null>(null);

  // --- 6. Maintenance & Emergency Mode State ---
  const [maintenanceModeActive, setMaintenanceModeActive] = useState(false);
  const [maintenanceReason, setMaintenanceReason] = useState('Scheduled kernel update and FIDO2 cert rotation');
  const [confirmEmergencyModal, setConfirmEmergencyModal] = useState(false);
  const [targetMaintenanceToggle, setTargetMaintenanceToggle] = useState<boolean>(false);

  // --- 7. Local UI Preferences State (Browser-Only) ---
  const [uiPrefs, setUiPrefs] = useState<LocalUiPreferences>(getLocalUiPreferences());
  const [initialUiPrefs, setInitialUiPrefs] = useState<LocalUiPreferences>(getLocalUiPreferences());
  const isUiPrefsDirty = JSON.stringify(uiPrefs) !== JSON.stringify(initialUiPrefs);

  // Banners
  const [bannerText, setBannerText] = useState<string | null>(null);

  const getEndpointForTab = (tab: string): string => {
    switch (tab) {
      case 'general':
      case 'security':
      case 'gateways':
      case 'notifications':
        return 'GET /settings/platform';
      case 'admins':
        return 'GET /settings/super-admins';
      case 'maintenance':
        return 'GET /settings/maintenance';
      default:
        return 'GET /settings/platform';
    }
  };

  const loadSettings = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const [platRes, adminRes, maintRes] = await Promise.allSettled([
        settingsService.getPlatformSettings(),
        settingsService.getSuperAdmins(),
        settingsService.getMaintenanceMode(),
      ]);

      if (platRes.status === 'fulfilled' && platRes.value.data) {
        const data = platRes.value.data;
        if (data.general) {
          setGeneralForm(data.general);
          setInitialGeneral(data.general);
        }
        if (data.security) {
          setSecurityForm(data.security);
          setInitialSecurity(data.security);
        }
        if (data.gateways) {
          setGatewayForm(data.gateways);
          setInitialGateway(data.gateways);
        }
        if (data.notifications) {
          setNotificationForm(data.notifications);
          setInitialNotification(data.notifications);
        }
      }

      if (adminRes.status === 'fulfilled' && adminRes.value.data) {
        setSuperAdmins(adminRes.value.data);
      }

      if (maintRes.status === 'fulfilled' && maintRes.value.data) {
        setMaintenanceModeActive(maintRes.value.data.active);
        if (maintRes.value.data.reason) {
          setMaintenanceReason(maintRes.value.data.reason);
        }
      }

      // Check for failure on current tab's authoritative endpoint
      let activeTabFailure: any = null;
      if (['general', 'security', 'gateways', 'notifications'].includes(activeTab) && platRes.status === 'rejected') {
        activeTabFailure = platRes.reason;
      } else if (activeTab === 'admins' && adminRes.status === 'rejected') {
        activeTabFailure = adminRes.reason;
      } else if (activeTab === 'maintenance' && maintRes.status === 'rejected') {
        activeTabFailure = maintRes.reason;
      }

      if (activeTabFailure) {
        setFetchError(activeTabFailure as ApiError | Error);
      }
    } catch (err: unknown) {
      setFetchError(err as ApiError | Error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'preferences') {
      loadSettings();
    }
  }, [activeTab]);

  const handleSaveGeneral = async () => {
    if (isSavingGeneral) return;
    setIsSavingGeneral(true);
    setMutationError(null);
    try {
      await settingsService.updateGeneralSettings(generalForm, 'Admin updated general platform settings');
      setInitialGeneral({ ...generalForm });
      setBannerText('General platform configuration successfully persisted to authoritative backend.');
      await loadSettings();
      setTimeout(() => setBannerText(null), 3500);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setMutationError(apiErr.message || 'Failed to save general platform settings to authoritative backend.');
    } finally {
      setIsSavingGeneral(false);
    }
  };

  const handleSaveSecurity = async () => {
    if (isSavingSecurity) return;
    setIsSavingSecurity(true);
    setMutationError(null);
    try {
      await settingsService.updateSecuritySettings(securityForm, 'Admin updated security policies');
      setInitialSecurity({ ...securityForm });
      setBannerText('Security and authentication policies successfully persisted to authoritative backend.');
      await loadSettings();
      setTimeout(() => setBannerText(null), 3500);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setMutationError(apiErr.message || 'Failed to apply security policies to authoritative backend.');
    } finally {
      setIsSavingSecurity(false);
    }
  };

  const handleSaveGateways = async () => {
    if (isSavingGateways) return;
    setIsSavingGateways(true);
    setMutationError(null);
    try {
      await settingsService.updateGatewaySettings(gatewayForm, 'Admin updated gateway API credentials');
      setInitialGateway({ ...gatewayForm });
      setBannerText('Payment gateways and cloud KMS encryption keys synced with authoritative backend.');
      await loadSettings();
      setTimeout(() => setBannerText(null), 3500);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setMutationError(apiErr.message || 'Failed to save gateway configuration to authoritative backend.');
    } finally {
      setIsSavingGateways(false);
    }
  };

  const handleSaveNotifications = async () => {
    if (isSavingNotifications) return;
    setIsSavingNotifications(true);
    setMutationError(null);
    try {
      await settingsService.updateNotificationSettings(notificationForm, 'Admin updated incident notification endpoints');
      setInitialNotification({ ...notificationForm });
      setBannerText('Incident routing webhooks and pager endpoints successfully persisted to authoritative backend.');
      await loadSettings();
      setTimeout(() => setBannerText(null), 3500);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setMutationError(apiErr.message || 'Failed to save notification settings to authoritative backend.');
    } finally {
      setIsSavingNotifications(false);
    }
  };

  const handleAddSuperAdmin = async (auditReason?: string) => {
    if (!newAdminName || !newAdminEmail || isSubmittingAdmin) return;
    setIsSubmittingAdmin(true);
    setMutationError(null);
    try {
      await settingsService.inviteSuperAdmin(
        {
          name: newAdminName,
          email: newAdminEmail,
          role: 'PLATFORM_SUPER_ADMIN',
        },
        auditReason || 'Super Admin invitation dispatched from Control Panel'
      );
      setBannerText(`Super Admin invitation dispatched to ${newAdminEmail} via authoritative backend.`);
      setNewAdminModal(false);
      setNewAdminName('');
      setNewAdminEmail('');
      await loadSettings();
      setTimeout(() => setBannerText(null), 4000);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setMutationError(apiErr.message || `Failed to invite Super Admin ${newAdminEmail}.`);
    } finally {
      setIsSubmittingAdmin(false);
    }
  };

  const handleConfirmRevokeSuperAdmin = async (auditReason?: string) => {
    if (!adminToRevoke || isRevokingAdminId) return;
    setIsRevokingAdminId(adminToRevoke.id);
    setMutationError(null);
    try {
      await settingsService.revokeSuperAdmin(adminToRevoke.id, auditReason || 'Super Admin privilege revoked by operator');
      setBannerText(`Super Admin privileges for "${adminToRevoke.name}" permanently revoked via authoritative backend.`);
      setAdminToRevoke(null);
      await loadSettings();
      setTimeout(() => setBannerText(null), 3500);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setMutationError(apiErr.message || `Failed to revoke Super Admin ${adminToRevoke.name}.`);
    } finally {
      setIsRevokingAdminId(null);
    }
  };

  const handleConfirmMaintenanceToggle = async (auditReason?: string) => {
    if (isTogglingMaintenance) return;
    setIsTogglingMaintenance(true);
    setMutationError(null);
    try {
      await settingsService.setMaintenanceMode(
        targetMaintenanceToggle,
        maintenanceReason,
        auditReason || `Maintenance mode state changed to ${targetMaintenanceToggle ? 'ACTIVE' : 'INACTIVE'}`
      );
      setConfirmEmergencyModal(false);
      setBannerText(
        targetMaintenanceToggle
          ? `EMERGENCY MAINTENANCE ACTIVE: Platform ingress restricted by authoritative backend. Audit reason: "${maintenanceReason}".`
          : 'Maintenance mode deactivated. Full client firm access restored by authoritative backend.'
      );
      await loadSettings();
      setTimeout(() => setBannerText(null), 4500);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      setMutationError(apiErr.message || 'Failed to update emergency maintenance mode state on authoritative backend.');
    } finally {
      setIsTogglingMaintenance(false);
    }
  };

  const handleSaveLocalPreferences = () => {
    saveLocalUiPreferences(uiPrefs);
    setInitialUiPrefs({ ...uiPrefs });
    setBannerText('Local UI preferences successfully saved to browser storage.');
    setTimeout(() => setBannerText(null), 3500);
  };

  return (
    <PageContainer
      title="Platform Settings &amp; Governance"
      subtitle="Configure root security constraints, encryption key parameters, payment gateways, and operational emergency maintenance states."
    >
      <div className="space-y-6 max-w-5xl">
        {/* Success Banner */}
        {bannerText && (
          <div className="p-4 rounded-2xl bg-[#EAF3ED] border border-[#D5E8DD] text-[#14472F] text-xs flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#1D734E] shrink-0" />
              <span className="font-medium">{bannerText}</span>
            </div>
            <button onClick={() => setBannerText(null)} className="text-[#14472F] hover:opacity-75 font-semibold">
              &times;
            </button>
          </div>
        )}

        {/* Mutation Error Banner */}
        {mutationError && (
          <div className="p-4 rounded-2xl bg-[#FEF3D6] border border-[#E8C872] text-[#855B0F] text-xs flex items-center justify-between shadow-2xs">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-[#855B0F] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Platform Configuration Update Failed</span>
                <span className="mt-0.5 block">{mutationError}</span>
              </div>
            </div>
            <button
              onClick={() => setMutationError(null)}
              className="font-semibold text-xs hover:underline shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Authoritative Fetch / Sync Error Banner */}
        {fetchError && activeTab !== 'preferences' && (
          <div className="p-4 rounded-2xl bg-[#FDF3F2] border border-[#F5C2BF] text-[#8A1F1D] flex items-center justify-between gap-4 shadow-2xs">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#8A1F1D] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-xs block">
                  {fetchError instanceof ApiError && fetchError.status === 401
                    ? '401 Unauthorized — Administrative Session Expired'
                    : fetchError instanceof ApiError && fetchError.status === 403
                    ? '403 Forbidden — Insufficient Platform Governance Privileges'
                    : fetchError instanceof ApiError && fetchError.status === 404
                    ? `404 Not Found — BACKEND ENDPOINT REQUIRED: ${getEndpointForTab(activeTab)}`
                    : 'Authoritative Backend Settings Unavailable'}
                </span>
                <span className="text-xs text-[#8A1F1D]/90 mt-0.5 block">
                  {fetchError.message || 'The authoritative backend settings endpoint could not be reached. Local mock fallback is disabled (Zero-Mock Enforced).'}
                </span>
                <span className="font-mono text-[10px] text-[#A63330] mt-1 block">
                  Target Endpoint: {getEndpointForTab(activeTab)}
                </span>
              </div>
            </div>
            <button
              onClick={() => loadSettings()}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-lg bg-[#8A1F1D] text-white hover:bg-[#6D1817] font-medium text-xs transition-colors shrink-0 flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Retry Authoritative Sync</span>
            </button>
          </div>
        )}

        {/* SYSTEM READOUT STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 rounded-2xl bg-white border border-[#EFE9DF] text-xs shadow-2xs">
          <div>
            <span className="text-[#9CA3AF] block text-[10px] font-semibold uppercase tracking-wider">System Version</span>
            <span className="font-mono font-semibold text-[#143D2D] text-sm mt-0.5 block">v3.4.1-enterprise</span>
          </div>
          <div>
            <span className="text-[#9CA3AF] block text-[10px] font-semibold uppercase tracking-wider">Environment</span>
            <span className="font-mono font-semibold text-[#11241C] text-sm mt-0.5 block">Production Multi-Tenant</span>
          </div>
          <div>
            <span className="text-[#9CA3AF] block text-[10px] font-semibold uppercase tracking-wider">Build Hash</span>
            <code className="font-mono text-xs text-[#6B7280] mt-0.5 block">7f9a2b1c4e09</code>
          </div>
          <div>
            <span className="text-[#9CA3AF] block text-[10px] font-semibold uppercase tracking-wider">Authoritative Mode</span>
            <span className="font-mono font-semibold text-[#143D2D] text-sm mt-0.5 block flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#1D734E] inline-block" />
              Central API Sync
            </span>
          </div>
        </div>

        {/* 7 SUBSECTION TABS: 6 AUTHORITATIVE PLATFORM + 1 LOCAL UI PREFERENCES */}
        <div className="flex items-center gap-2 p-1.5 bg-[#FAF8F3] rounded-2xl border border-[#EFE9DF] overflow-x-auto">
          {[
            { id: 'general', label: 'General Settings', icon: <Sliders className="w-3.5 h-3.5" />, type: 'platform' },
            { id: 'security', label: 'Security & Auth', icon: <Shield className="w-3.5 h-3.5" />, type: 'platform' },
            { id: 'gateways', label: 'Gateways & Integrations', icon: <Server className="w-3.5 h-3.5" />, type: 'platform' },
            { id: 'notifications', label: 'Notification Channels', icon: <Bell className="w-3.5 h-3.5" />, type: 'platform' },
            { id: 'admins', label: 'Super Admin Management', icon: <Users className="w-3.5 h-3.5" />, type: 'platform' },
            {
              id: 'maintenance',
              label: 'Emergency & Maintenance',
              icon: <AlertTriangle className="w-3.5 h-3.5" />,
              badge: maintenanceModeActive ? 'ACTIVE' : undefined,
              type: 'platform',
            },
            {
              id: 'preferences',
              label: 'Local UI Preferences',
              icon: <SlidersHorizontal className="w-3.5 h-3.5" />,
              type: 'local',
            },
          ].map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
                  isSelected
                    ? 'bg-[#143D2D] text-white shadow-xs font-semibold'
                    : 'text-[#6B7280] hover:text-[#11241C] hover:bg-[#F2ECE1]'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.type === 'local' && (
                  <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-[#EAE3D4] text-[#54645C]'
                  }`}>
                    Browser
                  </span>
                )}
                {tab.badge && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#DC2626] text-white animate-pulse">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* TAB 1: GENERAL PLATFORM SETTINGS */}
        {activeTab === 'general' && (
          <div className="border border-[#EFE9DF] rounded-2xl bg-white p-6 shadow-2xs space-y-5">
            <div className="flex items-center justify-between border-b border-[#EFE9DF] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif font-semibold text-base text-[#11241C]">General Platform Configuration</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#EAF3ED] text-[#14472F] border border-[#D5E8DD]">
                    Authoritative Backend
                  </span>
                </div>
                <p className="text-xs text-[#6B7280]">Root branding, default institutional parameters, and session ceilings.</p>
              </div>
              <button
                onClick={handleSaveGeneral}
                disabled={!isGeneralDirty || isSavingGeneral}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#143D2D] text-white text-xs font-medium hover:bg-[#0E2C20] disabled:opacity-40 transition-colors shadow-2xs"
              >
                {isSavingGeneral ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>{isSavingGeneral ? 'Persisting...' : isGeneralDirty ? 'Save Changes' : 'Saved'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
              <InputField
                label="Platform Formal Brand"
                value={generalForm.platformName}
                onChange={(e) => setGeneralForm({ ...generalForm, platformName: e.target.value })}
                description="Displayed in official dispatch emails, receipts, and law society filings."
              />
              <InputField
                label="Apex Root Domain"
                value={generalForm.rootDomain}
                onChange={(e) => setGeneralForm({ ...generalForm, rootDomain: e.target.value })}
                description="All law firm subdomains are dynamically provisioned under this zone."
              />
              <InputField
                label="Client Support Desk Email"
                value={generalForm.supportEmail}
                onChange={(e) => setGeneralForm({ ...generalForm, supportEmail: e.target.value })}
              />
              <InputField
                label="Session Inactivity Timeout (Minutes)"
                type="number"
                value={String(generalForm.sessionTimeoutMins)}
                onChange={(e) => setGeneralForm({ ...generalForm, sessionTimeoutMins: Number(e.target.value) })}
                description="Automatic screen lockout for inactive administrative operators."
              />
            </div>
          </div>
        )}

        {/* TAB 2: SECURITY & AUTHENTICATION */}
        {activeTab === 'security' && (
          <div className="border border-[#EFE9DF] rounded-2xl bg-white p-6 shadow-2xs space-y-5">
            <div className="flex items-center justify-between border-b border-[#EFE9DF] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif font-semibold text-base text-[#11241C]">Security &amp; Authentication Policies</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#EAF3ED] text-[#14472F] border border-[#D5E8DD]">
                    Authoritative Backend
                  </span>
                </div>
                <p className="text-xs text-[#6B7280]">Root security enforcement, zero-retention memory isolation, and IP geofencing.</p>
              </div>
              <button
                onClick={handleSaveSecurity}
                disabled={!isSecurityDirty || isSavingSecurity}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#143D2D] text-white text-xs font-medium hover:bg-[#0E2C20] disabled:opacity-40 transition-colors shadow-2xs"
              >
                {isSavingSecurity ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>{isSavingSecurity ? 'Applying...' : isSecurityDirty ? 'Apply Security Policies' : 'Policies Enforced'}</span>
              </button>
            </div>

            <div className="space-y-4 pt-1">
              <ToggleField
                label="Mandatory FIDO2 WebAuthn Hardware Keys"
                description="Require all Platform Super Admins to authenticate via certified FIDO2 hardware tokens (e.g. YubiKey 5 Series). Software OTPs disallowed."
                checked={securityForm.fido2Enforced}
                onChange={(checked) => setSecurityForm({ ...securityForm, fido2Enforced: checked })}
              />

              <ToggleField
                label="Immutable Zero-Data-Retention for Autonomous AI"
                description="Strict cryptographic memory zeroization post-inference. Guarantees attorney-client privilege isolation across tenancies."
                checked={securityForm.zeroRetentionHardLock}
                onChange={(checked) => setSecurityForm({ ...securityForm, zeroRetentionHardLock: checked })}
              />

              <ToggleField
                label="Platform Owner Dedicated CIDR Allowlist"
                description="Enforce ingress access to port 3000 solely from registered corporate egress ranges."
                checked={securityForm.ipAllowlistActive}
                onChange={(checked) => setSecurityForm({ ...securityForm, ipAllowlistActive: checked })}
              />

              {securityForm.ipAllowlistActive && (
                <div className="p-4 bg-[#FAF8F3] rounded-xl border border-[#EFE9DF]">
                  <InputField
                    label="Allowed Corporate CIDR Blocks"
                    value={securityForm.allowedCidr || ''}
                    onChange={(e) => setSecurityForm({ ...securityForm, allowedCidr: e.target.value })}
                    description="Comma-separated IPv4/IPv6 CIDR ranges."
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: GATEWAY & INTEGRATION SETTINGS */}
        {activeTab === 'gateways' && (
          <div className="border border-[#EFE9DF] rounded-2xl bg-white p-6 shadow-2xs space-y-5">
            <div className="flex items-center justify-between border-b border-[#EFE9DF] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif font-semibold text-base text-[#11241C]">Payment Gateways &amp; Cloud Encryption Keys</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#EAF3ED] text-[#14472F] border border-[#D5E8DD]">
                    Authoritative Backend
                  </span>
                </div>
                <p className="text-xs text-[#6B7280]">Live API credentials, webhook delivery secrets, and KMS hardware security keys.</p>
              </div>
              <button
                onClick={handleSaveGateways}
                disabled={!isGatewayDirty || isSavingGateways}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#143D2D] text-white text-xs font-medium hover:bg-[#0E2C20] disabled:opacity-40 transition-colors shadow-2xs"
              >
                {isSavingGateways ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>{isSavingGateways ? 'Syncing...' : isGatewayDirty ? 'Save API Credentials' : 'Saved'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
              <InputField
                label="Stripe Production Mode"
                value={gatewayForm.stripeMode}
                disabled
                description="Managed securely via Cloud Run environment secrets."
              />
              <InputField
                label="Razorpay Production Key ID"
                value={gatewayForm.razorpayKeyId}
                onChange={(e) => setGatewayForm({ ...gatewayForm, razorpayKeyId: e.target.value })}
              />
              <InputField
                label="Cashfree Webhook Verification Secret"
                type="password"
                value={gatewayForm.cashfreeWebhookSecret}
                onChange={(e) => setGatewayForm({ ...gatewayForm, cashfreeWebhookSecret: e.target.value })}
                description="Masked for security. Private secrets are encrypted at rest with AWS KMS."
              />
              <InputField
                label="AWS KMS Customer Managed Key (CMK) ARN"
                value={gatewayForm.awsKmsKeyArn}
                onChange={(e) => setGatewayForm({ ...gatewayForm, awsKmsKeyArn: e.target.value })}
                description="Used to encrypt tenant-specific datastores at rest."
              />
            </div>
          </div>
        )}

        {/* TAB 4: NOTIFICATION CHANNELS */}
        {activeTab === 'notifications' && (
          <div className="border border-[#EFE9DF] rounded-2xl bg-white p-6 shadow-2xs space-y-5">
            <div className="flex items-center justify-between border-b border-[#EFE9DF] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif font-semibold text-base text-[#11241C]">Incident &amp; Audit Notification Endpoints</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#EAF3ED] text-[#14472F] border border-[#D5E8DD]">
                    Authoritative Backend
                  </span>
                </div>
                <p className="text-xs text-[#6B7280]">Real-time alerting for infrastructure anomalies, security breaches, and collection past-dues.</p>
              </div>
              <button
                onClick={handleSaveNotifications}
                disabled={!isNotificationDirty || isSavingNotifications}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#143D2D] text-white text-xs font-medium hover:bg-[#0E2C20] disabled:opacity-40 transition-colors shadow-2xs"
              >
                {isSavingNotifications ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>{isSavingNotifications ? 'Saving...' : isNotificationDirty ? 'Save Channels' : 'Saved'}</span>
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <InputField
                label="Slack Ops Incident Webhook URL"
                value={notificationForm.slackOpsWebhook}
                onChange={(e) => setNotificationForm({ ...notificationForm, slackOpsWebhook: e.target.value })}
              />
              <InputField
                label="Security Operations PagerDuty Email"
                value={notificationForm.securityPagerEmail}
                onChange={(e) => setNotificationForm({ ...notificationForm, securityPagerEmail: e.target.value })}
              />
              <InputField
                label="Collections &amp; Delinquency Escalation Dispatch"
                value={notificationForm.billingEscalationEmail}
                onChange={(e) => setNotificationForm({ ...notificationForm, billingEscalationEmail: e.target.value })}
              />
              <ToggleField
                label="SMS Dispatch for P1 Critical Outages"
                description="Immediately page all on-call platform engineers via SMS upon detecting service health failure."
                checked={notificationForm.enableSmsP1Alerts}
                onChange={(checked) => setNotificationForm({ ...notificationForm, enableSmsP1Alerts: checked })}
              />
            </div>
          </div>
        )}

        {/* TAB 5: SUPER ADMIN MANAGEMENT */}
        {activeTab === 'admins' && (
          <div className="border border-[#EFE9DF] rounded-2xl bg-white p-6 shadow-2xs space-y-5">
            <div className="flex items-center justify-between border-b border-[#EFE9DF] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif font-semibold text-base text-[#11241C]">Platform Super Administrator Registry</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#EAF3ED] text-[#14472F] border border-[#D5E8DD]">
                    Authoritative Backend
                  </span>
                </div>
                <p className="text-xs text-[#6B7280]">Authorized root identities with cryptographic hardware key enforcement.</p>
              </div>
              <button
                onClick={() => setNewAdminModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#143D2D] text-white text-xs font-medium hover:bg-[#0E2C20] shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Invite Super Admin</span>
              </button>
            </div>

            <div className="divide-y divide-[#EFE9DF]">
              {superAdmins.length === 0 && !isLoading && (
                <div className="py-8 text-center text-xs text-[#6B7280]">
                  No Super Administrators returned from backend registry.
                </div>
              )}
              {superAdmins.map((admin) => (
                <div key={admin.id} className="py-3.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#11241C]">{admin.name}</span>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-[#EAF3ED] text-[#14472F] border border-[#D5E8DD]">
                        {admin.role}
                      </span>
                      <StatusBadge status={admin.status.toLowerCase()} size="sm" text={admin.status} />
                    </div>
                    <p className="text-[#6B7280] font-mono text-[11px] mt-1">{admin.email}</p>
                    <p className="text-[#9CA3AF] text-[10px] mt-0.5">
                      FIDO2 Hardware Key: {admin.fido2Registered ? 'Enrolled & Verified' : 'Awaiting Enrollment'} • Last: {admin.lastActive}
                    </p>
                  </div>

                  {admin.id !== 'sa-01' ? (
                    <button
                      onClick={() => setAdminToRevoke(admin)}
                      disabled={isRevokingAdminId === admin.id}
                      className="p-2 text-[#DC2626] hover:bg-[#FAECEC] rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1"
                      title="Revoke Admin Access"
                    >
                      {isRevokingAdminId === admin.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  ) : (
                    <span className="text-[10px] font-mono text-[#9CA3AF] italic">Root Owner</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: MAINTENANCE & EMERGENCY MODE */}
        {activeTab === 'maintenance' && (
          <div className="border border-[#EFE9DF] rounded-2xl bg-white p-6 shadow-2xs space-y-5">
            <div className="flex items-center justify-between border-b border-[#EFE9DF] pb-4">
              <div className="flex items-center gap-2.5 text-base font-serif font-semibold text-[#942B28]">
                <AlertTriangle className="w-5 h-5 text-[#DC2626]" />
                <span>Emergency Platform Operations &amp; Lockdown</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FAF0ED] text-[#8A1F1D] border border-[#F0C2C0]">
                Authoritative Backend
              </span>
            </div>

            <div className="space-y-4">
              <div
                className={`p-5 rounded-2xl border ${
                  maintenanceModeActive
                    ? 'bg-[#FAECEC] border-[#F5D3D3]'
                    : 'bg-[#FEF6E4] border-[#F4E2B5]'
                }`}
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h4 className="font-serif font-bold text-sm text-[#11241C]">
                      Global Platform Maintenance Lockdown
                    </h4>
                    <p className="text-xs text-[#6B7280] mt-1 max-w-xl">
                      Temporarily suspends law firm client logins, halts background autonomous AI agents, and locks down public API endpoints for critical updates.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setTargetMaintenanceToggle(!maintenanceModeActive);
                      setConfirmEmergencyModal(true);
                    }}
                    disabled={isTogglingMaintenance}
                    className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold transition-colors shadow-2xs shrink-0 flex items-center gap-1.5 ${
                      maintenanceModeActive
                        ? 'bg-[#143D2D] text-white hover:bg-[#0E2C20]'
                        : 'bg-[#DC2626] text-white hover:bg-[#B91C1C]'
                    }`}
                  >
                    {isTogglingMaintenance && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{maintenanceModeActive ? 'RESTORE NORMAL TRAFFIC' : 'ACTIVATE EMERGENCY LOCKDOWN'}</span>
                  </button>
                </div>
              </div>

              <div className="p-4 bg-[#FAF8F3] rounded-xl border border-[#EFE9DF] text-xs space-y-1.5">
                <span className="font-semibold text-[#11241C] block">Audit Reason for Emergency Operations:</span>
                <input
                  type="text"
                  value={maintenanceReason}
                  onChange={(e) => setMaintenanceReason(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E4DFD5] bg-white text-xs text-[#11241C] focus:outline-none focus:border-[#143D2D]"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: LOCAL UI PREFERENCES (DECOUPLED CLIENT BROWSER SETTINGS) */}
        {activeTab === 'preferences' && (
          <div className="border border-[#EFE9DF] rounded-2xl bg-white p-6 shadow-2xs space-y-6">
            <div className="flex items-center justify-between border-b border-[#EFE9DF] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif font-semibold text-base text-[#11241C]">Local UI &amp; Display Preferences</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FAF8F3] text-[#54645C] border border-[#DDD5C7]">
                    Client Browser Storage Only
                  </span>
                </div>
                <p className="text-xs text-[#6B7280]">
                  Configure client-side presentation parameters. These settings are persisted strictly in your browser and do not modify cloud tenant data.
                </p>
              </div>
              <button
                onClick={handleSaveLocalPreferences}
                disabled={!isUiPrefsDirty}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#143D2D] text-white text-xs font-medium hover:bg-[#0E2C20] disabled:opacity-40 transition-colors shadow-2xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isUiPrefsDirty ? 'Save Local Preferences' : 'Saved'}</span>
              </button>
            </div>

            <div className="p-4 rounded-xl bg-[#FAF8F3] border border-[#EFE9DF] text-xs flex items-start gap-3">
              <Info className="w-4 h-4 text-[#54645C] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-[#11241C] block">Architectural Separation Notice</span>
                <p className="text-[#54645C] mt-0.5">
                  Unlike platform security and payment policies, display preferences (density, themes, intervals) operate purely within local browser storage (<code className="font-mono text-[11px]">localStorage</code>) without making backend API mutations.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-[#11241C] block">Display Theme</label>
                <select
                  value={uiPrefs.theme}
                  onChange={(e) => setUiPrefs({ ...uiPrefs, theme: e.target.value as any })}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E4DFD5] bg-white text-xs text-[#11241C] focus:outline-none focus:border-[#143D2D]"
                >
                  <option value="warm-institutional">Warm Institutional Light (Official Default)</option>
                  <option value="contrast-light">High-Contrast Legal Light</option>
                  <option value="twilight-dark">Twilight Dark (Operational Night View)</option>
                </select>
                <p className="text-[11px] text-[#6B7280]">Visual palette calibration for prolonged document and audit review.</p>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-[#11241C] block">Data Table Row Density</label>
                <select
                  value={uiPrefs.tableDensity}
                  onChange={(e) => setUiPrefs({ ...uiPrefs, tableDensity: e.target.value as any })}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E4DFD5] bg-white text-xs text-[#11241C] focus:outline-none focus:border-[#143D2D]"
                >
                  <option value="compact">Compact (Dense audit view for large monitors)</option>
                  <option value="normal">Normal (Balanced institutional padding)</option>
                  <option value="relaxed">Relaxed (Comfortable spacious view)</option>
                </select>
                <p className="text-[11px] text-[#6B7280]">Controls vertical padding across all audit and transaction tables.</p>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-[#11241C] block">Navigation Sidebar Default State</label>
                <select
                  value={uiPrefs.sidebarDefault}
                  onChange={(e) => setUiPrefs({ ...uiPrefs, sidebarDefault: e.target.value as any })}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E4DFD5] bg-white text-xs text-[#11241C] focus:outline-none focus:border-[#143D2D]"
                >
                  <option value="expanded">Expanded (Full labels and icons)</option>
                  <option value="collapsed">Collapsed (Icon-only compact ribbon)</option>
                </select>
                <p className="text-[11px] text-[#6B7280]">Initial layout on desktop viewport loads.</p>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-[#11241C] block">Live Polling Frequency</label>
                <select
                  value={String(uiPrefs.autoRefreshInterval)}
                  onChange={(e) => setUiPrefs({ ...uiPrefs, autoRefreshInterval: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E4DFD5] bg-white text-xs text-[#11241C] focus:outline-none focus:border-[#143D2D]"
                >
                  <option value="0">Manual Refresh Only (Recommended, zero overhead)</option>
                  <option value="30">Poll every 30 seconds</option>
                  <option value="60">Poll every 60 seconds</option>
                  <option value="120">Poll every 2 minutes</option>
                </select>
                <p className="text-[11px] text-[#6B7280]">Background background sync interval for live telemetry.</p>
              </div>
            </div>

            <div className="pt-2 border-t border-[#EFE9DF]">
              <ToggleField
                label="Prompt Explicit Confirmation on High-Risk Administrative Actions"
                description="Require two-step confirmation modals before pausing autonomous agents, revoking administrators, or changing maintenance states."
                checked={uiPrefs.confirmDangerActions}
                onChange={(checked) => setUiPrefs({ ...uiPrefs, confirmDangerActions: checked })}
              />
            </div>
          </div>
        )}

        {/* INVITE SUPER ADMIN MODAL */}
        <ConfirmationModal
          isOpen={newAdminModal}
          onClose={() => setNewAdminModal(false)}
          onConfirm={handleAddSuperAdmin}
          title="Provision New Platform Super Admin"
          confirmText={isSubmittingAdmin ? 'Dispatching Invitation...' : 'Send Invitation'}
          variant="primary"
          auditReasonPlaceholder="Mandatory compliance note for granting root super admin access"
        >
          <div className="space-y-3 text-xs text-[#11241C]">
            <InputField
              label="Legal Full Name"
              value={newAdminName}
              onChange={(e) => setNewAdminName(e.target.value)}
              placeholder="e.g. Alistair Thorne, Esq."
            />
            <InputField
              label="Corporate Internal Email"
              type="email"
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
              placeholder="e.g. alistair@avenquis.internal"
            />
            <p className="text-xs text-[#6B7280]">
              The invitee must complete in-person FIDO2 WebAuthn hardware token enrollment before any administrative console actions are permitted.
            </p>
          </div>
        </ConfirmationModal>

        {/* REVOKE SUPER ADMIN MODAL */}
        <ConfirmationModal
          isOpen={!!adminToRevoke}
          onClose={() => setAdminToRevoke(null)}
          onConfirm={handleConfirmRevokeSuperAdmin}
          title={`Revoke Privileges: ${adminToRevoke?.name || ''}`}
          confirmText={isRevokingAdminId ? 'Revoking Privileges...' : 'Permanently Revoke Admin Access'}
          variant="danger"
          auditReasonPlaceholder="Mandatory security audit reason for revoking super admin access"
        >
          <div className="space-y-3 text-xs text-[#11241C]">
            <div className="p-4 rounded-xl bg-[#FAECEC] border border-[#F5D3D3] text-[#942B28]">
              <p className="font-bold">CAUTION: PRIVILEGE REVOCATION</p>
              <p className="mt-1">
                Revoking root administrative privileges immediately invalidates active sessions and unenrolls FIDO2 hardware keys for <strong>{adminToRevoke?.email}</strong>.
              </p>
            </div>
          </div>
        </ConfirmationModal>

        {/* EMERGENCY / MAINTENANCE MODE CONFIRMATION MODAL */}
        <ConfirmationModal
          isOpen={confirmEmergencyModal}
          onClose={() => setConfirmEmergencyModal(false)}
          onConfirm={handleConfirmMaintenanceToggle}
          title={
            targetMaintenanceToggle
              ? 'CONFIRM PLATFORM EMERGENCY LOCKDOWN'
              : 'CONFIRM DEACTIVATION OF MAINTENANCE MODE'
          }
          confirmText={
            isTogglingMaintenance
              ? 'Applying State...'
              : targetMaintenanceToggle
              ? 'Lock Down Platform Now'
              : 'Restore Online Access'
          }
          variant={targetMaintenanceToggle ? 'danger' : 'primary'}
          auditReasonPlaceholder="Mandatory compliance audit justification for emergency state transition"
        >
          <div className="space-y-3 text-xs text-[#11241C]">
            <div className="p-4 rounded-xl bg-[#FAECEC] border border-[#F5D3D3] text-[#942B28]">
              <p className="font-bold">CAUTION: PLATFORM OPERATION STATE CHANGE</p>
              <p className="mt-1">
                {targetMaintenanceToggle
                  ? 'Activating Emergency Mode immediately terminates active firm websocket connections, pauses AI inference queues, and returns 503 Maintenance across all firm subdomains.'
                  : 'Deactivating Maintenance Mode restores all database writes, API routing, and AI execution queues.'}
              </p>
            </div>
          </div>
        </ConfirmationModal>
      </div>
    </PageContainer>
  );
};
