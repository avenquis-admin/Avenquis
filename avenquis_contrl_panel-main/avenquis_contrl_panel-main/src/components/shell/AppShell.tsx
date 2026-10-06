/**
 * Avenquis Control Panel - Root App Shell Layout
 * Encapsulates Sidebar, TopBar, responsive drawer, modal search, and main content.
 */

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { GlobalSearchModal } from './GlobalSearchModal';
import { AvenquisControlAssistant } from '../assistant/AvenquisControlAssistant';
import { cn } from '../../utils/cn';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8F6F0] text-[#191F1D] flex flex-col font-sans">
      {/* Fixed Left Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Layout Container */}
      <div
        className={cn(
          'flex-1 flex flex-col min-w-0 transition-[padding] duration-250 ease-out',
          sidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-[260px]'
        )}
      >
        {/* Top Navigation Bar */}
        <TopBar
          onOpenMobileMenu={() => setMobileSidebarOpen(true)}
          onOpenSearch={() => setSearchOpen(true)}
        />

        {/* Global Security / Production Header Tag */}
        <div className="bg-[#0D241A] text-[#C5A869] text-[11px] font-mono px-4 lg:px-8 py-1.5 flex items-center justify-between border-b border-[#184431]">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C5A869]" />
            <span className="uppercase tracking-widest font-semibold">AVENQUIS PLATFORM ADMINISTRATION CONSOLE</span>
            <span className="hidden sm:inline text-[#8AA89B]">— Production Multi-Tenant Active</span>
          </div>
          <div className="hidden md:flex items-center gap-4 text-[#8AA89B]">
            <span>Session: Hardware Security MFA</span>
            <span>Jurisdiction: Global Multi-Region</span>
          </div>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Avenquis Control Assistant Floating Chatbot */}
      <AvenquisControlAssistant />

      {/* Command Palette Global Search Modal */}
      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
};
