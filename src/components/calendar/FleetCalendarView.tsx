import React, { useState, useMemo } from 'react';
import { useFleet } from '../../context/FleetContext';
import { FleetEvent } from '../../types';
import {
  formatMilitaryRange,
  toISODateString,
} from '../../utils/timeConflict';
import {
  Calendar as CalendarIcon,
  Plus,
  AlertTriangle,
  AlertOctagon,
  MapPin,
  Trash2,
  Edit2,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const FleetCalendarView: React.FC<{ onOpenLogin: () => void }> = ({ onOpenLogin }) => {
  const {
    events,
    addFleetEvent,
    updateFleetEvent,
    deleteFleetEvent,
    checkConflicts,
    hasSchedulingPermission,
  } = useFleet();

  // Initialize with October 2026 and day 19 selected to match the board reference
  const [viewYear, setViewYear] = useState(2026);
  const [viewMonth, setViewMonth] = useState(9); // 0-indexed: 9 = October
  const [selectedDate, setSelectedDate] = useState<string>('2026-10-19');

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<FleetEvent | null>(null);

  // Form fields
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState(selectedDate);
  const [startTime, setStartTime] = useState('0900H');
  const [endTime, setEndTime] = useState('1100H');
  const [location, setLocation] = useState('');
  const [details, setDetails] = useState('');

  // Conflict Dialog States
  const [calendarAlarmActive, setCalendarAlarmActive] = useState(false);
  const [dailyWarningActive, setDailyWarningActive] = useState(false);
  const [detectedCalendarConflicts, setDetectedCalendarConflicts] = useState<FleetEvent[]>([]);
  const [detectedDailyConflicts, setDetectedDailyConflicts] = useState<any[]>([]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleToday = () => {
    const today = new Date();
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelectedDate(toISODateString(today));
  };

  const monthName = useMemo(() => {
    return new Date(viewYear, viewMonth, 1).toLocaleString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  }, [viewYear, viewMonth]);

  // Formatted date string for the right panel: "Mon, Oct 19, 2026"
  const formattedSelectedDate = useMemo(() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    if (!y || !m || !d) return selectedDate;
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [selectedDate]);

  // Map of events grouped by date
  const eventsByDate = useMemo(() => {
    const map = new Map<string, FleetEvent[]>();
    events.forEach((ev) => {
      const list = map.get(ev.date) || [];
      list.push(ev);
      map.set(ev.date, list);
    });
    return map;
  }, [events]);

  // Generate 7-column calendar matrix
  const calendarCells = useMemo(() => {
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun, 1 = Mon ...
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells: {
      dayNumber: number;
      dateStr: string;
      isCurrentMonth: boolean;
      isPrevMonth: boolean;
      isNextMonth: boolean;
    }[] = [];

    // Previous month filler days
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const prevM = viewMonth === 0 ? 11 : viewMonth - 1;
      const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
      const dateStr = `${prevY}-${String(prevM + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({
        dayNumber: day,
        dateStr,
        isCurrentMonth: false,
        isPrevMonth: true,
        isNextMonth: false,
      });
    }

    // Current month days
    for (let day = 1; day <= daysInCurrentMonth; day++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({
        dayNumber: day,
        dateStr,
        isCurrentMonth: true,
        isPrevMonth: false,
        isNextMonth: false,
      });
    }

    // Next month filler days to complete grid rows
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let day = 1; day <= remaining; day++) {
      const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
      const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
      const dateStr = `${nextY}-${String(nextM + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({
        dayNumber: day,
        dateStr,
        isCurrentMonth: false,
        isPrevMonth: false,
        isNextMonth: true,
      });
    }

    return cells;
  }, [viewYear, viewMonth]);

  // Events for currently selected date
  const selectedDayEvents = useMemo(() => {
    return events.filter((ev) => ev.date === selectedDate);
  }, [events, selectedDate]);

  const openCreateModal = () => {
    setEditingEvent(null);
    setEventName('');
    setEventDate(selectedDate);
    setStartTime('0900H');
    setEndTime('1100H');
    setLocation('');
    setDetails('');
    setCalendarAlarmActive(false);
    setDailyWarningActive(false);
    setIsFormOpen(true);
  };

  const openEditModal = (event: FleetEvent) => {
    setEditingEvent(event);
    setEventName(event.name);
    setEventDate(event.date);
    setStartTime(event.startTime);
    setEndTime(event.endTime);
    setLocation(event.location);
    setDetails(event.details || '');
    setCalendarAlarmActive(false);
    setDailyWarningActive(false);
    setIsFormOpen(true);
  };

  const liveConflictResult = useMemo(() => {
    if (!isFormOpen) return null;
    return checkConflicts({
      id: editingEvent?.id,
      date: eventDate,
      startTime,
      endTime,
    });
  }, [isFormOpen, editingEvent, eventDate, startTime, endTime, checkConflicts]);

  const handleScheduleSubmit = async (e?: React.FormEvent, forceBypassAlarm = false) => {
    if (e) e.preventDefault();
    if (!eventName.trim() || !eventDate || !startTime || !endTime) return;

    const conflictResult = checkConflicts({
      id: editingEvent?.id,
      date: eventDate,
      startTime,
      endTime,
    });

    // 1. Direct Calendar-to-Calendar conflict triggers ALARM
    if (conflictResult.hasCalendarConflict && !forceBypassAlarm) {
      setDetectedCalendarConflicts(conflictResult.calendarConflicts);
      setDetectedDailyConflicts(conflictResult.dailyConflicts);
      setCalendarAlarmActive(true);
      return;
    }

    // 2. Daily Activity overlap triggers WARNING only
    if (conflictResult.hasDailyConflict && !dailyWarningActive && !forceBypassAlarm) {
      setDetectedDailyConflicts(conflictResult.dailyConflicts);
      setDailyWarningActive(true);
      return;
    }

    if (editingEvent) {
      await updateFleetEvent(editingEvent.id, {
        name: eventName.trim(),
        date: eventDate,
        startTime,
        endTime,
        location: location.trim(),
        details: details.trim(),
      });
    } else {
      await addFleetEvent({
        name: eventName.trim(),
        date: eventDate,
        startTime,
        endTime,
        location: location.trim(),
        details: details.trim(),
      });
    }

    setIsFormOpen(false);
    setCalendarAlarmActive(false);
    setDailyWarningActive(false);
    setEditingEvent(null);
  };

  return (
    <div className="max-w-6xl mx-auto py-2 text-white">
      {/* Top Header Glass Banner */}
      <div className="p-6 sm:p-7 bg-white/12 backdrop-blur-2xl rounded-3xl border border-white/25 shadow-[0_15px_40px_rgba(0,0,0,0.25)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Fleet Calendar</h1>
          <p className="text-xs sm:text-sm text-white/75 mt-1">
            Acad Talks, Sports Meets, meetings, training &amp; scheduled activities.
          </p>
        </div>

        {hasSchedulingPermission && (
          <button
            onClick={openCreateModal}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-full flex items-center gap-2 transition-all duration-200 shadow-[0_4px_16px_rgba(37,99,235,0.45)] border border-blue-400/40 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Event</span>
          </button>
        )}
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Calendar Month Grid */}
        <div className="lg:col-span-8">
          <div className="bg-white/12 backdrop-blur-2xl rounded-3xl border border-white/25 p-6 shadow-[0_15px_40px_rgba(0,0,0,0.25)]">
            {/* Calendar Controls */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-base sm:text-lg text-white">
                {monthName}
              </h2>

              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 hover:bg-white/20 bg-white/10 border border-white/20 text-white rounded-full transition-colors cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleToday}
                  className="font-semibold text-white px-3 py-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full transition-colors cursor-pointer"
                >
                  Today
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 hover:bg-white/20 bg-white/10 border border-white/20 text-white rounded-full transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Weekdays Row */}
            <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold text-white/70 uppercase tracking-wider">
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>

            {/* Calendar Day Cells */}
            <div className="grid grid-cols-7 gap-2">
              {calendarCells.map((cell, idx) => {
                const isSelected = cell.dateStr === selectedDate;
                const dayEvents = eventsByDate.get(cell.dateStr) || [];
                const hasCalConflict = dayEvents.some((e) => e.hasCalendarConflict);
                const hasDailyOverlap = dayEvents.some((e) => e.hasDailyActivityOverlap);
                const hasAnyEvent = dayEvents.length > 0;

                // Previous or next month days
                if (!cell.isCurrentMonth) {
                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedDate(cell.dateStr)}
                      className="bg-white/5 border border-white/10 rounded-2xl min-h-[72px] sm:min-h-[82px] p-2.5 flex flex-col justify-between cursor-pointer transition-colors hover:bg-white/10"
                    >
                      <div className="text-right text-xs font-medium text-white/35">
                        {cell.dayNumber}
                      </div>
                      <div />
                    </div>
                  );
                }

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDate(cell.dateStr)}
                    className={`rounded-2xl min-h-[72px] sm:min-h-[82px] p-2.5 flex flex-col justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-600 border border-blue-400/60 shadow-[0_4px_16px_rgba(37,99,235,0.5)] text-white'
                        : hasAnyEvent
                        ? 'bg-white/15 border border-blue-400/40 hover:bg-white/25 text-white'
                        : 'bg-white/10 border border-white/15 hover:bg-white/20 text-white'
                    }`}
                  >
                    <div>
                      {isSelected ? (
                        <div className="w-6 h-6 rounded-full bg-white text-blue-700 flex items-center justify-center text-xs font-black shadow-sm">
                          {cell.dayNumber}
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-white">
                          {cell.dayNumber}
                        </span>
                      )}
                    </div>

                    {/* Event indicators */}
                    {hasAnyEvent && (
                      <div className="flex items-center gap-1 mt-1">
                        {hasCalConflict && (
                          <span
                            className="w-2 h-2 rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.8)]"
                            title="Calendar Collision"
                          />
                        )}
                        {hasDailyOverlap && (
                          <span
                            className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]"
                            title="Daily Activity Overlap"
                          />
                        )}
                        {!hasCalConflict && !hasDailyOverlap && (
                          <span
                            className="w-2 h-2 rounded-full bg-blue-300 shadow-[0_0_6px_rgba(147,197,253,0.8)]"
                            title="Fleet Event"
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Visual Legend */}
          <div className="flex items-center gap-6 mt-4 text-xs text-white/80 font-medium px-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.8)]" />
              <span>Calendar-to-calendar conflict</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
              <span>Overlaps a daily activity</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Selected Day Agenda */}
        <div className="lg:col-span-4">
          <div className="bg-white/12 backdrop-blur-2xl rounded-3xl border border-white/25 p-6 shadow-[0_15px_40px_rgba(0,0,0,0.25)] min-h-[460px] flex flex-col justify-between text-white">
            <div>
              {/* Day Header */}
              <div className="border-b border-white/15 pb-3">
                <h3 className="font-bold text-lg text-white">
                  {formattedSelectedDate}
                </h3>
                <p className="text-xs text-white/70 mt-0.5 font-medium">
                  {selectedDayEvents.length === 1
                    ? '1 event scheduled'
                    : `${selectedDayEvents.length} events scheduled`}
                </p>
              </div>

              {/* Day Events or Empty State */}
              {selectedDayEvents.length === 0 ? (
                <div className="py-24 flex flex-col items-center justify-center text-center">
                  <CalendarIcon className="w-9 h-9 text-white/40 stroke-[1.2] mb-2" />
                  <p className="text-xs text-white/70 font-medium">
                    No events scheduled this day.
                  </p>
                  {hasSchedulingPermission && (
                    <button
                      onClick={openCreateModal}
                      className="mt-3 text-xs font-semibold text-blue-300 hover:text-white underline cursor-pointer"
                    >
                      + Schedule an event
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3 mt-4">
                  {selectedDayEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className={`p-4 rounded-2xl border transition-all text-xs space-y-2 backdrop-blur-xl ${
                        ev.hasCalendarConflict
                          ? 'bg-red-500/20 border-red-400/40 text-white shadow-xs'
                          : ev.hasDailyActivityOverlap
                          ? 'bg-amber-500/20 border-amber-400/40 text-white shadow-xs'
                          : 'bg-white/10 border-white/20 text-white shadow-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-white tracking-wide">
                          {formatMilitaryRange(ev.startTime, ev.endTime)}
                        </span>
                        {ev.hasCalendarConflict && (
                          <span className="text-[10px] text-red-200 bg-red-600/60 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 border border-red-400/50">
                            <AlertOctagon className="w-3 h-3 text-red-200" /> Conflict
                          </span>
                        )}
                        {ev.hasDailyActivityOverlap && !ev.hasCalendarConflict && (
                          <span className="text-[10px] text-amber-200 bg-amber-600/60 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 border border-amber-400/50">
                            <AlertTriangle className="w-3 h-3 text-amber-200" /> QD Overlap
                          </span>
                        )}
                      </div>

                      <div className="font-bold text-sm text-white">{ev.name}</div>

                      {ev.details && (
                        <p className="text-xs text-white/80 leading-relaxed">{ev.details}</p>
                      )}

                      {/* Conflict explanation notices */}
                      {ev.hasCalendarConflict && ev.conflictingEventNames && (
                        <div className="text-[11px] text-white font-medium p-2.5 bg-red-950/70 rounded-xl border border-red-400/50">
                          <strong className="text-red-200">Conflict:</strong> {ev.conflictingEventNames.join(', ')}
                        </div>
                      )}
                      {ev.hasDailyActivityOverlap && ev.overlappingActivityNames && !ev.hasCalendarConflict && (
                        <div className="text-[11px] text-white font-medium p-2.5 bg-amber-950/70 rounded-xl border border-amber-400/50">
                          <strong className="text-amber-200">Notice:</strong> Overlaps {ev.overlappingActivityNames.join(', ')}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1 text-white/70 text-[11px]">
                        <div className="flex items-center gap-1.5 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-blue-300" />
                          <span>{ev.location}</span>
                        </div>

                        {hasSchedulingPermission && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditModal(ev)}
                              className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/15 transition-colors cursor-pointer"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={async () => await deleteFleetEvent(ev.id)}
                              className="p-1.5 text-red-300 hover:text-red-200 rounded-lg hover:bg-red-500/20 transition-colors cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {hasSchedulingPermission && selectedDayEvents.length > 0 && (
              <button
                onClick={openCreateModal}
                className="w-full mt-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl border border-white/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Event on this date</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* EVENT FORM MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-slate-900/90 backdrop-blur-3xl rounded-3xl border border-white/25 shadow-[0_25px_60px_rgba(0,0,0,0.6)] p-6 sm:p-7 text-white">
            <button
              onClick={() => setIsFormOpen(false)}
              className="absolute top-6 right-6 text-white/60 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-lg font-bold text-white mb-4">
              {editingEvent ? 'Edit Fleet Event' : 'Schedule Fleet Event'}
            </h2>

            {/* Live Conflict Feedback */}
            {liveConflictResult && (
              <div className="space-y-2 mb-4 text-xs">
                {liveConflictResult.hasCalendarConflict && (
                  <div className="p-3 bg-red-500/20 border border-red-400/40 rounded-2xl text-red-200">
                    <span className="font-bold">Direct Calendar Conflict:</span> Overlaps with an existing fleet event.
                  </div>
                )}
                {liveConflictResult.hasDailyConflict && !liveConflictResult.hasCalendarConflict && (
                  <div className="p-3 bg-amber-500/20 border border-amber-400/40 rounded-2xl text-amber-200">
                    <span className="font-bold">QD Routine Warning:</span> Overlaps with a daily Quarterdeck routine.
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleScheduleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-white/80 font-medium mb-1">Event Name *</label>
                <input
                  type="text"
                  required
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="e.g. Acad Talk: Maritime Navigation"
                  className="w-full px-3.5 py-2.5 bg-white/12 border border-white/20 rounded-xl text-white placeholder-white/45 text-xs focus:outline-none focus:border-blue-400 transition-all font-medium"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-white/80 font-medium mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-2.5 py-2 bg-white/12 border border-white/20 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-blue-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-white/80 font-medium mb-1">Start (24H) *</label>
                  <input
                    type="text"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value.toUpperCase())}
                    placeholder="0830H"
                    className="w-full px-2.5 py-2 bg-white/12 border border-white/20 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-blue-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-white/80 font-medium mb-1">End (24H) *</label>
                  <input
                    type="text"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value.toUpperCase())}
                    placeholder="1000H"
                    className="w-full px-2.5 py-2 bg-white/12 border border-white/20 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-blue-400 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white/80 font-medium mb-1">Location *</label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Auditorium, Sports Complex"
                  className="w-full px-3.5 py-2.5 bg-white/12 border border-white/20 rounded-xl text-white placeholder-white/45 text-xs focus:outline-none focus:border-blue-400 transition-all"
                />
              </div>

              <div>
                <label className="block text-white/80 font-medium mb-1">Details (Optional)</label>
                <textarea
                  rows={2}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Notes or instructions..."
                  className="w-full px-3.5 py-2.5 bg-white/12 border border-white/20 rounded-xl text-white placeholder-white/45 text-xs focus:outline-none focus:border-blue-400 transition-all resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/15">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-white/70 hover:text-white rounded-full font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-full shadow-[0_4px_16px_rgba(37,99,235,0.45)] border border-blue-400/40 transition-all cursor-pointer"
                >
                  Save Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CALENDAR-TO-CALENDAR CONFLICT ALARM DIALOG */}
      {calendarAlarmActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-3xl border border-red-500/40 rounded-3xl p-6 text-white space-y-4 shadow-[0_25px_60px_rgba(0,0,0,0.6)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-500/20 text-red-300 border border-red-400/30 flex items-center justify-center shrink-0">
                <AlertOctagon className="w-5 h-5 text-red-300" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Calendar Conflict Alarm
                </h3>
                <p className="text-xs text-red-300 font-medium">Overlapping Fleet Schedule Detected</p>
              </div>
            </div>
            <p className="text-xs text-white/80">
              This event conflicts with another Fleet Calendar event at the same time:
            </p>
            <div className="space-y-2">
              {detectedCalendarConflicts.map((c) => (
                <div key={c.id} className="p-3 bg-red-500/20 border border-red-400/40 rounded-2xl text-xs font-mono text-white">
                  <div className="font-bold text-white">{c.name}</div>
                  <div className="text-[11px] text-red-200 mt-1">
                    {formatMilitaryRange(c.startTime, c.endTime)} · {c.location}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setCalendarAlarmActive(false)}
                className="px-4 py-2 text-xs text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full font-medium transition-colors cursor-pointer"
              >
                Adjust Schedule
              </button>
              <button
                type="button"
                onClick={() => handleScheduleSubmit(undefined, true)}
                className="px-5 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-full shadow-[0_4px_16px_rgba(239,68,68,0.45)] border border-red-400/40 transition-all cursor-pointer"
              >
                Override &amp; Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DAILY ACTIVITY WARNING DIALOG */}
      {dailyWarningActive && !calendarAlarmActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-3xl border border-amber-500/40 rounded-3xl p-6 text-white space-y-4 shadow-[0_25px_60px_rgba(0,0,0,0.6)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Daily Activity Warning</h3>
                <p className="text-xs text-amber-300 font-medium">Overlaps with Quarterdeck Routine</p>
              </div>
            </div>
            <p className="text-xs text-white/80 leading-relaxed">
              WARNING: This event overlaps with a Daily Activity scheduled from{' '}
              <strong className="text-white font-mono">
                {detectedDailyConflicts.map((d) => formatMilitaryRange(d.startTime, d.endTime)).join(', ')}
              </strong>
              . Continue scheduling?
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDailyWarningActive(false)}
                className="px-4 py-2 text-xs text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full font-medium transition-colors cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={() => handleScheduleSubmit(undefined, true)}
                className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-full shadow-[0_4px_16px_rgba(245,158,11,0.45)] border border-amber-400/40 transition-all cursor-pointer"
              >
                YES
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
