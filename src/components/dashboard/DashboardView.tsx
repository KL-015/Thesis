import React, { useMemo } from 'react';
import { useFleet } from '../../context/FleetContext';
import {
  militaryTimeToMinutes,
  getCurrentMilitaryTime,
  toISODateString,
  formatMilitaryRange,
} from '../../utils/timeConflict';
import {
  Calendar,
  Clock,
  ArrowRight,
  MapPin,
  Bell,
  FileText,
  Compass,
  Sparkles,
} from 'lucide-react';

export const DashboardView: React.FC<{ onOpenLogin: () => void }> = ({ onOpenLogin }) => {
  const {
    setActivePage,
    events,
    dailyActivities,
    announcements,
    dutyRoster,
    memos,
    currentUser,
  } = useFleet();

  const currentMilitary = getCurrentMilitaryTime();
  const currentMinutes = militaryTimeToMinutes(currentMilitary);
  const todayStr = toISODateString(new Date());

  const activeActivity = useMemo(() => {
    return dailyActivities.find((act) => {
      const s = militaryTimeToMinutes(act.startTime);
      const e = militaryTimeToMinutes(act.endTime);
      return currentMinutes >= s && currentMinutes < e;
    });
  }, [dailyActivities, currentMinutes]);

  const todayEvents = useMemo(() => {
    return events.filter((e) => e.date === todayStr);
  }, [events, todayStr]);

  const currentWatch = useMemo(() => {
    return dutyRoster.find((d) => d.status === 'ON_WATCH') || dutyRoster[0];
  }, [dutyRoster]);

  const latestAnnouncement = announcements[0];

  return (
    <div className="space-y-6 max-w-5xl mx-auto text-white">
      {/* Welcome Banner - Frosted Glass Container with Rounded-3xl */}
      <div className="p-6 sm:p-8 bg-white/12 backdrop-blur-2xl rounded-3xl border border-white/25 shadow-[0_20px_50px_rgba(0,0,0,0.25)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-medium mb-3 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{currentUser ? `${currentUser.rank} · Authenticated Command` : 'Cadet View · Read Only'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {currentUser ? `Welcome, ${currentUser.fullName}` : 'Quarterdeck Overview'}
          </h1>
          <p className="text-xs sm:text-sm text-white/70 mt-1 max-w-lg">
            {currentUser
              ? 'Fleet scheduling, conflict detection, and academy operational directives.'
              : 'Live schedule, official QD daily routine, and academy directives.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto px-4 py-2 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 text-xs font-mono text-white shadow-2xs">
          <span className="font-medium text-white/90">{todayStr}</span>
          <span className="text-white/30">·</span>
          <span className="font-bold text-white bg-blue-600/80 border border-blue-400/30 px-2 py-0.5 rounded-lg shadow-sm">{currentMilitary}</span>
        </div>
      </div>

      {/* Two Primary Focus Cards: Fleet Calendar vs Daily Activities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Fleet Calendar Today */}
        <div className="bg-white/12 backdrop-blur-2xl rounded-3xl border border-white/25 shadow-[0_15px_40px_rgba(0,0,0,0.2)] p-6 sm:p-7 flex flex-col justify-between hover:border-white/35 transition-all duration-300">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-400/30 flex items-center justify-center font-bold shadow-2xs backdrop-blur-md">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Fleet Calendar</h2>
                  <p className="text-[11px] text-white/60">Events, meetings &amp; training</p>
                </div>
              </div>
              <span className="text-xs font-mono text-blue-200 bg-blue-600/30 px-3 py-1 rounded-full border border-blue-400/40 font-semibold shadow-2xs backdrop-blur-md">
                {todayEvents.length} today
              </span>
            </div>

            <p className="text-xs text-white/70 mb-5 leading-relaxed">
              Fleet events with automated conflict alarms for overlapping schedules and QD warnings.
            </p>

            {/* List of today's events */}
            <div className="space-y-3 mb-5">
              {todayEvents.length === 0 ? (
                <div className="py-8 text-center text-xs text-white/50 bg-white/5 rounded-2xl border border-dashed border-white/15">
                  No fleet events scheduled for today.
                </div>
              ) : (
                todayEvents.slice(0, 3).map((ev) => (
                  <div
                    key={ev.id}
                    className="p-4 bg-white/10 hover:bg-white/15 rounded-2xl border border-white/15 text-xs space-y-2 transition-all shadow-2xs backdrop-blur-md"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-white font-bold bg-blue-600/60 border border-blue-400/30 px-2 py-0.5 rounded-lg">
                        {formatMilitaryRange(ev.startTime, ev.endTime)}
                      </span>
                      {ev.hasCalendarConflict && (
                        <span className="text-[10px] text-red-200 bg-red-500/30 px-2.5 py-0.5 rounded-full border border-red-400/40 font-semibold flex items-center gap-1.5 backdrop-blur-md">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" /> Direct Conflict
                        </span>
                      )}
                      {ev.hasDailyActivityOverlap && !ev.hasCalendarConflict && (
                        <span className="text-[10px] text-amber-200 bg-amber-500/30 px-2.5 py-0.5 rounded-full border border-amber-400/40 font-semibold flex items-center gap-1.5 backdrop-blur-md">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> QD Overlap
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-white text-xs">{ev.name}</div>
                    <div className="text-[11px] text-white/60 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-white/40 shrink-0" />
                      <span className="truncate">{ev.location}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            onClick={() => setActivePage('calendar')}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 border border-blue-400/30 shadow-[0_4px_16px_rgba(37,99,235,0.4)] cursor-pointer"
          >
            <span>Open Fleet Calendar</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card 2: Daily Activities (QD Routine) */}
        <div className="bg-white/12 backdrop-blur-2xl rounded-3xl border border-white/25 shadow-[0_15px_40px_rgba(0,0,0,0.2)] p-6 sm:p-7 flex flex-col justify-between hover:border-white/35 transition-all duration-300">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center justify-center font-bold shadow-2xs backdrop-blur-md">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Daily Activities (QD)</h2>
                  <p className="text-[11px] text-white/60">Quarterdeck standard routine</p>
                </div>
              </div>
              <span className="text-xs font-mono text-emerald-200 bg-emerald-500/25 px-3 py-1 rounded-full border border-emerald-400/40 font-semibold shadow-2xs backdrop-blur-md">
                Resets Daily
              </span>
            </div>

            <p className="text-xs text-white/70 mb-5 leading-relaxed">
              Official Quarterdeck daily routine. Read-only reference for cadets that automatically clears and resets daily at midnight.
            </p>

            {/* Currently Active Routine Box - Vibrant Electric Blue Glass Card matching reference */}
            <div className="p-4 bg-gradient-to-br from-blue-600/90 to-blue-700/95 rounded-2xl border border-blue-400/40 shadow-[0_8px_25px_rgba(37,99,235,0.4)] mb-4 space-y-1.5 backdrop-blur-xl">
              <span className="text-[10px] text-blue-200 uppercase font-bold tracking-wider block">
                Active Routine Right Now
              </span>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-bold text-white">
                  {activeActivity ? activeActivity.name : 'Routine Deck Standby'}
                </span>
                <span className="font-mono text-xs text-blue-100 font-bold shrink-0 bg-white/20 border border-white/25 px-2 py-0.5 rounded-md shadow-2xs">
                  {activeActivity ? formatMilitaryRange(activeActivity.startTime, activeActivity.endTime) : currentMilitary}
                </span>
              </div>
              <p className="text-[11px] text-blue-100/90">
                {activeActivity ? activeActivity.description : 'Night standby watch in effect.'}
              </p>
            </div>

            {/* Routine Highlights */}
            <div className="space-y-1.5 text-xs text-white/80">
              <span className="text-[10px] uppercase font-bold text-white/50 tracking-wider">
                Daily Highlights
              </span>
              {dailyActivities.slice(3, 6).map((act) => (
                <div key={act.id} className="flex items-center justify-between py-1.5 border-b border-white/10">
                  <span className="text-white/90 font-medium truncate max-w-[200px]">{act.name}</span>
                  <span className="font-mono text-[11px] text-white/50 font-medium">{formatMilitaryRange(act.startTime, act.endTime)}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => setActivePage('daily')}
            className="w-full mt-4 py-3 px-4 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 border border-white/20 shadow-2xs cursor-pointer backdrop-blur-md"
          >
            <span>View Full QD Routine</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3 Summary Cards with Glassmorphism and Rounded-3xl */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Watch Duties */}
        <div
          onClick={() => setActivePage('duties')}
          className="p-5 rounded-3xl bg-white/12 backdrop-blur-2xl border border-white/25 shadow-[0_12px_35px_rgba(0,0,0,0.2)] hover:border-white/40 hover:scale-[1.01] cursor-pointer transition-all duration-200 space-y-2 group"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold flex items-center gap-2 text-white">
              <div className="w-7 h-7 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-400/30 flex items-center justify-center">
                <Compass className="w-3.5 h-3.5" />
              </div>
              <span>Officers On Watch</span>
            </span>
            <span className="text-[11px] text-blue-300 font-semibold group-hover:translate-x-0.5 transition-transform">View →</span>
          </div>
          <p className="text-xs font-semibold text-white">
            FOD: <span className="text-blue-200">{currentWatch.fod}</span>
          </p>
          <p className="text-[11px] text-white/60">COOW: {currentWatch.coow}</p>
        </div>

        {/* Memo Repository */}
        <div
          onClick={() => setActivePage('memos')}
          className="p-5 rounded-3xl bg-white/12 backdrop-blur-2xl border border-white/25 shadow-[0_12px_35px_rgba(0,0,0,0.2)] hover:border-white/40 hover:scale-[1.01] cursor-pointer transition-all duration-200 space-y-2 group"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold flex items-center gap-2 text-white">
              <div className="w-7 h-7 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-400/30 flex items-center justify-center">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <span>Memo Repository</span>
            </span>
            <span className="text-[11px] text-blue-300 font-semibold group-hover:translate-x-0.5 transition-transform">Browse →</span>
          </div>
          <p className="text-xs font-semibold text-white">
            {memos.length} Directives organized by group
          </p>
          <p className="text-[11px] text-white/60">PDF &amp; DOCX official downloads</p>
        </div>

        {/* Latest Announcement */}
        <div
          onClick={() => setActivePage('announcements')}
          className="p-5 rounded-3xl bg-white/12 backdrop-blur-2xl border border-white/25 shadow-[0_12px_35px_rgba(0,0,0,0.2)] hover:border-white/40 hover:scale-[1.01] cursor-pointer transition-all duration-200 space-y-2 group"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold flex items-center gap-2 text-white">
              <div className="w-7 h-7 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-400/30 flex items-center justify-center">
                <Bell className="w-3.5 h-3.5" />
              </div>
              <span>Announcements</span>
            </span>
            <span className="text-[11px] text-blue-300 font-semibold group-hover:translate-x-0.5 transition-transform">All →</span>
          </div>
          <p className="text-xs font-semibold text-white truncate">
            {latestAnnouncement ? latestAnnouncement.title : 'No notices posted'}
          </p>
          <p className="text-[11px] text-white/60 truncate">
            {latestAnnouncement ? latestAnnouncement.content : 'Posted fleet directives appear here.'}
          </p>
        </div>
      </div>
    </div>
  );
};
