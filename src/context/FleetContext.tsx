import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  UserAccount,
  UserRole,
  FleetEvent,
  DailyActivity,
  MemoGroup,
  Memorandum,
  Announcement,
  MusterEntry,
  DutyRosterItem,
  ConflictDetectionResult,
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_MEMO_GROUPS,
  INITIAL_MEMOS,
  INITIAL_DAILY_ACTIVITIES,
  getInitialEvents,
  getInitialAnnouncements,
  getInitialMuster,
  getInitialDuties,
} from '../data/mockData';
import {
  evaluateEventConflicts,
  toISODateString,
  getCurrentMilitaryTime,
  militaryTimeToMinutes,
} from '../utils/timeConflict';
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/supabase';

export type AppPage =
  | 'dashboard'
  | 'calendar'
  | 'daily'
  | 'announcements'
  | 'mustering'
  | 'duties'
  | 'memos'
  | 'accounts';

interface FleetContextType {
  // Navigation
  activePage: AppPage;
  setActivePage: (page: AppPage) => void;

  // Auth & Roles (null = Normal Cadet / Unauthenticated Viewer)
  currentUser: UserAccount | null;
  users: UserAccount[];
  login: (identifier: string, password?: string) => { success: boolean; error?: string };
  logout: () => void;
  createUserAccount: (
    user: Omit<UserAccount, 'id' | 'createdAt'>
  ) => Promise<{ success: boolean; error?: string; supabaseSaved?: boolean }>;
  updateUserAccount: (id: string, partial: Partial<UserAccount>) => Promise<void>;
  deleteUserAccount: (id: string) => Promise<void>;
  hasSchedulingPermission: boolean;
  isFleetOfficerOrAdmin: boolean;
  isAdmin: boolean;
  canAddCalendarEvents: boolean;
  canUploadMemos: boolean;
  canPostAnnouncements: boolean;
  canEditDuties: boolean;
  canEditDailyActivities: boolean;
  canConductMustering: boolean;

  // Fleet Calendar
  events: FleetEvent[];
  addFleetEvent: (event: Omit<FleetEvent, 'id' | 'createdAt' | 'createdBy' | 'createdByName'>) => Promise<{
    success: boolean;
    conflictResult: ConflictDetectionResult;
    createdId?: string;
  }>;
  updateFleetEvent: (id: string, event: Partial<FleetEvent>) => Promise<void>;
  deleteFleetEvent: (id: string) => Promise<void>;
  checkConflicts: (target: {
    id?: string;
    date: string;
    startTime: string;
    endTime: string;
  }) => ConflictDetectionResult;

  // Daily Activities (QD)
  dailyActivities: DailyActivity[];
  addDailyActivity: (activity: Omit<DailyActivity, 'id'>) => Promise<void>;
  updateDailyActivity: (id: string, partial: Partial<DailyActivity>) => Promise<void>;
  deleteDailyActivity: (id: string) => Promise<void>;

  // Memo Repository & Groups
  memoGroups: MemoGroup[];
  memos: Memorandum[];
  createMemoGroup: (name: string, description?: string) => boolean;
  updateMemoGroup: (id: string, name: string, description?: string) => void;
  deleteMemoGroup: (id: string) => void;
  uploadMemorandum: (
    memo: Omit<Memorandum, 'id' | 'uploadDate' | 'uploadedBy' | 'uploadedByName'>,
    fileBlob?: File | Blob
  ) => Promise<{
    success: boolean;
    dbSaved: boolean;
    storageSaved: boolean;
    storageError?: string;
    dbError?: string;
  }>;
  updateMemorandum: (id: string, partial: Partial<Memorandum>) => Promise<boolean>;
  deleteMemorandum: (id: string) => Promise<void> | void;

  // Announcements
  announcements: Announcement[];
  addAnnouncement: (
    item: Omit<Announcement, 'id' | 'postedAt' | 'date' | 'postedBy' | 'postedByName'>
  ) => Promise<void>;
  updateAnnouncement: (id: string, partial: Partial<Announcement>) => Promise<void>;
  deleteAnnouncement: (id: string) => Promise<void>;

  // Mustering
  musterList: MusterEntry[];
  updateMusterEntry: (id: string, status: MusterEntry['status'], remarks?: string) => void;
  resetMusterRoll: () => void;

  // Duties
  dutyRoster: DutyRosterItem[];
  updateDutyItem: (id: string, partial: Partial<DutyRosterItem>) => Promise<void>;

  // Standing Orders & Board Meta
  standingOrders: string[];
  updateStandingOrders: (orders: string[]) => Promise<void>;
  uniformData: {
    primaryLabel: string;
    primaryValue: string;
    secondaryLabel: string;
    secondaryValue: string;
  };
  updateUniformData: (data: {
    primaryLabel: string;
    primaryValue: string;
    secondaryLabel: string;
    secondaryValue: string;
  }) => Promise<void>;
  fleetData: {
    section1: { title: string; names: string[] };
    section2: { title: string; names: string[] };
    section3: { title: string; names: string[] };
    note: string;
  };
  updateFleetData: (data: any) => Promise<void>;
  strengthRows: {
    id: string;
    batch: string;
    ts: number | string;
    tp: number | string;
    nya: number | string;
  }[];
  strengthAsOf: string;
  updateStrengthRows: (rows: any[], asOf: string) => Promise<void>;

  // Daily Reset & Notifications Engine
  lastResetDate: string;
  simulateDailyReset: () => void;
  resetNotification: string | null;
  showSyncNotification: (msg: string) => void;
  clearResetNotification: () => void;
}

