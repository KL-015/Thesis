/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FleetProvider, useFleet } from './context/FleetContext';
import { TopBar } from './components/navigation/TopBar';
import { SidebarNav } from './components/navigation/SidebarNav';
import { DashboardView } from './components/dashboard/DashboardView';
import { FleetCalendarView } from './components/calendar/FleetCalendarView';
import { DailyActivitiesView } from './components/daily/DailyActivitiesView';
import { MemoRepositoryView } from './components/memos/MemoRepositoryView';
import { AnnouncementsView } from './components/announcements/AnnouncementsView';
import { MusteringView } from './components/mustering/MusteringView';
import { DutiesView } from './components/duties/DutiesView';
import { AccountManagementView } from './components/accounts/AccountManagementView';
import { LoginModal } from './components/auth/LoginModal';
import { AddUserModal } from './components/auth/AddUserModal';
import { CheckCircle2, X } from 'lucide-react';

const AppContent: React.FC = () => {
  const { activePage, setActivePage, resetNotification, clearResetNotification } = useFleet();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);

  return (
    <div className="min-h-screen text-white flex flex-col font-sans selection:bg-blue-500/30 selection:text-white relative">
      {/* Background overlay for crisp readability and specular glass contrast */}
      <div className="fixed inset-0 bg-slate-950/45 pointer-events-none -z-10 backdrop-blur-[2px]" />

      {/* Top Header Bar */}
      <TopBar
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onOpenAddUser={() => setIsAddUserModalOpen(true)}
      />

      {/* Floating Glass Notification */}
      {resetNotification && (
        <div className="max-w-6xl mx-auto px-4 mt-4 w-full">
          <div className="bg-gradient-to-r from-emerald-600/90 via-blue-600/90 to-blue-700/95 backdrop-blur-2xl border border-emerald-400/50 rounded-2xl px-5 py-3.5 text-xs text-white flex items-center justify-between gap-3 shadow-[0_10px_35px_rgba(16,185,129,0.35)] animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center shrink-0 border border-white/30 shadow-inner">
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              </div>
              <div>
                <span className="font-bold text-white text-xs block leading-tight">Database Sync Complete</span>
                <span className="text-[11px] text-emerald-100 font-medium">{resetNotification}</span>
              </div>
            </div>
            <button
              onClick={clearResetNotification}
              className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/20 transition-colors cursor-pointer shrink-0"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Dynamic Flex Wrapper putting SidebarNav directly adjacent to cards */}
      <div className="max-w-6xl w-full mx-auto px-3 sm:px-6 py-6 flex items-start gap-3 sm:gap-4 flex-1">
        {/* Side Vertical Icon Navigation */}
        <SidebarNav
          onOpenLogin={() => setIsLoginModalOpen(true)}
          onOpenAddUser={() => setIsAddUserModalOpen(true)}
        />

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          {activePage === 'dashboard' && (
            <DashboardView onOpenLogin={() => setIsLoginModalOpen(true)} />
          )}
          {activePage === 'calendar' && (
            <FleetCalendarView onOpenLogin={() => setIsLoginModalOpen(true)} />
          )}
          {activePage === 'daily' && (
            <DailyActivitiesView onNavigateToCalendar={() => setActivePage('calendar')} />
          )}
          {activePage === 'memos' && (
            <MemoRepositoryView onOpenLogin={() => setIsLoginModalOpen(true)} />
          )}
          {activePage === 'announcements' && (
            <AnnouncementsView onOpenLogin={() => setIsLoginModalOpen(true)} />
          )}
          {activePage === 'mustering' && (
            <MusteringView onOpenLogin={() => setIsLoginModalOpen(true)} />
          )}
          {activePage === 'duties' && (
            <DutiesView onOpenLogin={() => setIsLoginModalOpen(true)} />
          )}
          {activePage === 'accounts' && (
            <AccountManagementView onOpenLogin={() => setIsLoginModalOpen(true)} />
          )}
        </main>
      </div>



      {/* Staff & Officer Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />

      {/* Admin Add User Modal */}
      <AddUserModal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <FleetProvider>
      <AppContent />
    </FleetProvider>
  );
}
