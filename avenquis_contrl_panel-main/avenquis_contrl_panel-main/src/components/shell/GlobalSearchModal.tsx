/**
 * Avenquis Control Panel - Global Search Command Palette (Ctrl+K / Cmd+K)
 */

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useRouter } from '../../context/RouterContext';
import { cn } from '../../utils/cn';
import { EASE_OUT } from '../../utils/motion';
import {
  Search,
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
  ArrowRight,
  Bot,
  Terminal,
  Activity,
  CheckSquare,
  BookOpen,
  BarChart3,
  X,
} from 'lucide-react';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchEntry {
  id: string;
  title: string;
  category: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords?: string[];
}

const SEARCH_CATALOG: SearchEntry[] = [
  { id: '1', title: 'Platform Overview & Telemetry', category: 'Navigation', path: '/overview', icon: LayoutDashboard },
  { id: '2', title: 'Firm Access Requests Queue', category: 'Navigation', path: '/access-requests', icon: UserCheck, keywords: ['vetting', 'kyc', 'applications'] },
  { id: '3', title: 'Institutional Law Firms Directory', category: 'Navigation', path: '/firms', icon: Building2, keywords: ['vanguard', 'rothschild', 'apex', 'seats'] },
  { id: '4', title: 'Platform Super Admins & Operators', category: 'Navigation', path: '/users', icon: Users, keywords: ['roles', 'mfa', 'permissions'] },
  { id: '5', title: 'Enterprise Leads & Demonstrations', category: 'Navigation', path: '/leads', icon: Compass, keywords: ['pipeline', 'prospects'] },
  { id: '6', title: 'Plans, Tiers & Enterprise Quotas', category: 'Navigation', path: '/plans', icon: Layers, keywords: ['pricing', 'entitlements'] },
  { id: '7', title: 'Billing, Collections & Invoices', category: 'Navigation', path: '/billing', icon: CreditCard, keywords: ['ach', 'fedwire', 'overdue'] },
  { id: '8', title: 'Escalations & Priority Support', category: 'Navigation', path: '/support', icon: LifeBuoy, keywords: ['sla', 'p1', 'tickets'] },
  { id: '9', title: 'AI Control Center - Core Dashboard', category: 'AI Suite', path: '/ai', icon: Cpu },
  { id: '10', title: 'AI Autonomous Agents', category: 'AI Suite', path: '/ai/agents', icon: Bot, keywords: ['contract', 'sanctions', 'litigation'] },
  { id: '11', title: 'AI Automations & Workflows', category: 'AI Suite', path: '/ai/automations', icon: Terminal },
  { id: '12', title: 'AI Execution Runs & Latency', category: 'AI Suite', path: '/ai/runs', icon: Activity },
  { id: '13', title: 'AI Human Approvals Gate', category: 'AI Suite', path: '/ai/approvals', icon: CheckSquare },
  { id: '14', title: 'AI Governance & Guardrail Policies', category: 'AI Suite', path: '/ai/policies', icon: BookOpen },
  { id: '15', title: 'AI Token Usage & Cost Allocation', category: 'AI Suite', path: '/ai/usage', icon: BarChart3 },
  { id: '16', title: 'Platform Audit & Activity Logs', category: 'Governance', path: '/audit', icon: ShieldCheck, keywords: ['tamper', 'security', 'ip'] },
  { id: '17', title: 'Platform Security & SSO Policies', category: 'Governance', path: '/settings', icon: Sliders, keywords: ['fido2', 'hardware', 'keys'] },
];

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const { navigate } = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filtered = useMemo(() => {
    if (!query.trim()) return SEARCH_CATALOG.slice(0, 8);
    const q = query.toLowerCase();
    return SEARCH_CATALOG.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.keywords?.some((k) => k.toLowerCase().includes(q))
    );
  }, [query]);

  const handleSelect = (entry: SearchEntry) => {
    navigate(entry.path);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-0 bg-[#0E1A14]/70 backdrop-blur-xs"
            onClick={onClose}
          />

          {/* Command Palette Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -6 }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
            className="relative w-full max-w-xl bg-[#FAF8F3] border border-[#DDD5C7] rounded-xl shadow-2xl overflow-hidden z-10"
          >
            {/* Search Header */}
            <div className="flex items-center px-4 py-3 border-b border-[#E3DDD2] bg-[#F4EFE6] gap-3">
              <Search className="w-4 h-4 text-[#6A7B73] shrink-0" />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                placeholder="Jump to any platform section, firm, or AI agent..."
                className="w-full bg-transparent text-sm text-[#182620] placeholder:text-[#8E9C95] focus:outline-none"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="p-1 text-[#7A8A82] hover:text-[#182620] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-[#7A8A82] bg-[#EFE8DC] border border-[#DDD5C7] rounded">
                ESC
              </kbd>
            </div>

            {/* Results List */}
            <div className="max-h-80 overflow-y-auto p-2 divide-y divide-[#EDE7DC]">
              {filtered.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#7A8A82]">
                  No platform sections or records matching &quot;{query}&quot;
                </div>
              ) : (
                filtered.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={cn(
                        'flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors',
                        selectedIndex === index ? 'bg-[#EAE3D4] text-[#11241C]' : 'text-[#3D4C45] hover:bg-[#F2ECE0]'
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="p-1.5 rounded bg-[#F4EFE6] text-[#143D2D] shrink-0 border border-[#E0D8C8]">
                          <Icon className="w-3.5 h-3.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate text-[#11241C]">{item.title}</p>
                          <p className="text-[10px] text-[#6F7F77] font-mono">{item.path}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 bg-[#EFE9DD] rounded text-[#61736A] border border-[#DDD5C7]">
                          {item.category}
                        </span>
                        <ArrowRight className="w-3 h-3 text-[#A2B0A9]" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 bg-[#F2EDE2] border-t border-[#E3DDD2] flex items-center justify-between text-[11px] text-[#6F7F77] font-mono">
              <span>Global Search Index • Avenquis Internal Control</span>
              <div className="flex items-center gap-3">
                <span>Navigate: ↑↓</span>
                <span>Select: ↵</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
