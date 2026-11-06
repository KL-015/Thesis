import React from 'react';
import { useFleet, AppPage } from '../../context/FleetContext';
import {
  Layers,
  Calendar,
  Clock,
  FileText,
  Bell,
  Compass,
  Users,
  Shield,
  LogIn,
  LogOut,
  RotateCcw,
  UserPlus,
} from 'lucide-react';

interface SidebarNavProps {
  onOpenLogin: () => void;
  onOpenAddUser?: () => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({ onOpenLogin, onOpenAddUser }) => {
  const {
    activePage,
    setActivePage,
    currentUser,
    logout,
    isAdmin,
    simulateDailyReset,
  } = useFleet();

  const navLinks: { id: AppPage; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <Layers className="w-5 h-5" /> },
    { id: 'calendar', label: 'Fleet Calendar', icon: <Calendar className="w-5 h-5" /> },
    { id: 'daily', label: 'Daily Activities', icon: <Clock className="w-5 h-5" /> },
    { id: 'memos', label: 'Memos', icon: <FileText className="w-5 h-5" /> },
    { id: 'announcements', label: 'Announcements', icon: <Bell className="w-5 h-5" /> },
    { id: 'duties', label: 'Duties', icon: <Compass className="w-5 h-5" /> },
    { id: 'mustering', label: 'Mustering', icon: <Users className="w-5 h-5" /> },
    ...(isAdmin ? [{ id: 'accounts' as AppPage, label: 'Accounts', icon: <Shield className="w-5 h-5" />, adminOnly: true }] : []),
  ];

  return (
    <aside className="sticky top-24 hidden sm:flex flex-col items-center w-14 py-3 shrink-0 bg-white/12 backdrop-blur-2xl border border-white/25 rounded-3xl shadow-[0_15px_40px_rgba(0,0,0,0.25)] text-white self-start">
      {/* Tab Icons Stack */}
      <nav className="flex flex-col items-center gap-2.5">
        {navLinks.map((item) => {
          const isActive = activePage === item.id;
          return (
            <div key={item.id} className="relative group flex flex-col items-center">
              {/* Hover Tooltip floating ABOVE the icon */}
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-slate-900/95 text-white text-[11px] font-semibold rounded-xl shadow-2xl border border-white/20 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-50 backdrop-blur-xl flex flex-col items-center">
                <span>{item.label}</span>
                {/* Downward Arrow */}
                <div className="w-2 h-2 bg-slate-900/95 border-r border-b border-white/20 transform rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2" />
              </div>

              <button
                onClick={() => setActivePage(item.id)}
                aria-label={item.label}
                className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-white/25 text-white border border-white/40 scale-105 shadow-[0_4px_14px_rgba(255,255,255,0.18)]'
                    : 'text-white/70 hover:text-white hover:bg-white/15 border border-transparent'
                }`}
              >
                {item.icon}
              </button>
            </div>
          );
        })}
      </nav>
    </aside>
  );
};
