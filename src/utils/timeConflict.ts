import { FleetEvent, DailyActivity, ConflictDetectionResult } from '../types';

/**
 * Converts military or standard time strings to minutes from 00:00 (0 to 1439).
 * Handles formats like:
 * "0630H", "0630", "06:30", "630", "1400H", "14:00"
 */
export function militaryTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  
  // Strip trailing 'H' or 'h' and any whitespace
  const clean = timeStr.trim().replace(/[Hh]$/, '').replace(/\s+/g, '');
  
  let hours = 0;
  let minutes = 0;
  
  if (clean.includes(':')) {
    const parts = clean.split(':');
    hours = parseInt(parts[0], 10) || 0;
    minutes = parseInt(parts[1], 10) || 0;
  } else {
    // Padded 4-digit number like "0630" or 3-digit "630"
    const padded = clean.padStart(4, '0');
    hours = parseInt(padded.slice(0, 2), 10) || 0;
    minutes = parseInt(padded.slice(2, 4), 10) || 0;
  }
  
  // Bound to 24-hour clock
  hours = Math.max(0, Math.min(23, hours));
  minutes = Math.max(0, Math.min(59, minutes));
  
  return hours * 60 + minutes;
}

/**
 * Formats minutes from midnight to standard 24-hour military notation (e.g. 0630H).
 */
export function minutesToMilitaryTime(minutes: number): string {
  const bounded = Math.max(0, Math.min(1439, Math.floor(minutes)));
  const hrs = Math.floor(bounded / 60).toString().padStart(2, '0');
  const mins = (bounded % 60).toString().padStart(2, '0');
  return `${hrs}${mins}H`;
}

/**
 * Normalizes any user input time into clean military 4-digit format with H (e.g. 0630H).
 */
export function normalizeMilitaryTime(timeStr: string): string {
  if (!timeStr) return '0800H';
  const mins = militaryTimeToMinutes(timeStr);
  return minutesToMilitaryTime(mins);
}

/**
 * Formats a time span into military range (e.g. 0630H–0730H).
 */
export function formatMilitaryRange(start: string, end: string): string {
  return `${normalizeMilitaryTime(start)}–${normalizeMilitaryTime(end)}`;
}

/**
 * Checks if two time intervals [startA, endA) and [startB, endB) overlap.
 */
export function doIntervalsOverlap(startA: number, endA: number, startB: number, endB: number): boolean {
  // If end is equal to or before start (e.g. crossing midnight or zero duration)
  if (endA <= startA) {
    endA += 1440; // wrap into next day minutes
  }
  if (endB <= startB) {
    endB += 1440;
  }
  
  return Math.max(startA, startB) < Math.min(endA, endB);
}

/**
 * Evaluates a candidate Fleet Event against:
 * 1. Existing Fleet Calendar events on the same date (Calendar Conflict -> ALARM)
 * 2. QD Daily Activities (Daily Overlap -> WARNING)
 */
export function evaluateEventConflicts(
  target: {
    id?: string;
    date: string;
    startTime: string;
    endTime: string;
  },
  allEvents: FleetEvent[],
  dailyActivities: DailyActivity[]
): ConflictDetectionResult {
  const targetStart = militaryTimeToMinutes(target.startTime);
  const targetEnd = militaryTimeToMinutes(target.endTime);
  
  // 1. Calendar-to-Calendar Check (on same date)
  const calendarConflicts = allEvents.filter((event) => {
    if (target.id && event.id === target.id) return false;
    if (event.date !== target.date) return false;
    
    const evStart = militaryTimeToMinutes(event.startTime);
    const evEnd = militaryTimeToMinutes(event.endTime);
    
    return doIntervalsOverlap(targetStart, targetEnd, evStart, evEnd);
  });
  
  // 2. Calendar-to-Daily Activity Check (QD routines active for the day)
  const dailyConflicts = dailyActivities.filter((activity) => {
    const actStart = militaryTimeToMinutes(activity.startTime);
    const actEnd = militaryTimeToMinutes(activity.endTime);
    
    return doIntervalsOverlap(targetStart, targetEnd, actStart, actEnd);
  });
  
  return {
    hasCalendarConflict: calendarConflicts.length > 0,
    calendarConflicts,
    hasDailyConflict: dailyConflicts.length > 0,
    dailyConflicts,
  };
}

/**
 * Returns the current time in military format (e.g. "1430H")
 */
export function getCurrentMilitaryTime(date: Date = new Date()): string {
  const hrs = date.getHours().toString().padStart(2, '0');
  const mins = date.getMinutes().toString().padStart(2, '0');
  return `${hrs}${mins}H`;
}

/**
 * Formats a Date object to YYYY-MM-DD
 */
export function toISODateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}