const FleetContext = createContext<FleetContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = 'mmma_fleetsync_';

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(STORAGE_KEY_PREFIX + key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    console.warn(`Error loading storage key ${key}`, e);
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Error saving storage key ${key}`, e);
  }
}

export const FleetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activePage, setActivePage] = useState<AppPage>('dashboard');

  // User auth state: default null (Normal Cadet)
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const loaded = loadFromStorage<UserAccount | null>('current_user', null);
    if (loaded && (loaded.role === 'admin' || loaded.fullName?.toUpperCase().includes('RODOLFO'))) {
      return {
        ...loaded,
        fullName: 'Administrator',
        title: 'Administrator',
        rank: 'Administrator',
      };
    }
    return loaded;
  });

  const [users, setUsers] = useState<UserAccount[]>(() => {
    const loaded = loadFromStorage<UserAccount[]>('users', INITIAL_USERS);
    // Remove old mock users
    const cleaned = loaded.filter((u) => u.role === 'admin' || !['usr-2', 'usr-3', 'usr-4'].includes(u.id));
    return cleaned.map((u) => {
      const match = INITIAL_USERS.find(
        (init) => init.id === u.id || init.username.toLowerCase() === u.username.toLowerCase()
      );
      const isNavarro = u.fullName?.toUpperCase().includes('RODOLFO') || u.role === 'admin';
      return {
        ...u,
        fullName: isNavarro ? 'Administrator' : u.fullName,
        rank: isNavarro ? 'Administrator' : (u.rank || u.title || 'Officer On Watch'),
        email: u.email || match?.email || `${u.username.toLowerCase()}@fleet.ops`,
        title: isNavarro ? 'Administrator' : (u.title || match?.title || u.rank || 'Officer On Watch'),
      };
    });
  });

  const [events, setEvents] = useState<FleetEvent[]>(() => {
    const loaded = loadFromStorage<FleetEvent[]>('events', getInitialEvents());
    return loaded.filter((e) => !e.id.startsWith('evt-0'));
  });

  const [dailyActivities, setDailyActivities] = useState<DailyActivity[]>(() => {
    return loadFromStorage<DailyActivity[]>('daily_activities', INITIAL_DAILY_ACTIVITIES);
  });

  const [memoGroups, setMemoGroups] = useState<MemoGroup[]>(() => {
    return loadFromStorage<MemoGroup[]>('memo_groups', INITIAL_MEMO_GROUPS);
  });

  const [memos, setMemos] = useState<Memorandum[]>(() => {
    const loaded = loadFromStorage<Memorandum[]>('memos', INITIAL_MEMOS);
    return loaded.filter((m) => !m.id.startsWith('memo-0'));
  });

  const [announcements, setAnnouncements] = useState<Announcement[]>(() => {
    const loaded = loadFromStorage<Announcement[]>('announcements', getInitialAnnouncements());
    return loaded.filter((a) => !a.id.startsWith('ann-0'));
  });

  const [musterList, setMusterList] = useState<MusterEntry[]>(() => {
    return loadFromStorage<MusterEntry[]>('muster_list', getInitialMuster());
  });

  const [dutyRoster, setDutyRoster] = useState<DutyRosterItem[]>(() => {
    const loaded = loadFromStorage<DutyRosterItem[]>('duty_roster', getInitialDuties());
    if (loaded && loaded.length > 0) {
      return loaded.map((item) => ({
        ...item,
        acoow1: item.acoow1 || item.acwo || '',
        acoow2: item.acoow2 || '',
        moow: item.moow || '',
        amoow1: item.amoow1 || '',
        amoow2: item.amoow2 || '',
      }));
    }
    return getInitialDuties();
  });

  const [standingOrders, setStandingOrders] = useState<string[]>(() => {
    return loadFromStorage<string[]>('standing_orders', [
      'Strict Formation Discipline: All cadets shall be in full uniform at quarterdeck 15 minutes prior to Morning Colors (0600H).',
      'Watch Relief Protocol: Watch personnel (COOW, ACOOW, MOOW) must complete formal watch relief logover before station handover.',
      'Campus Leave & Out-of-Bounds: No cadet shall exit academy gates without approved leave chit signed by the Formation Officer of the Day (FOD).',
      'Safety & Sickbay Reporting: Any sickbay admission or muster discrepancy must be reported to the FOD desk immediately.',
      'Taps & Quiet Hours: Mandatory Taps at 2200H. Barracks lights out and silent study hours strictly enforced across all companies.',
    ]);
  });

  const [uniformData, setUniformData] = useState<{
    primaryLabel: string;
    primaryValue: string;
    secondaryLabel: string;
    secondaryValue: string;
  }>(() => {
    return loadFromStorage('uniform_requirements', {
      primaryLabel: 'UNIFORM OF THE DAY',
      primaryValue: 'NAVY BLUE SHIRT W/ JEANS',
      secondaryLabel: 'ENRICHMENT UNIFORM OF THE DAY',
      secondaryValue: 'ANY ATHLETIC ATTIRE',
    });
  });

  const [fleetData, setFleetData] = useState<any>(() => {
    return loadFromStorage('fleet_roster', {
      section1: { title: 'CADET CANDIDATES', names: ['BATCH 3'] },
      section2: { title: 'CADET TRAINER', names: ['OLIVAR', 'OCDP', 'BERINGUELA', 'BALUCOS', 'GO'] },
      section3: { title: 'SLDP', names: ['BELOLO', 'DE OCAMPO'] },
      note: 'ABOARD CADETS',
    });
  });

  const [strengthRows, setStrengthRows] = useState<any[]>(() => {
    return loadFromStorage('total_strength', [
      { id: 'str-1', batch: 'SLDP', ts: 2, tp: 2, nya: 0 },
      { id: 'str-2', batch: 'CADET TRAINERS', ts: 108, tp: 108, nya: 0 },
      { id: 'str-3', batch: 'CADET CANDIDATES (265)', ts: 211, tp: 211, nya: 0 },
    ]);
  });

  const [strengthAsOf, setStrengthAsOf] = useState<string>(() => {
    return loadFromStorage('strength_as_of', '0800H');
  });

  const [lastResetDate, setLastResetDate] = useState<string>(() => {
    return loadFromStorage<string>('last_reset_date', toISODateString(new Date()));
  });

  const [resetNotification, setResetNotification] = useState<string | null>(null);

  const showSyncNotification = (msg: string) => {
    setResetNotification(msg);
  };

  // Sync state to storage
  useEffect(() => {
    saveToStorage('current_user', currentUser);
  }, [currentUser]);

  useEffect(() => {
    saveToStorage('users', users);
  }, [users]);

  useEffect(() => {
    saveToStorage('events', events);
  }, [events]);

  useEffect(() => {
    saveToStorage('daily_activities', dailyActivities);
  }, [dailyActivities]);

  useEffect(() => {
    saveToStorage('memo_groups', memoGroups);
  }, [memoGroups]);

  useEffect(() => {
    saveToStorage('memos', memos);
  }, [memos]);

  useEffect(() => {
    saveToStorage('announcements', announcements);
  }, [announcements]);

  useEffect(() => {
    saveToStorage('muster_list', musterList);
  }, [musterList]);

  useEffect(() => {
    saveToStorage('duty_roster', dutyRoster);
  }, [dutyRoster]);

  useEffect(() => {
    saveToStorage('last_reset_date', lastResetDate);
  }, [lastResetDate]);

  // Automated midnight check
  useEffect(() => {
    const today = toISODateString(new Date());
    if (lastResetDate !== today) {
      simulateDailyReset();
    }
  }, []);

  // Fetch real memos from server proxy API
  useEffect(() => {
    let isMounted = true;
    const fetchSupabaseMemos = async () => {
      try {
        const { data, error } = await apiGet<any[]>('memos');

        if (!error && data && data.length > 0 && isMounted) {
          const loaded: Memorandum[] = data.map((row: any) => ({
            id: row.id,
            title: row.title,
            memoNumber: row.memo_number,
            groupId: row.group_id,
            fileFormat: (row.file_format as 'PDF' | 'DOCX') || 'PDF',
            fileName: row.file_name,
            fileSize: row.file_size || '1.2 MB',
            fileUrl: row.file_url || undefined,
            uploadedBy: row.uploaded_by || 'usr-anon',
            uploadedByName: row.uploaded_by_name || 'Fleet Officer',
            uploadDate: row.upload_date,
            effectiveDate: row.effective_date,
            summary: row.summary || '',
            signatory: row.signatory,
            isPublicToCadets: row.is_public_to_cadets ?? true,
          }));
          setMemos((prev) => {
            const dynamicNonMock = prev.filter((m) => !m.id.startsWith('memo-0'));
            const existingIds = new Set(loaded.map((m) => m.id));
            const extra = dynamicNonMock.filter((m) => !existingIds.has(m.id));
            return [...loaded, ...extra];
          });
        }
      } catch (err) {
        console.warn('Memos initial fetch notice:', err);
      }
    };

    // Fetch real officers from server proxy API
    const fetchSupabaseOfficers = async () => {
      try {
        const { data, error } = await apiGet<any[]>('officers');

        if (!error && data && data.length > 0 && isMounted) {
          const loaded: UserAccount[] = data.map((row: any) => ({
            id: row.id || `usr-${row.email}`,
            username: row.username || (row.email ? row.email.split('@')[0] : `user_${Date.now()}`),
            email: row.email,
            title: row.title || row.rank || 'Officer On Watch',
            rank: row.rank || row.title || 'Officer On Watch',
            fullName: row.full_name || row.title || 'Fleet Officer',
            role: (row.role as UserRole) || 'fleet_officer',
            createdAt: row.created_at ? toISODateString(new Date(row.created_at)) : toISODateString(new Date()),
            isActive: row.is_active !== false,
            permissions: row.permissions || undefined,
          }));

          setUsers((prev) => {
            const map = new Map<string, UserAccount>();
            for (const u of prev) {
              if (u.email) map.set(u.email.toLowerCase(), u);
              else map.set(u.username.toLowerCase(), u);
            }
            for (const o of loaded) {
              if (o.email) map.set(o.email.toLowerCase(), o);
              else map.set(o.username.toLowerCase(), o);
            }
            return Array.from(map.values());
          });
        }
      } catch (err) {
        console.warn('Officers initial fetch notice:', err);
      }
    };

    // Fetch real events from server proxy API
    const fetchSupabaseEvents = async () => {
      try {
        const { data, error } = await apiGet<any[]>('events');
        if (!error && Array.isArray(data) && isMounted) {
          const loaded: FleetEvent[] = data.map((row: any) => ({
            id: row.id,
            name: row.name,
            date: row.date,
            startTime: row.start_time,
            endTime: row.end_time,
            location: row.location || 'Academy Grounds',
            details: row.details || '',
            createdBy: row.created_by || 'usr-anon',
            createdByName: row.created_by_name || 'Fleet Officer',
            createdAt: row.created_at || toISODateString(new Date()),
          }));
          setEvents(loaded);
        }
      } catch (err) {
        console.warn('Events initial fetch notice:', err);
      }
    };

    // Fetch real announcements from server proxy API
    const fetchSupabaseAnnouncements = async () => {
      try {
        const { data, error } = await apiGet<any[]>('announcements');
        if (!error && Array.isArray(data) && isMounted) {
          const loaded: Announcement[] = data.map((row: any) => ({
            id: row.id,
            title: row.title,
            content: row.content,
            priority: (row.priority as 'ROUTINE' | 'IMPORTANT' | 'CRITICAL') || (row.is_critical ? 'CRITICAL' : 'ROUTINE'),
            category: row.category || 'ROUTINE',
            targetAudience: (row.target_audience as any) || row.targetAudience || 'Fleet',
            date: row.date,
            postedAt: row.posted_at || '0800H',
            postedBy: row.posted_by || 'usr-anon',
            postedByName: row.posted_by_name || 'Fleet Duty Officer',
          }));
          setAnnouncements(loaded);
        }
      } catch (err) {
        console.warn('Announcements initial fetch notice:', err);
      }
    };

    // Fetch real duty roster from server proxy API
    const fetchSupabaseDuties = async () => {
      try {
        const { data, error } = await apiGet<any[]>('duties');
        if (!error && Array.isArray(data) && data.length > 0 && isMounted) {
          const loaded: DutyRosterItem[] = data.map((row: any) => ({
            id: row.id,
            date: row.date,
            fod: row.fod || '',
            coow: row.coow || '',
            acoow1: row.acoow1 || row.acwo || '',
            acoow2: row.acoow2 || '',
            acwo: row.acoow1 || row.acwo || '',
            moow: row.moow || '',
            amoow1: row.amoow1 || '',
            amoow2: row.amoow2 || '',
            station: row.station || 'Quarterdeck Main Desk',
            status: row.status || 'ON_WATCH',
          }));
          setDutyRoster(loaded);
        }
      } catch (err) {
        console.warn('Duties initial fetch notice:', err);
      }
    };

    // Fetch real daily activities from server proxy API
    const fetchSupabaseDailyActivities = async () => {
      try {
        const { data, error } = await apiGet<any[]>('daily-activities');
        if (!error && data && data.length > 0 && isMounted) {
          const loaded: DailyActivity[] = data
            .map((row: any) => ({
              id: row.id,
              code: row.code || `ACT-${row.id}`,
              name: row.name,
              startTime: row.start_time,
              endTime: row.end_time,
              location: row.location || 'Academy Grounds',
              description: row.description || row.name,
              isMandatory: row.is_mandatory !== false,
              category: row.category || 'ROUTINE',
            }))
            .sort((a, b) => militaryTimeToMinutes(a.startTime) - militaryTimeToMinutes(b.startTime));
          setDailyActivities(loaded);
        }
      } catch (err) {
        console.warn('Daily activities initial fetch notice:', err);
      }
    };

    const fetchSupabaseStandingOrders = async () => {
      try {
        const { data, error } = await apiGet<any[]>('standing-orders');
        if (!error && Array.isArray(data) && data.length > 0 && isMounted) {
          setStandingOrders(data.map((r: any) => r.order_text));
        }
      } catch (err) {
        console.warn('Standing orders fetch notice:', err);
      }
    };

    const fetchSupabaseBoardMeta = async () => {
      try {
        const { data, error } = await apiGet<any[]>('board-meta');
        if (!error && Array.isArray(data) && data.length > 0 && isMounted) {
          for (const item of data) {
            if (item.key === 'uniforms' && item.value) {
              setUniformData(item.value);
            } else if (item.key === 'fleet_roster' && item.value) {
              setFleetData(item.value);
            } else if (item.key === 'total_strength' && item.value) {
              if (item.value.rows) setStrengthRows(item.value.rows);
              if (item.value.asOf) setStrengthAsOf(item.value.asOf);
            }
          }
        }
      } catch (err) {
        console.warn('Board meta fetch notice:', err);
      }
    };

    const fetchAllData = () => {
      if (!isMounted) return;
      fetchSupabaseMemos();
      fetchSupabaseOfficers();
      fetchSupabaseEvents();
      fetchSupabaseAnnouncements();
      fetchSupabaseDuties();
      fetchSupabaseDailyActivities();
      fetchSupabaseStandingOrders();
      fetchSupabaseBoardMeta();
    };

    fetchAllData();

    // Live sync polling interval (every 3 seconds) for cross-device & cross-account sync
    const intervalId = setInterval(fetchAllData, 3000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  // Permissions helpers: anyone with an account can edit, upload, and manage based on permissions
  const isAdmin = currentUser?.role === 'admin';
  const isFleetOfficer = !!currentUser;

  const canAddCalendarEvents = isAdmin || (currentUser ? currentUser.permissions?.canAddCalendarEvents !== false : false);
  const canUploadMemos = isAdmin || (currentUser ? currentUser.permissions?.canUploadMemos !== false : false);
  const canPostAnnouncements = isAdmin || (currentUser ? currentUser.permissions?.canPostAnnouncements !== false : false);
  const canEditDuties = isAdmin || (currentUser ? currentUser.permissions?.canEditDuties !== false : false);
  const canEditDailyActivities = isAdmin || (currentUser ? currentUser.permissions?.canEditDailyActivities !== false : false);
  const canConductMustering = isAdmin || (currentUser ? currentUser.permissions?.canConductMustering !== false : false);

  const isFleetOfficerOrAdmin = !!currentUser;
  const hasSchedulingPermission = canAddCalendarEvents;

  // Login handler: supports email-only sign in for officers, and username/password for admin
  const login = (
    identifier: string,
    password?: string
  ): { success: boolean; error?: string } => {
    const clean = identifier.trim().toLowerCase();
    if (!clean) {
      return { success: false, error: 'Please enter your email or username.' };
    }

    const found = users.find(
      (u) =>
        (u.email?.trim().toLowerCase() === clean || u.username.trim().toLowerCase() === clean) &&
        u.isActive
    );

    if (!found) {
      return {
        success: false,
        error: `Access Denied: The email "${identifier.trim()}" is not recognized in the system. An Administrator must add your account before you can log in.`,
      };
    }

    // Admin login verification: check password if password provided or required
    if (found.role === 'admin') {
      if (password && password.trim() && found.password && found.password !== password.trim()) {
        return { success: false, error: 'Incorrect administrator password.' };
      }
    } else {
      // Officer login: officers can log in with just their recognized email!
      // If a password was explicitly entered and the account has a password, verify it
      if (password && password.trim() && found.password && found.password !== password.trim()) {
        return { success: false, error: 'Incorrect password.' };
      }
    }

    setCurrentUser(found);
    return { success: true };
  };

  const logout = () => {
    setCurrentUser(null);
    if (activePage === 'accounts') {
      setActivePage('dashboard');
    }
  };

  // User management (Admin only) - allows adding with Title and Email and saves to Supabase
  const createUserAccount = async (
    user: Omit<UserAccount, 'id' | 'createdAt'>
  ): Promise<{ success: boolean; error?: string; supabaseSaved?: boolean }> => {
    if (!isAdmin) {
      return { success: false, error: 'Only Administrators can add new users.' };
    }

    const cleanEmail = user.email?.trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, error: 'Email address is required.' };
    }

    const emailExists = users.some(
      (u) => u.email?.trim().toLowerCase() === cleanEmail
    );
    if (emailExists) {
      return { success: false, error: `Email "${user.email}" is already registered in the system.` };
    }

    const rawUsername = user.username?.trim() || cleanEmail.split('@')[0] || `officer_${Date.now()}`;
    const cleanUsername = rawUsername.toLowerCase().replace(/[^a-z0-9_-]/g, '_');

    const usernameExists = users.some(
      (u) => u.username.toLowerCase() === cleanUsername
    );
    if (usernameExists) {
      return { success: false, error: `Username "${cleanUsername}" is already taken.` };
    }

    const title = user.title?.trim() || user.rank?.trim() || 'Officer On Watch';
    const fullName = user.fullName?.trim() || title;
    const nowIso = new Date().toISOString();

    const newUser: UserAccount = {
      ...user,
      id: `usr-${Date.now()}`,
      username: cleanUsername,
      email: user.email?.trim(),
      title: title,
      rank: user.rank?.trim() || title,
      fullName: fullName,
      role: user.role || 'fleet_officer',
      createdAt: toISODateString(new Date()),
      isActive: true,
    };

    setUsers((prev) => [...prev, newUser]);

    let supabaseSaved = false;
    let supabaseError: string | undefined;

    try {
      const res = await apiPost('officers', {
        id: newUser.id,
        email: newUser.email,
        title: newUser.title,
        full_name: newUser.fullName,
        username: newUser.username,
        role: newUser.role,
        is_active: true,
        created_at: nowIso,
        permissions: newUser.permissions,
      });

      if (!res.error) {
        supabaseSaved = true;
      } else {
        supabaseError = res.error;
        console.warn('Officers insert notice:', res.error);
      }
    } catch (err: any) {
      supabaseError = err?.message || 'Failed to save officer';
      console.warn('Officers insert exception:', err);
    }

    return { success: true, supabaseSaved, error: supabaseError };
  };

  const updateUserAccount = async (id: string, partial: Partial<UserAccount>) => {
    if (!isAdmin) return;
    const previousUsers = users;
    const previousCurrentUser = currentUser;
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...partial } : u)));
    if (currentUser?.id === id) {
      setCurrentUser((prev) => (prev ? { ...prev, ...partial } : null));
    }

    try {
      const updateData: Record<string, any> = {};
      if (partial.title !== undefined) updateData.title = partial.title;
      if (partial.rank !== undefined) updateData.rank = partial.rank;
      if (partial.email !== undefined) updateData.email = partial.email;
      if (partial.fullName !== undefined) updateData.full_name = partial.fullName;
      if (partial.role !== undefined) updateData.role = partial.role;
      if (partial.permissions !== undefined) updateData.permissions = partial.permissions;
      if (partial.isActive !== undefined) updateData.is_active = partial.isActive;

      if (Object.keys(updateData).length > 0) {
        const res = await apiPut(`officers/${id}`, updateData);
        if (res.error) {
          console.error('Update user account error:', res.error);
          showSyncNotification('✗ Failed to sync user account update');
          setUsers(previousUsers);
          if (previousCurrentUser?.id === id) {
            setCurrentUser(previousCurrentUser);
          }
        } else {
          showSyncNotification('✓ User account updated & synced!');
        }
      }
    } catch (e) {
      console.error('Update user account exception:', e);
      showSyncNotification('✗ Failed to sync user account update');
      setUsers(previousUsers);
      if (previousCurrentUser?.id === id) {
        setCurrentUser(previousCurrentUser);
      }
    }
  };

  const deleteUserAccount = async (id: string) => {
    if (!isAdmin) return;
    const previousUsers = users;
    const previousCurrentUser = currentUser;
    setUsers((prev) => prev.filter((u) => u.id !== id));
    if (currentUser?.id === id) {
      logout();
    }

    try {
      const res = await apiDelete(`officers/${id}`);
      if (res.error) {
        console.error('Delete user account error:', res.error);
        showSyncNotification('✗ Failed to delete user account from database');
        setUsers(previousUsers);
        if (previousCurrentUser?.id === id) {
          setCurrentUser(previousCurrentUser);
        }
      } else {
        showSyncNotification('✓ User account removed from database!');
      }
    } catch (err) {
      console.error('Delete user account exception:', err);
      showSyncNotification('✗ Failed to delete user account from database');
      setUsers(previousUsers);
      if (previousCurrentUser?.id === id) {
        setCurrentUser(previousCurrentUser);
      }
    }
  };

  // Conflict checking helper
  const checkConflicts = (target: {
    id?: string;
    date: string;
    startTime: string;
    endTime: string;
  }): ConflictDetectionResult => {
    return evaluateEventConflicts(target, events, dailyActivities);
  };

  // Add fleet event with conflict evaluation
  const addFleetEvent = (
    event: Omit<FleetEvent, 'id' | 'createdAt' | 'createdBy' | 'createdByName'>
  ) => {
    if (!hasSchedulingPermission) {
      return {
        success: false,
        conflictResult: {
          hasCalendarConflict: false,
          calendarConflicts: [],
          hasDailyConflict: false,
          dailyConflicts: [],
          message: 'Permission denied. Only authorized Fleet Officers and Admin may schedule events.',
        },
      };
    }

    const conflictResult = checkConflicts(event);

    const newId = `evt-${Date.now()}`;
    const newEvent: FleetEvent = {
      ...event,
      id: newId,
      createdBy: currentUser?.id || 'usr-anon',
      createdByName: currentUser?.fullName || 'Authorized Fleet Officer',
      createdAt: toISODateString(new Date()),
      hasCalendarConflict: conflictResult.hasCalendarConflict,
      conflictingEventNames: conflictResult.calendarConflicts.map((c) => `${c.name} (${c.startTime}–${c.endTime})`),
      hasDailyActivityOverlap: conflictResult.hasDailyConflict,
      overlappingActivityNames: conflictResult.dailyConflicts.map((d) => `${d.name} (${d.startTime}–${d.endTime})`),
    };

    setEvents((prev) => [...prev, newEvent]);

    try {
      const res = await apiPost('events', {
        id: newEvent.id,
        name: newEvent.name,
        date: newEvent.date,
        start_time: newEvent.startTime,
        end_time: newEvent.endTime,
        location: newEvent.location,
        details: newEvent.details || '',
        created_by: newEvent.createdBy,
        created_by_name: newEvent.createdByName,
        created_at: newEvent.createdAt,
      });
      if (res.error) {
        console.error('Events insert error:', res.error);
        showSyncNotification('✗ Failed to sync event to database');
        setEvents((prev) => prev.filter((e) => e.id !== newEvent.id));
      } else {
        showSyncNotification('✓ Fleet Calendar Event saved & synced live!');
      }
    } catch (e) {
      console.error('Events insert exception:', e);
      showSyncNotification('✗ Failed to sync event to database');
      setEvents((prev) => prev.filter((e) => e.id !== newEvent.id));
    }

    return {
      success: true,
      conflictResult,
      createdId: newId,
    };
  };

  const updateFleetEvent = async (id: string, partial: Partial<FleetEvent>) => {
    if (!hasSchedulingPermission) return;
    const previousEvents = events;
    setEvents((prev) =>
      prev.map((e) => {
        if (e.id === id) {
          const updated = { ...e, ...partial };
          const conflictResult = evaluateEventConflicts(updated, prev, dailyActivities);
          return {
            ...updated,
            hasCalendarConflict: conflictResult.hasCalendarConflict,
            conflictingEventNames: conflictResult.calendarConflicts.map((c) => `${c.name} (${c.startTime}–${c.endTime})`),
            hasDailyActivityOverlap: conflictResult.hasDailyConflict,
            overlappingActivityNames: conflictResult.dailyConflicts.map((d) => `${d.name} (${d.startTime}–${d.endTime})`),
          };
        }
        return e;
      })
    );

    try {
      const updateObj: Record<string, any> = {};
      if (partial.name !== undefined) updateObj.name = partial.name;
      if (partial.date !== undefined) updateObj.date = partial.date;
      if (partial.startTime !== undefined) updateObj.start_time = partial.startTime;
      if (partial.endTime !== undefined) updateObj.end_time = partial.endTime;
      if (partial.location !== undefined) updateObj.location = partial.location;
      if (partial.details !== undefined) updateObj.details = partial.details;

      if (Object.keys(updateObj).length > 0) {
        const res = await apiPut(`events/${id}`, updateObj);
        if (res.error) {
          console.error('Events update error:', res.error);
          showSyncNotification('✗ Failed to sync event update');
          setEvents(previousEvents);
        } else {
          showSyncNotification('✓ Fleet Event updated & synced to Database!');
        }
      }
    } catch (e) {
      console.error('Events update exception:', e);
      showSyncNotification('✗ Failed to sync event update');
      setEvents(previousEvents);
    }
  };

  const deleteFleetEvent = async (id: string) => {
    if (!hasSchedulingPermission) return;
    const previousEvents = events;
    setEvents((prev) => prev.filter((e) => e.id !== id));

    try {
      const res = await apiDelete(`events/${id}`);
      if (res.error) {
        console.error('Events delete error:', res.error);
        showSyncNotification('✗ Failed to delete event from database');
        setEvents(previousEvents);
      } else {
        showSyncNotification('✓ Fleet Event removed from Database!');
      }
    } catch (e) {
      console.error('Events delete exception:', e);
      showSyncNotification('✗ Failed to delete event from database');
      setEvents(previousEvents);
    }
  };

  const addDailyActivity = async (activity: Omit<DailyActivity, 'id'>) => {
    if (!isFleetOfficerOrAdmin) return;
    const newAct: DailyActivity = {
      ...activity,
      id: `act-${Date.now()}`,
    };
    setDailyActivities((prev) =>
      [...prev, newAct].sort(
        (a, b) => militaryTimeToMinutes(a.startTime) - militaryTimeToMinutes(b.startTime)
      )
    );

    try {
      const res = await apiPost('daily-activities', {
        id: newAct.id,
        code: newAct.code,
        name: newAct.name,
        start_time: newAct.startTime,
        end_time: newAct.endTime,
        location: newAct.location,
        description: newAct.description,
        is_mandatory: newAct.isMandatory,
        category: newAct.category,
      });
      if (res.error) {
        console.error('Daily activity insert error:', res.error);
        showSyncNotification('✗ Failed to sync daily activity');
        setDailyActivities((prev) => prev.filter((a) => a.id !== newAct.id));
      } else {
        showSyncNotification('✓ Daily Activity added & published to QD Schedule!');
      }
    } catch (e) {
      console.error('Daily activity insert exception:', e);
      showSyncNotification('✗ Failed to sync daily activity');
      setDailyActivities((prev) => prev.filter((a) => a.id !== newAct.id));
    }
  };

  const updateDailyActivity = async (id: string, partial: Partial<DailyActivity>) => {
    if (!isFleetOfficerOrAdmin) return;
    const previousActivities = dailyActivities;
    setDailyActivities((prev) =>
      prev
        .map((a) => (a.id === id ? { ...a, ...partial } : a))
        .sort((a, b) => militaryTimeToMinutes(a.startTime) - militaryTimeToMinutes(b.startTime))
    );

    try {
      const updateObj: Record<string, any> = {};
      if (partial.name !== undefined) updateObj.name = partial.name;
      if (partial.startTime !== undefined) updateObj.start_time = partial.startTime;
      if (partial.endTime !== undefined) updateObj.end_time = partial.endTime;
      if (partial.location !== undefined) updateObj.location = partial.location;
      if (partial.description !== undefined) updateObj.description = partial.description;
      if (partial.category !== undefined) updateObj.category = partial.category;
      if (partial.isMandatory !== undefined) updateObj.is_mandatory = partial.isMandatory;
      if (Object.keys(updateObj).length > 0) {
        const res = await apiPut(`daily-activities/${id}`, updateObj);
        if (res.error) {
          console.error('Daily activity update error:', res.error);
          showSyncNotification('✗ Failed to sync daily activity update');
          setDailyActivities(previousActivities);
        } else {
          showSyncNotification('✓ Daily Activity updated & synced live!');
        }
      }
    } catch (e) {
      console.error('Daily activity update exception:', e);
      showSyncNotification('✗ Failed to sync daily activity update');
      setDailyActivities(previousActivities);
    }
  };

  const deleteDailyActivity = async (id: string) => {
    if (!isFleetOfficerOrAdmin) return;
    const previousActivities = dailyActivities;
    setDailyActivities((prev) => prev.filter((a) => a.id !== id));

    try {
      const res = await apiDelete(`daily-activities/${id}`);
      if (res.error) {
        console.error('Daily activity delete error:', res.error);
        showSyncNotification('✗ Failed to delete daily activity from database');
        setDailyActivities(previousActivities);
      } else {
        showSyncNotification('✓ Daily Activity deleted from QD Schedule!');
      }
    } catch (e) {
      console.error('Daily activity delete exception:', e);
      showSyncNotification('✗ Failed to delete daily activity from database');
      setDailyActivities(previousActivities);
    }
  };

  // Memo Groups (Admin Only)
  const createMemoGroup = (name: string, description?: string): boolean => {
    if (!isAdmin) return false;
    const cleanName = name.trim();
    if (!cleanName) return false;
    if (memoGroups.some((g) => g.name.toLowerCase() === cleanName.toLowerCase())) {
      return false;
    }

    const newGroup: MemoGroup = {
      id: `grp-${Date.now()}`,
      name: cleanName,
      description: description?.trim() || '',
      createdAt: toISODateString(new Date()),
    };
    setMemoGroups((prev) => [...prev, newGroup]);
    showSyncNotification('✓ Memo Group created!');
    return true;
  };

  const updateMemoGroup = (id: string, name: string, description?: string) => {
    if (!isAdmin) return;
    setMemoGroups((prev) =>
      prev.map((g) => (g.id === id ? { ...g, name: name.trim(), description: description?.trim() } : g))
    );
    showSyncNotification('✓ Memo Group updated!');
  };

  const deleteMemoGroup = (id: string) => {
    if (!isAdmin) return;
    setMemoGroups((prev) => prev.filter((g) => g.id !== id));
    showSyncNotification('✓ Memo Group removed!');
  };

  // Memorandum upload (Fleet Officer or Admin) - synced with Supabase
  const uploadMemorandum = async (
    memo: Omit<Memorandum, 'id' | 'uploadDate' | 'uploadedBy' | 'uploadedByName'>,
    fileBlob?: File | Blob
  ): Promise<{
    success: boolean;
    dbSaved: boolean;
    storageSaved: boolean;
    storageError?: string;
    dbError?: string;
  }> => {
    if (!isFleetOfficerOrAdmin) {
      return { success: false, dbSaved: false, storageSaved: false, dbError: 'Unauthorized' };
    }

    let fileUrl = memo.fileUrl || '';
    let storageSaved = false;
    let storageError: string | undefined;

    // 1. Upload file to Storage via backend server proxy if provided
    if (fileBlob) {
      try {
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const resStr = reader.result as string;
            const b64 = resStr.includes(',') ? resStr.split(',')[1] : resStr;
            resolve(b64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(fileBlob);
        });

        const uploadRes = await apiPost<{ fileUrl: string }>('memos/upload-file', {
          fileName: memo.fileName,
          fileData: base64Data,
          memoNumber: memo.memoNumber,
          fileFormat: memo.fileFormat,
        });

        if (uploadRes.data?.fileUrl) {
          fileUrl = uploadRes.data.fileUrl;
          storageSaved = true;
        } else if (uploadRes.error) {
          storageError = uploadRes.error;
          console.warn('Storage upload notice:', uploadRes.error);
        }
      } catch (err: any) {
        storageError = err?.message || 'Storage upload exception';
        console.warn('Storage upload exception:', err);
      }
    }

    const newId = `memo-${Date.now()}`;
    const newMemo: Memorandum = {
      ...memo,
      id: newId,
      fileUrl,
      uploadDate: toISODateString(new Date()),
      uploadedBy: currentUser?.id || 'usr-anon',
      uploadedByName: currentUser?.fullName || 'Fleet Officer',
    };

    let dbSaved = false;
    let dbError: string | undefined;

    // 2. Insert record into database table 'memos' via API
    try {
      const row = {
        title: newMemo.title,
        memo_number: newMemo.memoNumber,
        group_id: newMemo.groupId,
        file_format: newMemo.fileFormat,
        file_name: newMemo.fileName,
        file_size: newMemo.fileSize,
        file_url: fileUrl,
        uploaded_by: newMemo.uploadedBy,
        uploaded_by_name: newMemo.uploadedByName,
        upload_date: newMemo.uploadDate,
        effective_date: newMemo.effectiveDate,
        summary: newMemo.summary,
        signatory: newMemo.signatory,
        is_public_to_cadets: newMemo.isPublicToCadets,
      };

      const res = await apiPost<any>('memos', row);

      if (!res.error && res.data?.id) {
        newMemo.id = res.data.id;
        dbSaved = true;
      } else if (res.error) {
        dbError = res.error;
        console.warn('Database insert notice:', res.error);
      }
    } catch (err: any) {
      dbError = err?.message || 'Database insert exception';
      console.warn('Database insert exception:', err);
    }

    setMemos((prev) => [newMemo, ...prev]);
    showSyncNotification('✓ Memorandum uploaded & saved to Database repository!');
    return {
      success: true,
      dbSaved,
      storageSaved,
      storageError,
      dbError,
    };
  };

  const updateMemorandum = async (
    id: string,
    partial: Partial<Memorandum>
  ): Promise<boolean> => {
    if (!canUploadMemos) return false;
    const previousMemos = memos;
    setMemos((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...partial } : m))
    );

    try {
      const updateData: Record<string, any> = {};
      if (partial.title !== undefined) updateData.title = partial.title;
      if (partial.memoNumber !== undefined) updateData.memo_number = partial.memoNumber;
      if (partial.groupId !== undefined) updateData.group_id = partial.groupId;
      if (partial.summary !== undefined) updateData.summary = partial.summary;
      if (partial.signatory !== undefined) updateData.signatory = partial.signatory;
      if (partial.effectiveDate !== undefined) updateData.effective_date = partial.effectiveDate;
      if (partial.isPublicToCadets !== undefined) updateData.is_public_to_cadets = partial.isPublicToCadets;

      if (Object.keys(updateData).length > 0) {
        const res = await apiPut(`memos/${id}`, updateData);
        if (res.error) {
          console.error('Update memorandum error:', res.error);
          showSyncNotification('✗ Failed to sync memorandum update');
          setMemos(previousMemos);
          return false;
        }
      }
      showSyncNotification('✓ Memorandum updated in Database!');
      return true;
    } catch (err) {
      console.error('Update memorandum exception:', err);
      showSyncNotification('✗ Failed to sync memorandum update');
      setMemos(previousMemos);
      return false;
    }
  };

  const deleteMemorandum = async (id: string) => {
    if (!canUploadMemos) return;
    const previousMemos = memos;
    setMemos((prev) => prev.filter((m) => m.id !== id));

    try {
      const res = await apiDelete(`memos/${id}`);
      if (res.error) {
        console.error('Delete memorandum error:', res.error);
        showSyncNotification('✗ Failed to delete memorandum from database');
        setMemos(previousMemos);
      } else {
        showSyncNotification('✓ Memorandum removed from Database!');
      }
    } catch (err) {
      console.error('Delete memorandum exception:', err);
      showSyncNotification('✗ Failed to delete memorandum from database');
      setMemos(previousMemos);
    }
  };

  // Announcements
  const addAnnouncement = async (
    item: Omit<Announcement, 'id' | 'postedAt' | 'date' | 'postedBy' | 'postedByName'>
  ) => {
    if (!canPostAnnouncements) return;
    const today = toISODateString(new Date());
    const newAnnouncement: Announcement = {
      ...item,
      id: `ann-${Date.now()}`,
      postedAt: getCurrentMilitaryTime(),
      date: today,
      postedBy: currentUser?.id || 'usr-anon',
      postedByName: currentUser?.fullName || 'Fleet Duty Officer',
      targetAudience: item.targetAudience || 'Fleet',
    };
    setAnnouncements((prev) => [newAnnouncement, ...prev]);

    try {
      const res = await apiPost('announcements', {
        id: newAnnouncement.id,
        title: newAnnouncement.title,
        content: newAnnouncement.content,
        category: newAnnouncement.category,
        target_audience: newAnnouncement.targetAudience || 'Fleet',
        date: newAnnouncement.date,
        posted_at: newAnnouncement.postedAt,
        posted_by: newAnnouncement.postedBy,
        posted_by_name: newAnnouncement.postedByName,
        priority: newAnnouncement.priority || 'ROUTINE',
      });
      if (res.error) {
        console.error('Announcements insert error:', res.error);
        showSyncNotification('✗ Failed to sync announcement');
        setAnnouncements((prev) => prev.filter((a) => a.id !== newAnnouncement.id));
      } else {
        showSyncNotification(`✓ Announcement posted & broadcast live to ${newAnnouncement.targetAudience || 'Fleet'}!`);
      }
    } catch (e) {
      console.error('Announcements insert exception:', e);
      showSyncNotification('✗ Failed to sync announcement');
      setAnnouncements((prev) => prev.filter((a) => a.id !== newAnnouncement.id));
    }
  };

  const updateAnnouncement = async (id: string, partial: Partial<Announcement>) => {
    if (!canPostAnnouncements) return;
    const previousAnnouncements = announcements;
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...partial } : a))
    );

    try {
      const updateData: Record<string, any> = {};
      if (partial.title !== undefined) updateData.title = partial.title;
      if (partial.content !== undefined) updateData.content = partial.content;
      if (partial.category !== undefined) updateData.category = partial.category;
      if (partial.priority !== undefined) updateData.priority = partial.priority;
      if (partial.targetAudience !== undefined) {
        updateData.target_audience = partial.targetAudience;
      }
      if (Object.keys(updateData).length > 0) {
        const res = await apiPut(`announcements/${id}`, updateData);
        if (res.error) {
          console.error('Announcements update error:', res.error);
          showSyncNotification('✗ Failed to sync announcement update');
          setAnnouncements(previousAnnouncements);
        } else {
          showSyncNotification('✓ Announcement updated & broadcast live across all devices!');
        }
      }
    } catch (e) {
      console.error('Announcements update exception:', e);
      showSyncNotification('✗ Failed to sync announcement update');
      setAnnouncements(previousAnnouncements);
    }
  };

  const deleteAnnouncement = async (id: string) => {
    if (!canPostAnnouncements) return;
    const previousAnnouncements = announcements;
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));

    try {
      const res = await apiDelete(`announcements/${id}`);
      if (res.error) {
        console.error('Announcements delete error:', res.error);
        showSyncNotification('✗ Failed to delete announcement from database');
        setAnnouncements(previousAnnouncements);
      } else {
        showSyncNotification('✓ Announcement deleted from Database!');
      }
    } catch (e) {
      console.error('Announcements delete exception:', e);
      showSyncNotification('✗ Failed to delete announcement from database');
      setAnnouncements(previousAnnouncements);
    }
  };

  // Mustering
  const updateMusterEntry = (
    id: string,
    status: MusterEntry['status'],
    remarks?: string
  ) => {
    if (!canConductMustering) return;
    setMusterList((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              status,
              remarks: remarks !== undefined ? remarks : m.remarks,
              updatedAt: getCurrentMilitaryTime(),
            }
          : m
      )
    );
    showSyncNotification('✓ Mustering status updated!');
  };

  const resetMusterRoll = () => {
    const now = getCurrentMilitaryTime();
    setMusterList((prev) =>
      prev.map((m) => ({
        ...m,
        status: 'PRESENT',
        remarks: undefined,
        updatedAt: now,
      }))
    );
  };

  // Duties
  const updateDutyItem = async (id: string, partial: Partial<DutyRosterItem>) => {
    if (!canEditDuties) return;

    const todayStr = toISODateString(new Date());
    const currentItem = dutyRoster.find((d) => d.id === id || d.date === todayStr) || dutyRoster[0] || {
      id: id || `dty-${todayStr}`,
      date: todayStr,
      fod: '',
      coow: '',
      acoow1: '',
      acoow2: '',
      moow: '',
      amoow1: '',
      amoow2: '',
      station: 'Quarterdeck Main Desk',
      status: 'ON_WATCH',
    };

    const targetObj: DutyRosterItem = {
      ...currentItem,
      ...partial,
      id: currentItem.id || id || `dty-${todayStr}`,
      date: todayStr,
    };

    setDutyRoster((prev) => {
      const idx = prev.findIndex((d) => d.id === targetObj.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = targetObj;
        return copy;
      }
      return [targetObj, ...prev];
    });

    try {
      const res = await apiPost('duties', {
        id: targetObj.id,
        date: targetObj.date,
        fod: targetObj.fod || '',
        coow: targetObj.coow || '',
        acoow1: targetObj.acoow1 || targetObj.acwo || '',
        acoow2: targetObj.acoow2 || '',
        moow: targetObj.moow || '',
        amoow1: targetObj.amoow1 || '',
        amoow2: targetObj.amoow2 || '',
        station: targetObj.station || 'Quarterdeck Main Desk',
        status: targetObj.status || 'ON_WATCH',
      });
      if (res.error) {
        console.error('Duties upsert error:', res.error);
        showSyncNotification('✗ Failed to sync watch bill');
      } else {
        showSyncNotification('✓ Watch Bill (FOD / COOW / MOOW) saved & broadcast live across all devices!');
      }
    } catch (e) {
      console.error('Duties upsert exception:', e);
      showSyncNotification('✗ Failed to sync watch bill');
    }
  };

  // Standing Orders & Board Meta Handlers
  const updateStandingOrders = async (orders: string[]) => {
    const previousOrders = standingOrders;
    setStandingOrders(orders);
    saveToStorage('standing_orders', orders);
    try {
      const res = await apiPost('standing-orders', { orders });
      if (res.error) {
        console.error('Standing orders post error:', res.error);
        showSyncNotification('✗ Failed to sync standing orders');
        setStandingOrders(previousOrders);
      } else {
        showSyncNotification('✓ Standing Orders saved & broadcast live to all devices!');
      }
    } catch (e) {
      console.error('Standing orders post exception:', e);
      showSyncNotification('✗ Failed to sync standing orders');
      setStandingOrders(previousOrders);
    }
  };

  const updateUniformData = async (data: {
    primaryLabel: string;
    primaryValue: string;
    secondaryLabel: string;
    secondaryValue: string;
  }) => {
    const previousUniformData = uniformData;
    setUniformData(data);
    saveToStorage('uniform_requirements', data);
    try {
      const res = await apiPost('board-meta', { key: 'uniforms', value: data });
      if (res.error) {
        console.error('Uniform data post error:', res.error);
        showSyncNotification('✗ Failed to sync uniform requirements');
        setUniformData(previousUniformData);
      } else {
        showSyncNotification('✓ Uniform Requirements saved & synced live!');
      }
    } catch (e) {
      console.error('Uniform data post exception:', e);
      showSyncNotification('✗ Failed to sync uniform requirements');
      setUniformData(previousUniformData);
    }
  };

  const updateFleetData = async (data: any) => {
    const previousFleetData = fleetData;
    setFleetData(data);
    saveToStorage('fleet_roster', data);
    try {
      const res = await apiPost('board-meta', { key: 'fleet_roster', value: data });
      if (res.error) {
        console.error('Fleet data post error:', res.error);
        showSyncNotification('✗ Failed to sync fleet roster');
        setFleetData(previousFleetData);
      } else {
        showSyncNotification('✓ Fleet Section Roster saved & updated live!');
      }
    } catch (e) {
      console.error('Fleet data post exception:', e);
      showSyncNotification('✗ Failed to sync fleet roster');
      setFleetData(previousFleetData);
    }
  };

  const updateStrengthRows = async (rows: any[], asOf: string) => {
    const previousStrengthRows = strengthRows;
    const previousStrengthAsOf = strengthAsOf;
    setStrengthRows(rows);
    setStrengthAsOf(asOf);
    saveToStorage('total_strength', rows);
    saveToStorage('strength_as_of', asOf);
    try {
      const res = await apiPost('board-meta', { key: 'total_strength', value: { rows, asOf } });
      if (res.error) {
        console.error('Strength rows post error:', res.error);
        showSyncNotification('✗ Failed to sync personnel strength');
        setStrengthRows(previousStrengthRows);
        setStrengthAsOf(previousStrengthAsOf);
      } else {
        showSyncNotification('✓ Total Personnel Strength saved & synced live across all devices!');
      }
    } catch (e) {
      console.error('Strength rows post exception:', e);
      showSyncNotification('✗ Failed to sync personnel strength');
      setStrengthRows(previousStrengthRows);
      setStrengthAsOf(previousStrengthAsOf);
    }
  };

  // Daily Reset Simulator
  const simulateDailyReset = () => {
    const today = toISODateString(new Date());
    setLastResetDate(today);

    // 1. Reset Mustering to fresh present roster
    resetMusterRoll();

    // 2. Reset Announcements to today's active QD notices
    setAnnouncements(getInitialAnnouncements());

    // 3. Reset Daily Activities to base routine
    setDailyActivities(INITIAL_DAILY_ACTIVITIES);

    // 4. Update today's initial events to match current date
    setEvents(getInitialEvents());

    // Set interactive visual toast
    setResetNotification(
      `Daily Reset Activated for ${today}: QD Daily Schedule, Public Announcements, and Mustering Roll renewed.`
    );
  };

  const clearResetNotification = () => setResetNotification(null);

  return (
    <FleetContext.Provider
      value={{
        activePage,
        setActivePage,
        currentUser,
        users,
        login,
        logout,
        createUserAccount,
        updateUserAccount,
        deleteUserAccount,
        hasSchedulingPermission,
        isFleetOfficerOrAdmin,
        isAdmin,
        canAddCalendarEvents,
        canUploadMemos,
        canPostAnnouncements,
        canEditDuties,
        canEditDailyActivities,
        canConductMustering,
        events,
        addFleetEvent,
        updateFleetEvent,
        deleteFleetEvent,
        checkConflicts,
        dailyActivities,
        addDailyActivity,
        updateDailyActivity,
        deleteDailyActivity,
        memoGroups,
        memos,
        createMemoGroup,
        updateMemoGroup,
        deleteMemoGroup,
        uploadMemorandum,
        updateMemorandum,
        deleteMemorandum,
        announcements,
        addAnnouncement,
        updateAnnouncement,
        deleteAnnouncement,
        musterList,
        updateMusterEntry,
        resetMusterRoll,
        dutyRoster,
        updateDutyItem,
        standingOrders,
        updateStandingOrders,
        uniformData,
        updateUniformData,
        fleetData,
        updateFleetData,
        strengthRows,
        strengthAsOf,
        updateStrengthRows,
        lastResetDate,
        simulateDailyReset,
        resetNotification,
        showSyncNotification,
        clearResetNotification,
      }}
    >
      {children}
    </FleetContext.Provider>
  );
};

export const useFleet = () => {
  const context = useContext(FleetContext);
  if (!context) {
    throw new Error('useFleet must be used within a FleetProvider');
  }
  return context;
};
