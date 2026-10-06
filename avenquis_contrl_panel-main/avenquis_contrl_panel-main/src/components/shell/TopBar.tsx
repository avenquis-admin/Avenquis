/**
 * Avenquis Control Panel - Executive Top Navigation Bar
 * Section title, command search trigger, notifications, profile menu, mobile toggle.
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useRouter } from '../../context/RouterContext';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { RoleBadge } from '../ui/StatusBadge';
import { PlatformNotification } from '../../types';
import { cn } from '../../utils/cn';
import { EASE_OUT } from '../../utils/motion';
import {
  Search,
  Bell,
  Menu,
  Shield,
  LogOut,
  ChevronDown,
  CheckCircle2,
  ExternalLink,
  Lock,
} from 'lucide-react';

interface TopBarProps {
  onOpenMobileMenu: () => void;
  onOpenSearch: () => void;
}

const SECTION_TITLES: Record<string, { title: string; category: string }> = {
  '/overview': { title: 'Platform Telemetry & Overview', category: 'Executive Dashboard' },
  '/access-requests': { title: 'Institutional Access Requests', category: 'Firm Governance' },
  '/firms': { title: 'Managed Legal Firms', category: 'Firm Governance' },
  '/users': { title: 'Platform Administrators & Operators', category: 'Access Control' },
  '/leads': { title: 'Enterprise Inbound & Demonstrations', category: 'Commercial Growth' },
  '/plans': { title: 'Subscription Plans & Tiers', category: 'Commercial Growth' },
  '/billing': { title: 'Billing, Collections & Receivables', category: 'Finance & Invoicing' },
  '/support': { title: 'Platform Escalations & SLA Management', category: 'Operations & Support' },
  '/ai': { title: 'AI Platform Control Center', category: 'AI Operations' },
  '/audit': { title: 'Platform Audit & Activity Logs', category: 'Security & Compliance' },
  '/settings': { title: 'Platform Settings & Governance', category: 'Administration' },
};

export const TopBar: React.FC<TopBarProps> = ({ onOpenMobileMenu, onOpenSearch }) => {
  const { currentPath, activeSection, navigate } = useRouter();
  const { user, signOut } = useAuth();

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { notifications, unreadCount, markAllAsRead, markAsRead } = useNotifications();

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenSearch();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenSearch]);

  const sectionMeta = SECTION_TITLES[activeSection] || {
    title: 'Avenquis Control Panel',
    category: 'Platform Administration',
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  return (
    <header className="h-20 bg-[#FAF8F3]/90 backdrop-blur-md border-b border-[#EFE9DF] px-4 lg:px-8 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Mobile trigger, Brand (on mobile), & Current Section Title */}
      <div className="flex items-center gap-3.5 min-w-0">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-xl text-[#4B5563] hover:text-[#11241C] hover:bg-[#EFE9DF] transition-colors"
          aria-label="Open sidebar menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mobile Header Brand Display */}
        <div className="flex items-center gap-2.5 lg:hidden">
          <div className="w-8 h-8 rounded-lg bg-[#143D2D] flex items-center justify-center text-[#FAF7F0] font-serif font-bold text-sm shadow-xs">
            A
          </div>
          <div className="flex flex-col">
            <span className="font-serif tracking-wide font-bold text-sm text-[#11241C] leading-none">
              AVENQUIS
            </span>
            <span className="text-[8px] font-sans font-semibold tracking-[0.2em] text-[#C59A4E] uppercase">
              CONTROL PANEL
            </span>
          </div>
        </div>

        {/* Desktop Section Breadcrumb & Title */}
        <div className="hidden lg:flex flex-col min-w-0">
          <span className="text-[10px] uppercase font-semibold tracking-widest text-[#9CA3AF]">
            {sectionMeta.category}
          </span>
          <h2 className="text-xl font-serif font-normal text-[#11241C] truncate">
            {sectionMeta.title}
          </h2>
        </div>
      </div>

      {/* Right: Search trigger, Status indicator, Notifications, Profile */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Global Search Button */}
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-[#E4DFD5] text-xs text-[#6B7280] hover:text-[#11241C] hover:border-[#143D2D] transition-colors shadow-2xs"
          title="Search entire control panel (Cmd/Ctrl + K)"
        >
          <Search className="w-3.5 h-3.5 text-[#9CA3AF]" />
          <span className="hidden md:inline">Search control panel...</span>
          <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[10px] font-mono text-[#6B7280] bg-[#F3EFE6] rounded border border-[#E2DAD0]">
            ⌘K
          </kbd>
        </button>

        {/* System Health Status Indicator */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#EAF3ED] border border-[#D5E8DD] text-xs text-[#143D2D] font-medium">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1D734E] opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1D734E]" />
          </span>
          <span>All Systems Operational</span>
        </div>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="p-2.5 rounded-xl text-[#4B5563] hover:text-[#11241C] hover:bg-[#EFE9DF] relative transition-colors cursor-pointer"
            aria-label="Platform alerts & notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#DC2626] ring-2 ring-[#FAF8F3] animate-pulse" />
            )}
          </button>

          <AnimatePresence>
            {notificationsOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.98 }}
                transition={{ duration: 0.18, ease: EASE_OUT }}
                className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-[#EFE9DF] rounded-2xl shadow-xl overflow-hidden z-30"
              >
                <div className="px-4 py-3.5 bg-[#FAF8F3] border-b border-[#EFE9DF] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#11241C]">
                      Platform Alerts
                    </span>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-[#143D2D] text-white font-mono text-[10px]">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs text-[#143D2D] hover:underline flex items-center gap-1 font-medium cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-[#F0EBE1]">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[#7A8A82]">
                      No active alerts or notifications
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          if (n.unread) markAsRead(n.id);
                          if (n.actionUrl) {
                            navigate(n.actionUrl);
                            setNotificationsOpen(false);
                          }
                        }}
                        className={cn(
                          'p-4 hover:bg-[#FBF9F5] transition-colors cursor-pointer',
                          n.unread ? 'bg-[#FAF8F4]' : 'opacity-75'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-semibold text-[#11241C] leading-snug">
                            {n.title}
                          </h4>
                          {n.unread && (
                            <span className="w-2 h-2 rounded-full bg-[#C59A4E] shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="mt-1 text-xs text-[#6B7280] leading-relaxed">
                          {n.description}
                        </p>
                        <span className="mt-2 block text-[10px] text-[#9CA3AF]">
                          {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                <div className="px-4 py-2.5 bg-[#FAF8F3] border-t border-[#EFE9DF] text-center">
                  <button
                    onClick={() => {
                      navigate('/audit');
                      setNotificationsOpen(false);
                    }}
                    className="text-xs text-[#143D2D] font-medium hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>View System Audit Logs</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-[#EFE9DF] transition-colors border border-transparent hover:border-[#E5DFD3] cursor-pointer"
            aria-label="Platform Admin profile"
          >
            <div className="w-9 h-9 rounded-xl bg-[#143D2D] text-[#FAF7F0] flex items-center justify-center font-serif font-bold text-xs shadow-xs">
              EV
            </div>

            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-semibold text-[#11241C] leading-none truncate max-w-[130px]">
                {user?.fullName || 'Evelyn Vance'}
              </span>
              <span className="text-[10px] text-[#C59A4E] font-semibold tracking-wider uppercase mt-0.5">
                SUPER ADMIN
              </span>
            </div>

            <ChevronDown className="w-3.5 h-3.5 text-[#9CA3AF]" />
          </button>

          <AnimatePresence>
            {profileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.98 }}
                transition={{ duration: 0.18, ease: EASE_OUT }}
                className="absolute right-0 mt-2 w-64 bg-white border border-[#EFE9DF] rounded-2xl shadow-xl overflow-hidden z-30"
              >
                <div className="p-4 bg-[#FAF8F3] border-b border-[#EFE9DF]">
                  <p className="text-xs font-semibold text-[#11241C]">
                    {user?.fullName || 'Evelyn Vance, Esq.'}
                  </p>
                  <p className="text-[11px] text-[#6B7280] truncate">
                    {user?.email || 'admin@avenquis.internal'}
                  </p>
                  <div className="mt-2.5">
                    <RoleBadge role={user?.role || 'FIRM_USER'} size="sm" />
                  </div>
                </div>

                <div className="p-2 space-y-0.5 text-xs text-[#374151]">
                  <button
                    onClick={() => {
                      navigate('/settings');
                      setProfileMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-[#FAF8F3] flex items-center gap-2.5 text-[#1F2937] transition-colors cursor-pointer"
                  >
                    <Shield className="w-4 h-4 text-[#143D2D]" />
                    <span>Platform Settings</span>
                  </button>

                  <button
                    onClick={() => {
                      navigate('/audit');
                      setProfileMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-[#FAF8F3] flex items-center gap-2.5 text-[#1F2937] transition-colors cursor-pointer"
                  >
                    <Lock className="w-4 h-4 text-[#143D2D]" />
                    <span>Activity & Audit Log</span>
                  </button>

                  <div className="pt-1.5 mt-1.5 border-t border-[#F0EBE1]">
                    <button
                      onClick={() => {
                        setProfileMenuOpen(false);
                        signOut();
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-[#FDF2F2] text-[#DC2626] flex items-center gap-2.5 font-medium transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out of Platform</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};
