export type UserRole = 'admin' | 'fleet_officer' | 'fleet_leader';

export interface UserPermissions {
  canAddCalendarEvents?: boolean;
  canUploadMemos?: boolean;
  canPostAnnouncements?: boolean;
  canEditDuties?: boolean;
  canEditDailyActivities?: boolean;
  canConductMustering?: boolean;
}

export interface UserAccount {
  id: string;
  username: string;
  email?: string;
  title?: string;
  password?: string;
  fullName: string;
  rank: string;
  role: UserRole;
  createdAt: string;
  isActive: boolean;
  permissions?: UserPermissions;
}

export interface FleetEvent {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  startTime: string; // e.g. 0830H
  endTime: string; // e.g. 1000H
  location: string;
  details?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  // Conflict status flags
  hasCalendarConflict?: boolean;
  conflictingEventNames?: string[];
  hasDailyActivityOverlap?: boolean;
  overlappingActivityNames?: string[];
}

export interface DailyActivity {
  id: string;
  code: string;
  name: string;
  startTime: string; // e.g. 0600H
  endTime: string; // e.g. 0700H
  location: string;
  description: string;
  isMandatory: boolean;
  category: 'ROUTINE' | 'ACADEMIC' | 'CEREMONIAL' | 'TRAINING';
}

export interface MemoGroup {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  isDefault?: boolean;
}

export interface Memorandum {
  id: string;
  title: string;
  memoNumber: string; // e.g. MMMA-MEMO-2026-088
  groupId: string;
  fileFormat: 'PDF' | 'DOCX';
  fileName: string;
  fileSize: string;
  fileUrl?: string;
  uploadedBy: string;
  uploadedByName: string;
  uploadDate: string; // YYYY-MM-DD
  effectiveDate: string; // YYYY-MM-DD
  summary: string;
  signatory: string;
  isPublicToCadets: boolean;
}

export type AnnouncementAudience = 'Fleet' | '1st Year' | '2nd Year' | '3rd Year';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'ROUTINE' | 'IMPORTANT' | 'CRITICAL';
  postedBy: string;
  postedByName: string;
  postedAt: string; // ISO or military time
  date: string; // YYYY-MM-DD
  category: string;
  targetAudience?: AnnouncementAudience;
}

export interface MusterEntry {
  id: string;
  cadetNumber: string;
  name: string;
  company: 'Alpha' | 'Bravo' | 'Charlie' | 'Delta';
  platoon: string;
  status: 'PRESENT' | 'ABSENT' | 'SICKBAY' | 'ON_DUTY';
  remarks?: string;
  updatedAt: string;
}

export interface DutyRosterItem {
  id: string;
  date: string;
  watchPeriod?: string; // e.g. 0800H–1200H
  fod: string; // Formation Officer of the Day
  fodRank?: string;
  coow: string; // Cadet Officer of the Watch
  coowRank?: string;
  acoow1?: string; // Assistant Cadet Officer of the Watch 1
  acoow2?: string; // Assistant Cadet Officer of the Watch 2
  acwo?: string; // Backward compatibility with acoow1
  acwoRank?: string;
  moow?: string; // Mate Officer of the Watch
  amoow1?: string; // Assistant Mate Officer of the Watch 1
  amoow2?: string; // Assistant Mate Officer of the Watch 2
  station?: string;
  status?: 'SCHEDULED' | 'ON_WATCH' | 'RELIEVED';
  logSummary?: string;
}

export interface ConflictDetectionResult {
  hasCalendarConflict: boolean;
  calendarConflicts: FleetEvent[];
  hasDailyConflict: boolean;
  dailyConflicts: DailyActivity[];
  message?: string;
}
