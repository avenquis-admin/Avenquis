/**
 * Avenquis Control Panel - Application Root
 * Platform-Owner Control Application for AVENQUIS.
 * Role: PLATFORM_SUPER_ADMIN
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RouterProvider, useRouter } from './context/RouterContext';
import { NotificationProvider } from './context/NotificationContext';
import { AppShell } from './components/shell/AppShell';

// Auth Pages
import { SignInPage } from './pages/auth/SignInPage';
import { ForbiddenPage } from './pages/ForbiddenPage';
import { NotFoundPage } from './pages/NotFoundPage';

// Admin Section Pages (11 Required Routes)
import { OverviewPage } from './pages/OverviewPage';
import { AccessRequestsPage } from './pages/AccessRequestsPage';
import { FirmsPage } from './pages/FirmsPage';
import { UsersPage } from './pages/UsersPage';
import { LeadsPage } from './pages/LeadsPage';
import { PlansPage } from './pages/PlansPage';
import { BillingPage } from './pages/BillingPage';
import { SupportPage } from './pages/SupportPage';
import { AIPage } from './pages/AIPage';
import { AuditPage } from './pages/AuditPage';
import { SettingsPage } from './pages/SettingsPage';

const ControlPanelRouter: React.FC = () => {
  const { isAuthenticated, user, isLoading, isPlatformSuperAdmin } = useAuth();
  const { currentPath, activeSection, navigate } = useRouter();

  // Centralized Route Guard: URL redirects occur strictly inside useEffect, never during render
  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      if (currentPath !== '/sign-in') {
        navigate(`/sign-in?returnTo=${encodeURIComponent(currentPath)}`, { replace: true });
      }
    } else if (isPlatformSuperAdmin) {
      if (currentPath === '/sign-in' || currentPath === '/') {
        navigate('/overview', { replace: true });
      }
    }
  }, [isLoading, isAuthenticated, isPlatformSuperAdmin, currentPath, navigate]);

  // 1. Initial authentication verification loading splash
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F2EA] flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-12 h-12 rounded-lg bg-[#143D2D] text-[#C5A869] flex items-center justify-center font-serif font-bold text-xl mb-4 border border-[#C5A869]/30 shadow-md">
          A
        </div>
        <h2 className="text-base font-serif font-semibold text-[#11241C] tracking-wide">
          AVENQUIS CONTROL PANEL
        </h2>
        <p className="mt-1 text-xs text-[#6F7F77] font-mono">
          Verifying Platform Administrator Session...
        </p>
        <div className="mt-4 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#143D2D] animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full bg-[#C5A869] animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 rounded-full bg-[#143D2D] animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    );
  }

  // 2. Unauthenticated Flow: Render SignInPage directly without calling setState during render
  if (!isAuthenticated) {
    return <SignInPage />;
  }

  // 3. Authenticated but Unauthorized (Not a Super Admin)
  if (!isPlatformSuperAdmin) {
    return <ForbiddenPage />;
  }

  // 4. Authenticated & Authorized: Handle Root or Sign-In while useEffect redirects to overview
  if (currentPath === '/sign-in' || currentPath === '/') {
    return null;
  }

  const renderActiveSection = () => {
    switch (activeSection) {
      case '/overview':
        return <OverviewPage />;
      case '/access-requests':
        return <AccessRequestsPage />;
      case '/firms':
        return <FirmsPage />;
      case '/users':
        return <UsersPage />;
      case '/leads':
        return <LeadsPage />;
      case '/plans':
        return <PlansPage />;
      case '/billing':
        return <BillingPage />;
      case '/support':
        return <SupportPage />;
      case '/ai':
        return <AIPage />;
      case '/audit':
        return <AuditPage />;
      case '/settings':
        return <SettingsPage />;
      default:
        // If we reach here, it's an authenticated admin hitting a non-existent section
        return <NotFoundPage />;
    }
  };

  // If the path doesn't match any of our top-level sections exactly, but is supposed to be a page
  // We check if it's a known section.
  const knownSections = [
    '/overview', '/access-requests', '/firms', '/users', '/leads', 
    '/plans', '/billing', '/support', '/ai', '/audit', '/settings'
  ];

  if (!knownSections.includes(activeSection)) {
    return <NotFoundPage />;
  }

  return (
    <AppShell>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeSection}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="w-full"
        >
          {renderActiveSection()}
        </motion.div>
      </AnimatePresence>
    </AppShell>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider>
        <NotificationProvider>
          <ControlPanelRouter />
        </NotificationProvider>
      </RouterProvider>
    </AuthProvider>
  );
}
