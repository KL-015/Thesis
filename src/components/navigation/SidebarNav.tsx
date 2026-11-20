import React, { useMemo } from 'react';
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
} from 'lucide-react';
import { LiquidNavbar, LiquidNavItem } from '../ui/liquid-glass-navbar';

interface SidebarNavProps {
  onOpenLogin: () => void;
  onOpenAddUser?: () => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = () => {
  const {
    activePage,
    setActivePage,
    unreadTabs,
    isAdmin,
  } = useFleet();

  const navLinks = useMemo<
    { id: AppPage; label: string; icon: React.ReactNode }[]
  >(
    () => [
      { id: 'dashboard', label: 'Dashboard', icon: <Layers className="w-5 h-5" /> },
      { id: 'calendar', label: 'Fleet Calendar', icon: <Calendar className="w-5 h-5" /> },
      { id: 'daily', label: 'Daily Activities', icon: <Clock className="w-5 h-5" /> },
      { id: 'memos', label: 'Memos', icon: <FileText className="w-5 h-5" /> },
      { id: 'announcements', label: 'Announcements', icon: <Bell className="w-5 h-5" /> },
      { id: 'duties', label: 'Duties', icon: <Compass className="w-5 h-5" /> },
      { id: 'mustering', label: 'Mustering', icon: <Users className="w-5 h-5" /> },
      ...(isAdmin ? [{ id: 'accounts' as AppPage, label: 'Accounts', icon: <Shield className="w-5 h-5" /> }] : []),
    ],
    [isAdmin]
  );

  const liquidItems = useMemo<LiquidNavItem[]>(
    () =>
      navLinks.map((item) => ({
        id: item.id,
        label: item.label,
        tooltip: item.label,
        icon: item.icon,
        fx: 'none',
        badge: unreadTabs[item.id] ? (
          <span
            aria-label="New update"
            className="pointer-events-none absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-[#FF3B30] shadow-[0_1px_4px_rgba(0,0,0,0.45)]"
          />
        ) : undefined,
      })),
    [navLinks, unreadTabs]
  );

  const activeIndex = Math.max(
    0,
    navLinks.findIndex((item) => item.id === activePage)
  );

  return (
    <aside className="sticky top-24 hidden sm:flex flex-col items-center shrink-0 text-white self-start z-30">
      <LiquidNavbar
        orientation="vertical"
        tone="dark"
        compact
        active={activeIndex}
        items={liquidItems}
        onChange={(_, item) => {
          if (item.id) {
            setActivePage(item.id as AppPage);
          }
        }}
      />
    </aside>
  );
};

