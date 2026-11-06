import React, { useState, useEffect } from 'react';
import { useFleet, AppPage } from '../../context/FleetContext';
import {
  RotateCcw,
  LogIn,
  LogOut,
  Clock,
  Calendar,
  Layers,
  FileText,
  Users,
  Bell,
  Compass,
  Shield,
  Menu,
  X,
  UserPlus,
} from 'lucide-react';
import { getCurrentMilitaryTime } from '../../utils/timeConflict';

interface TopBarProps {
  onOpenLogin: () => void;
  onOpenAddUser?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onOpenLogin, onOpenAddUser }) => {
  const {
    activePage,
    setActivePage,
    currentUser,
    logout,
    isAdmin,
    simulateDailyReset,
  } = useFleet();

  const [militaryTime, setMilitaryTime] = useState<string>(() => getCurrentMilitaryTime());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setMilitaryTime(getCurrentMilitaryTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const navLinks: { id: AppPage; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'calendar', label: 'Fleet Calendar', icon: <Calendar className="w-3.5 h-3.5" /> },
    { id: 'daily', label: 'Daily Activities', icon: <Clock className="w-3.5 h-3.5" /> },
    { id: 'memos', label: 'Memos', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'announcements', label: 'Announcements', icon: <Bell className="w-3.5 h-3.5" /> },
    { id: 'duties', label: 'Duties', icon: <Compass className="w-3.5 h-3.5" /> },
    { id: 'mustering', label: 'Mustering', icon: <Users className="w-3.5 h-3.5" /> },
    ...(isAdmin ? [{ id: 'accounts' as AppPage, label: 'Accounts', icon: <Shield className="w-3.5 h-3.5" />, adminOnly: true }] : []),
  ];

  const handleNavClick = (page: AppPage) => {
    setActivePage(page);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-3 sm:top-4 z-40 max-w-6xl mx-auto px-3 sm:px-6 w-full text-white">
      <div className="bg-white/12 backdrop-blur-2xl border border-white/25 rounded-3xl shadow-[0_15px_40px_rgba(0,0,0,0.25)] px-4 sm:px-7 h-16 flex items-center justify-between gap-4 transition-all duration-300">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleNavClick('dashboard')}
            className="flex items-center gap-3 text-left group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-[0_4px_14px_rgba(37,99,235,0.4)] border border-white/25 group-hover:scale-105 transition-transform duration-200">
              <span className="text-base font-bold">⚓</span>
            </div>
            <div>
              <span className="text-base font-bold text-white tracking-tight group-hover:text-blue-300 transition-colors">
                FleetSync
              </span>
              <span className="block text-[11px] text-white/60 font-medium">
                Fleet Operations &amp; Scheduling
              </span>
            </div>
          </button>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* Live Military Time - Pill Glass */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono px-3.5 py-1.5 bg-white/10 border border-white/20 rounded-full text-white shadow-2xs backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="font-semibold">{militaryTime}</span>
          </div>

          {/* Daily Reset Button - Frosted Glass Pill */}
          <button
            onClick={simulateDailyReset}
            title="Simulate daily midnight reset"
            className="hidden md:flex items-center gap-1.5 px-3.5 py-1.5 text-xs text-white/90 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-full transition-all duration-200 shadow-2xs backdrop-blur-md cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-blue-300" />
            <span className="font-medium">Reset</span>
          </button>

          {/* User Account / Login State */}
          {currentUser ? (
            <div className="flex items-center gap-2 pl-2 border-l border-white/20">
              {isAdmin && onOpenAddUser && (
                <button
                  onClick={onOpenAddUser}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-semibold shadow-[0_4px_12px_rgba(37,99,235,0.35)] border border-blue-400/30 transition-all cursor-pointer"
                  title="Add a new authorized officer (Title and Email)"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Add User</span>
                </button>
              )}
              <div className="hidden sm:block text-right">
                <span className="block text-xs font-semibold text-white truncate max-w-[120px]">
                  {currentUser.fullName}
                </span>
                <span className="block text-[10px] text-blue-300 font-semibold uppercase font-mono tracking-wider">
                  {currentUser.role.replace('_', ' ')}
                </span>
              </div>
              <button
                onClick={logout}
                title="Sign out to Cadet View"
                className="p-2 text-white/80 hover:text-red-300 bg-white/10 hover:bg-red-500/20 rounded-full border border-white/20 transition-colors shadow-2xs cursor-pointer"
                aria-label="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-all duration-200 shadow-[0_4px_16px_rgba(37,99,235,0.45)] border border-blue-400/30 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Officer Login</span>
            </button>
          )}

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-white hover:text-white rounded-full bg-white/10 border border-white/20 shadow-2xs backdrop-blur-md cursor-pointer"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown - Glassmorphic Card */}
      {mobileMenuOpen && (
        <div className="lg:hidden mx-4 my-2 p-3 bg-slate-900/90 backdrop-blur-3xl rounded-3xl border border-white/20 shadow-2xl space-y-1 animate-in fade-in slide-in-from-top-2 duration-200 text-white">
          {navLinks.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-xs font-medium rounded-2xl transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold border border-blue-400/30 shadow-md'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
          {isAdmin && onOpenAddUser && (
            <button
              onClick={() => {
                onOpenAddUser();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 text-xs font-semibold rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-md border border-blue-400/30"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Add User (Title &amp; Email)</span>
            </button>
          )}
          <div className="pt-2.5 mt-2 border-t border-white/15 flex items-center justify-between text-xs px-2">
            <button
              onClick={() => {
                simulateDailyReset();
                setMobileMenuOpen(false);
              }}
              className="text-white/80 hover:text-blue-300 flex items-center gap-1.5 py-1 font-medium cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-blue-300" />
              <span>Simulate Daily Reset</span>
            </button>
            <span className="font-mono text-blue-300 font-bold bg-white/10 px-2 py-0.5 rounded-full border border-white/15">{militaryTime}</span>
          </div>
        </div>
      )}
    </header>
  );
};
