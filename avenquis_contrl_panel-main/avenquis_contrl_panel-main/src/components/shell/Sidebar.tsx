/**
 * Avenquis Control Panel - Fixed & Collapsible Enterprise Sidebar
 * Order strictly adhered to platform governance specifications.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useRouter } from '../../context/RouterContext';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils/cn';
import { EASE_OUT } from '../../utils/motion';
import {
  LayoutDashboard,
  UserCheck,
  Building2,
  Users,
  Compass,
  Layers,
  CreditCard,
  LifeBuoy,
  Cpu,
  ShieldCheck,
  Sliders,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Shield,
  Bot,
  Terminal,
  Activity,
  CheckSquare,
  BookOpen,
  BarChart3,
  X,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItemConfig {
  id: string;
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  badgeVariant?: 'gold' | 'danger' | 'default';
  subRoutes?: { id: string; label: string; path: string; icon: React.ComponentType<{ className?: string }> }[];
}

export const SIDEBAR_ITEMS: NavItemConfig[] = [
  {
    id: 'overview',
    label: 'Overview',
    path: '/overview',
    icon: LayoutDashboard,
  },
  {
    id: 'access-requests',
    label: 'Access Requests',
    path: '/access-requests',
    icon: UserCheck,
    badge: 2,
    badgeVariant: 'gold',
  },
  {
    id: 'firms',
    label: 'Firms',
    path: '/firms',
    icon: Building2,
  },
  {
    id: 'users',
    label: 'Users',
    path: '/users',
    icon: Users,
  },
  {
    id: 'leads',
    label: 'Leads & Demos',
    path: '/leads',
    icon: Compass,
  },
  {
    id: 'plans',
    label: 'Plans & Subscriptions',
    path: '/plans',
    icon: Layers,
  },
  {
    id: 'billing',
    label: 'Billing & Collections',
    path: '/billing',
    icon: CreditCard,
  },
  {
    id: 'support',
    label: 'Support',
    path: '/support',
    icon: LifeBuoy,
    badge: 1,
    badgeVariant: 'danger',
  },
  {
    id: 'ai',
    label: 'AI Control Center',
    path: '/ai',
    icon: Cpu,
    subRoutes: [
      { id: 'agents', label: 'Agents', path: '/ai/agents', icon: Bot },
      { id: 'automations', label: 'Automations', path: '/ai/automations', icon: Terminal },
      { id: 'runs', label: 'Runs', path: '/ai/runs', icon: Activity },
      { id: 'approvals', label: 'Approvals', path: '/ai/approvals', icon: CheckSquare },
      { id: 'policies', label: 'Policies', path: '/ai/policies', icon: BookOpen },
      { id: 'usage', label: 'Usage', path: '/ai/usage', icon: BarChart3 },
    ],
  },
  {
    id: 'audit',
    label: 'Audit & Activity',
    path: '/audit',
    icon: ShieldCheck,
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: Sliders,
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}) => {
  const { currentPath, navigate, activeSection } = useRouter();
  const { user, signOut } = useAuth();
  const [aiExpanded, setAiExpanded] = useState(true);

  const handleNavClick = (path: string) => {
    navigate(path);
    onCloseMobile();
  };

  const content = (
    <div className="h-full flex flex-col justify-between bg-[#FAF8F3] text-[#191F1D] border-r border-[#EFE9DF] select-none">
      {/* Brand Header */}
      <div>
        <div className="h-20 flex items-center justify-between px-5 border-b border-[#EFE9DF]">
          <div
            onClick={() => handleNavClick('/overview')}
            className="flex items-center gap-3 cursor-pointer overflow-hidden"
          >
            {/* Crest Icon */}
            <div className="w-9 h-9 rounded-xl bg-[#143D2D] flex items-center justify-center text-[#FAF7F0] font-serif font-bold text-base shadow-xs shrink-0">
              A
            </div>

            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-serif tracking-wide font-bold text-base text-[#11241C] leading-none truncate">
                  AVENQUIS
                </span>
                <span className="text-[9px] font-sans font-semibold tracking-[0.24em] text-[#C59A4E] uppercase truncate mt-1">
                  CONTROL PANEL
                </span>
              </div>
            )}
          </div>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg text-[#71717A] hover:text-[#11241C] hover:bg-[#EFE9DF] transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          {/* Mobile close button */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-[#71717A] hover:text-[#11241C] rounded-lg hover:bg-[#EFE9DF]"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items List */}
        <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-190px)]">
          <div className={cn('px-3 py-2 text-[10px] uppercase font-semibold tracking-wider text-[#9CA3AF]', collapsed && 'text-center')}>
            {collapsed ? '•••' : 'Platform Administration'}
          </div>

          {SIDEBAR_ITEMS.map((item) => {
            const isActive = activeSection === item.path || (item.path === '/overview' && currentPath === '/overview');
            const Icon = item.icon;
            const hasSubRoutes = item.subRoutes && item.subRoutes.length > 0;
            const isSubRouteActive = Boolean(item.subRoutes?.some((sr) => currentPath === sr.path));

            return (
              <div key={item.id} className="space-y-0.5">
                <button
                  onClick={() => {
                    if (hasSubRoutes && !collapsed) {
                      setAiExpanded(!aiExpanded);
                    }
                    handleNavClick(item.path);
                  }}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors group relative overflow-hidden',
                    isActive || isSubRouteActive
                      ? 'text-white font-semibold'
                      : 'text-[#4B5563] hover:text-[#11241C] hover:bg-[#F2ECE1]'
                  )}
                >
                  {(isActive || isSubRouteActive) && (
                    <motion.div
                      layoutId="sidebarActiveIndicator"
                      className="absolute inset-0 bg-[#143D2D] rounded-xl shadow-xs"
                      transition={{ type: 'spring', stiffness: 450, damping: 36 }}
                    />
                  )}

                  <span className="relative z-10 flex items-center gap-3 w-full">
                    <Icon
                      className={cn(
                        'w-4 h-4 shrink-0 transition-all duration-150 group-hover:translate-x-0.5',
                        isActive || isSubRouteActive ? 'text-[#C59A4E]' : 'text-[#6B7280] group-hover:text-[#11241C]'
                      )}
                    />

                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left truncate transition-transform duration-150 group-hover:translate-x-0.5">
                          {item.label}
                        </span>
                        {item.badge !== undefined && (
                          <span
                            className={cn(
                              'px-1.5 py-0.5 rounded-full font-mono text-[10px] font-semibold shrink-0',
                              item.badgeVariant === 'danger'
                                ? 'bg-[#DC2626] text-white'
                                : item.badgeVariant === 'gold'
                                ? 'bg-[#FEF6E4] text-[#8D6816] border border-[#F4E2B5]'
                                : 'bg-[#E5E7EB] text-[#374151]'
                            )}
                          >
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </span>
                </button>

                {/* Subroutes for AI Control Center */}
                {hasSubRoutes && !collapsed && aiExpanded && (
                  <div className="ml-5 pl-3 border-l border-[#E5DFD3] space-y-0.5 py-1">
                    {item.subRoutes!.map((sub) => {
                      const isSubActive = currentPath === sub.path;
                      const SubIcon = sub.icon;
                      return (
                        <button
                          key={sub.id}
                          onClick={() => handleNavClick(sub.path)}
                          className={cn(
                            'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors text-left relative overflow-hidden group',
                            isSubActive
                              ? 'text-[#143D2D] font-semibold'
                              : 'text-[#6B7280] hover:text-[#11241C] hover:bg-[#F2ECE1]'
                          )}
                        >
                          {isSubActive && (
                            <motion.div
                              layoutId="sidebarSubActiveIndicator"
                              className="absolute inset-0 bg-[#EAF3ED] rounded-lg"
                              transition={{ type: 'spring', stiffness: 450, damping: 36 }}
                            />
                          )}
                          <span className="relative z-10 flex items-center gap-2 w-full">
                            <SubIcon className={cn('w-3 h-3 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5', isSubActive ? 'text-[#143D2D]' : 'text-[#9CA3AF]')} />
                            <span className="truncate transition-transform duration-150 group-hover:translate-x-0.5">{sub.label}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Footer / Profile Status */}
      <div className="p-3 border-t border-[#EFE9DF] bg-[#FAF8F3]">
        {!collapsed ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <span className="w-2 h-2 rounded-full bg-[#1D734E]" />
              <span className="text-[10px] uppercase font-semibold tracking-wider text-[#6B7280]">
                Super Administrator
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white border border-[#EFE9DF] shadow-2xs">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#11241C] truncate">
                  {user?.fullName || 'Evelyn Vance'}
                </p>
                <p className="text-[10px] text-[#6B7280] truncate">
                  {user?.email || 'admin@avenquis.internal'}
                </p>
              </div>
              <button
                onClick={() => signOut()}
                className="p-1.5 text-[#6B7280] hover:text-[#DC2626] hover:bg-[#FDF2F2] rounded-lg transition-colors"
                title="Sign Out of Platform Admin"
                aria-label="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div
              className="w-8 h-8 rounded-xl bg-[#EAF3ED] flex items-center justify-center text-[#143D2D]"
              title={`Role: ${user?.role || 'Unknown'}`}
            >
              <Shield className="w-4 h-4" />
            </div>
            <button
              onClick={() => signOut()}
              className="p-1.5 text-[#6B7280] hover:text-[#DC2626] hover:bg-[#FDF2F2] rounded-lg transition-colors"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:block shrink-0 transition-[width] duration-250 ease-out z-30 fixed inset-y-0 left-0',
          collapsed ? 'w-[72px]' : 'w-[260px]'
        )}
      >
        {content}
      </aside>

      {/* Mobile Drawer Navigation */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="fixed inset-0 bg-[#0E1A14]/70 backdrop-blur-2xs"
              onClick={onCloseMobile}
            />
            {/* Sliding Drawer */}
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.28, ease: EASE_OUT }}
              className="relative w-[280px] max-w-[85vw] h-full shadow-2xl z-10"
            >
              {content}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
