import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
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

export type TabUpdateEntry = {
  updatedAt: number;
  updatedBy?: string;
};

export type TabUpdatesMap = Partial<Record<AppPage, TabUpdateEntry>>;

interface FleetContextType {
  // Navigation
  activePage: AppPage;
  setActivePage: (page: AppPage) => void;
  unreadTabs: Partial<Record<AppPage, boolean>>;
  hasAnyUnreadTab: boolean;

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
  createMemoGroup: (name: string, description?: string) => Promise<boolean>;
  updateMemoGroup: (id: string, name: string, description?: string) => Promise<void>;
  deleteMemoGroup: (id: string) => Promise<void>;
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
  deleteMemorandum: (id: string) => Promise<void>;

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

export function selectActiveDuty(dutyRoster: DutyRosterItem[]): DutyRosterItem {
  const todayStr = toISODateString(new Date());
  return (
    dutyRoster.find((d) => d.date === todayStr) ||
    dutyRoster.find((d) => d.status === 'ON_WATCH') ||
    dutyRoster[0] || {
      id: 'dty-01',
      date: todayStr,
      fod: '',
      coow: '',
      acoow1: '',
      acoow2: '',
      acwo: '',
      moow: '',
      amoow1: '',
      amoow2: '',
      station: 'Quarterdeck Main Desk',
      status: 'ON_WATCH',
    }
  );
}

export const FleetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activePage, setActivePageState] = useState<AppPage>('dashboard');
  const mutationEpochRef = useRef(0);
  const notificationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tabUpdates, setTabUpdates] = useState<TabUpdatesMap>(() =>
    loadFromStorage<TabUpdatesMap>('tab_updates', {})
  );
  const tabUpdatesRef = useRef<TabUpdatesMap>(tabUpdates);
  tabUpdatesRef.current = tabUpdates;

  const [seenTabs, setSeenTabs] = useState<Partial<Record<AppPage, number>>>(() =>
    loadFromStorage<Partial<Record<AppPage, number>>>('seen_tabs', {})
  );
  const seenTabsRef = useRef<Partial<Record<AppPage, number>>>(seenTabs);
  seenTabsRef.current = seenTabs;

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
    const cleaned = loaded.filter((u) => u.role === 'admin' || !['usr-2', 'usr-3', 'usr-4'].includes(u.id));
    return cleaned.map((u) => {
      const match = INITIAL_USERS.find(
        (init) => init.id === u.id || init.username.toLowerCase() === u.username.toLowerCase()
      );
      const isNavarro = u.fullName?.toUpperCase().includes('RODOLFO') || u.role === 'admin';
      return {
        ...u,
        fullName: isNavarro ? 'Administrator' : u.fullName,
        rank: isNavarro ? 'Administrator' : u.rank || u.title || 'Officer On Watch',
        email: u.email || match?.email || `${u.username.toLowerCase()}@fleet.ops`,
        title: isNavarro ? 'Administrator' : u.title || match?.title || u.rank || 'Officer On Watch',
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
    if (notificationTimerRef.current) {
      clearTimeout(notificationTimerRef.current);
    }
    notificationTimerRef.current = setTimeout(() => {
      setResetNotification(null);
    }, 6000);
  };

  // Sync state to local storage cache
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

  useEffect(() => {
    saveToStorage('standing_orders', standingOrders);
  }, [standingOrders]);

  useEffect(() => {
    saveToStorage('uniform_requirements', uniformData);
  }, [uniformData]);

  useEffect(() => {
    saveToStorage('fleet_roster', fleetData);
  }, [fleetData]);

  useEffect(() => {
    saveToStorage('total_strength', strengthRows);
  }, [strengthRows]);

  useEffect(() => {
    saveToStorage('strength_as_of', strengthAsOf);
  }, [strengthAsOf]);

  // Automated date rollover marker (do not overwrite Supabase-synced state)
  useEffect(() => {
    const today = toISODateString(new Date());
    if (lastResetDate !== today) {
      setLastResetDate(today);
      resetMusterRoll();
    }
  }, []);

  // Fetch authoritative data from server proxy API & poll every 5 seconds when visible
  useEffect(() => {
    let isMounted = true;

    const setIfChanged = <T,>(
      setter: React.Dispatch<React.SetStateAction<T>>,
      nextValue: T
    ) => {
      const nextSig = JSON.stringify(nextValue);
      setter((prev) => (JSON.stringify(prev) === nextSig ? prev : nextValue));
    };

    const fetchSupabaseMemos = async (startEpoch: number) => {
      try {
        const { data, error } = await apiGet<any[]>('memos');
        if (!error && Array.isArray(data) && isMounted && mutationEpochRef.current === startEpoch) {
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
          setIfChanged(setMemos, loaded);
        }
      } catch (err) {
        console.warn('Memos fetch notice:', err);
      }
    };

    const fetchSupabaseOfficers = async (startEpoch: number) => {
      try {
        const { data, error } = await apiGet<any[]>('officers');
        if (!error && Array.isArray(data) && isMounted && mutationEpochRef.current === startEpoch) {
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

          // Authoritative merge: always preserve built-in Admin fallback unless overridden by DB
          const map = new Map<string, UserAccount>();
          for (const initUser of INITIAL_USERS) {
            const key = (initUser.email || initUser.username).toLowerCase();
            map.set(key, initUser);
          }
          for (const o of loaded) {
            const key = (o.email || o.username).toLowerCase();
            const existing = map.get(key);
            map.set(key, existing?.password ? { ...o, password: existing.password } : o);
          }
          const nextUsers = Array.from(map.values());
          setIfChanged(setUsers, nextUsers);

          // Sync logged-in user if their DB record changed
          setCurrentUser((prevCurrent) => {
            if (!prevCurrent) return null;
            const matched = nextUsers.find(
              (u) =>
                u.id === prevCurrent.id ||
                (u.email && prevCurrent.email && u.email.toLowerCase() === prevCurrent.email.toLowerCase())
            );
            if (!matched || !matched.isActive) {
              return prevCurrent.role === 'admin' ? prevCurrent : null;
            }
            const merged = { ...matched, password: prevCurrent.password || matched.password };
            return JSON.stringify(prevCurrent) === JSON.stringify(merged) ? prevCurrent : merged;
          });
        }
      } catch (err) {
        console.warn('Officers fetch notice:', err);
      }
    };

    const fetchSupabaseEvents = async (startEpoch: number) => {
      try {
        const { data, error } = await apiGet<any[]>('events');
        if (!error && Array.isArray(data) && isMounted && mutationEpochRef.current === startEpoch) {
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
          setIfChanged(setEvents, loaded);
        }
      } catch (err) {
        console.warn('Events fetch notice:', err);
      }
    };

    const fetchSupabaseAnnouncements = async (startEpoch: number) => {
      try {
        const { data, error } = await apiGet<any[]>('announcements');
        if (!error && Array.isArray(data) && isMounted && mutationEpochRef.current === startEpoch) {
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
          setIfChanged(setAnnouncements, loaded);
        }
      } catch (err) {
        console.warn('Announcements fetch notice:', err);
      }
    };

    const fetchSupabaseDuties = async (startEpoch: number) => {
      try {
        const { data, error } = await apiGet<any[]>('duties');
        if (!error && Array.isArray(data) && data.length > 0 && isMounted && mutationEpochRef.current === startEpoch) {
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
          setIfChanged(setDutyRoster, loaded);
        }
      } catch (err) {
        console.warn('Duties fetch notice:', err);
      }
    };

    const fetchSupabaseDailyActivities = async (startEpoch: number) => {
      try {
        const { data, error } = await apiGet<any[]>('daily-activities');
        if (!error && Array.isArray(data) && isMounted && mutationEpochRef.current === startEpoch) {
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
          setIfChanged(setDailyActivities, loaded);
        }
      } catch (err) {
        console.warn('Daily activities fetch notice:', err);
      }
    };

    const fetchSupabaseStandingOrders = async (startEpoch: number) => {
      try {
        const { data, error } = await apiGet<any[]>('standing-orders');
        if (!error && Array.isArray(data) && isMounted && mutationEpochRef.current === startEpoch) {
          setIfChanged(setStandingOrders, data.map((r: any) => r.order_text));
        }
      } catch (err) {
        console.warn('Standing orders fetch notice:', err);
      }
    };

    const fetchSupabaseBoardMeta = async (startEpoch: number) => {
      try {
        const { data, error } = await apiGet<any[]>('board-meta');
        if (!error && Array.isArray(data) && isMounted && mutationEpochRef.current === startEpoch) {
          for (const item of data) {
            if (item.key === 'uniforms' && item.value) {
              setIfChanged(setUniformData, item.value);
            } else if (item.key === 'fleet_roster' && item.value) {
              setIfChanged(setFleetData, item.value);
            } else if (item.key === 'total_strength' && item.value) {
              try {
                const parsed =
                  typeof item.value === 'string' ? JSON.parse(item.value) : item.value;
                if (Array.isArray(parsed?.rows)) setIfChanged(setStrengthRows, parsed.rows);
                if (parsed?.asOf !== undefined) setIfChanged(setStrengthAsOf, parsed.asOf);
              } catch {
                // ignore malformed JSON
              }
            } else if (item.key === 'memo_groups' && Array.isArray(item.value)) {
              setIfChanged(setMemoGroups, item.value);
            } else if (item.key === 'tab_updates' && item.value && typeof item.value === 'object') {
              const incoming = item.value as TabUpdatesMap;
              const merged: TabUpdatesMap = { ...tabUpdatesRef.current };
              (Object.keys(incoming) as AppPage[]).forEach((tab) => {
                const incEntry = incoming[tab];
                const curEntry = merged[tab];
                if (incEntry && (!curEntry || incEntry.updatedAt > curEntry.updatedAt)) {
                  merged[tab] = incEntry;
                }
              });
              tabUpdatesRef.current = merged;
              setIfChanged(setTabUpdates, merged);
            }
          }
        }
      } catch (err) {
        console.warn('Board meta fetch notice:', err);
      }
    };

    const fetchAllData = () => {
      if (!isMounted) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      const startEpoch = mutationEpochRef.current;
      fetchSupabaseMemos(startEpoch);
      fetchSupabaseOfficers(startEpoch);
      fetchSupabaseEvents(startEpoch);
      fetchSupabaseAnnouncements(startEpoch);
      fetchSupabaseDuties(startEpoch);
      fetchSupabaseDailyActivities(startEpoch);
      fetchSupabaseStandingOrders(startEpoch);
      fetchSupabaseBoardMeta(startEpoch);
    };

    fetchAllData();

    // Live sync polling interval (every 5 seconds when visible) for cross-device & cross-account sync
    const intervalId = setInterval(fetchAllData, 5000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchAllData();
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, []);

  // Permissions helpers
  const isAdmin = currentUser?.role === 'admin';
  const canAddCalendarEvents = isAdmin || (currentUser ? currentUser.permissions?.canAddCalendarEvents !== false : false);
  const canUploadMemos = isAdmin || (currentUser ? currentUser.permissions?.canUploadMemos !== false : false);
  const canPostAnnouncements = isAdmin || (currentUser ? currentUser.permissions?.canPostAnnouncements !== false : false);
  const canEditDuties = isAdmin || (currentUser ? currentUser.permissions?.canEditDuties !== false : false);
  const canEditDailyActivities = isAdmin || (currentUser ? currentUser.permissions?.canEditDailyActivities !== false : false);
  const canConductMustering = isAdmin || (currentUser ? currentUser.permissions?.canConductMustering !== false : false);

  const isFleetOfficerOrAdmin = !!currentUser;
  const hasSchedulingPermission = canAddCalendarEvents;

  // Cross-user unread notification helpers
  const markTabSeen = useCallback((page: AppPage, minTimestamp?: number) => {
    const remoteTs = tabUpdatesRef.current[page]?.updatedAt || 0;
    const nextTs = Math.max(Date.now(), remoteTs, minTimestamp || 0);
    setSeenTabs((prev) => {
      if ((prev[page] || 0) >= nextTs) return prev;
      const next = { ...prev, [page]: nextTs };
      seenTabsRef.current = next;
      saveToStorage('seen_tabs', next);
      return next;
    });
  }, []);

  const setActivePage = useCallback(
    (page: AppPage) => {
      setActivePageState(page);
      markTabSeen(page);
    },
    [markTabSeen]
  );

  // Keep seen timestamp advancing while user is actively viewing a tab that updates live
  useEffect(() => {
    const activeUpdatedAt = tabUpdates[activePage]?.updatedAt || 0;
    if (activeUpdatedAt > (seenTabsRef.current[activePage] || 0)) {
      markTabSeen(activePage, activeUpdatedAt);
    }
  }, [activePage, tabUpdates, markTabSeen]);

  useEffect(() => {
    saveToStorage('tab_updates', tabUpdates);
  }, [tabUpdates]);

  const recordTabUpdate = useCallback(
    (tabs: AppPage[]) => {
      if (!currentUser || tabs.length === 0) return;
      const now = Date.now();
      const nextUpdates: TabUpdatesMap = { ...tabUpdatesRef.current };
      tabs.forEach((tab) => {
        nextUpdates[tab] = {
          updatedAt: Math.max(now, (nextUpdates[tab]?.updatedAt || 0) + 1),
          updatedBy: currentUser.fullName || 'Fleet Officer',
        };
      });
      tabUpdatesRef.current = nextUpdates;
      setTabUpdates(nextUpdates);
      if (tabs.includes(activePage)) {
        markTabSeen(activePage, nextUpdates[activePage]?.updatedAt);
      }
      apiPost('board-meta', { key: 'tab_updates', value: nextUpdates }).catch((err) => {
        console.warn('Failed to persist tab_updates notification marker:', err);
      });
    },
    [currentUser, activePage, markTabSeen]
  );

  const unreadTabs = useMemo<Partial<Record<AppPage, boolean>>>(() => {
    const result: Partial<Record<AppPage, boolean>> = {};
    (Object.keys(tabUpdates) as AppPage[]).forEach((tab) => {
      if (tab === activePage) return;
      if (tab === 'accounts' && !isAdmin) return;
      if (tab === 'mustering' && (!currentUser || !canConductMustering)) return;
      const updatedAt = tabUpdates[tab]?.updatedAt || 0;
      const seenAt = seenTabs[tab] || 0;
      if (updatedAt > seenAt) {
        result[tab] = true;
      }
    });
    return result;
  }, [tabUpdates, seenTabs, activePage, isAdmin, currentUser, canConductMustering]);

  const hasAnyUnreadTab = useMemo(
    () => Object.values(unreadTabs).some(Boolean),
    [unreadTabs]
  );

  // Login handler
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

    if (found.role === 'admin') {
      if (password && password.trim() && found.password && found.password !== password.trim()) {
        return { success: false, error: 'Incorrect administrator password.' };
      }
    } else {
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

  // User management (Admin only)
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

    const emailExists = users.some((u) => u.email?.trim().toLowerCase() === cleanEmail);
    if (emailExists) {
      return { success: false, error: `Email "${user.email}" is already registered in the system.` };
    }

    const rawUsername = user.username?.trim() || cleanEmail.split('@')[0] || `officer_${Date.now()}`;
    const cleanUsername = rawUsername.toLowerCase().replace(/[^a-z0-9_-]/g, '_');

    const usernameExists = users.some((u) => u.username.toLowerCase() === cleanUsername);
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
      email: cleanEmail,
      title,
      rank: user.rank?.trim() || title,
      fullName,
      role: user.role || 'fleet_officer',
      createdAt: toISODateString(new Date()),
      isActive: true,
    };

    mutationEpochRef.current += 1;
    const previousUsers = users;
    setUsers((prev) => [...prev, newUser]);

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

      if (res.error) {
        setUsers(previousUsers);
        showSyncNotification(`✗ Failed to save officer account: ${res.error}`);
        return { success: false, supabaseSaved: false, error: res.error };
      }

      recordTabUpdate(['accounts']);
      showSyncNotification('✓ Officer account saved & synced to Database!');
      return { success: true, supabaseSaved: true };
    } catch (err: any) {
      const msg = err?.message || 'Failed to save officer';
      setUsers(previousUsers);
      showSyncNotification(`✗ Failed to save officer account: ${msg}`);
      return { success: false, supabaseSaved: false, error: msg };
    }
  };

  const updateUserAccount = async (id: string, partial: Partial<UserAccount>) => {
    if (!isAdmin) return;
    mutationEpochRef.current += 1;
    const previousUsers = users;
    const previousCurrentUser = currentUser;
    const mergedUser = users.find((u) => u.id === id);

    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...partial } : u)));
    if (currentUser?.id === id) {
      setCurrentUser((prev) => (prev ? { ...prev, ...partial } : null));
    }

    try {
      const updateData: Record<string, any> = {};
      if (partial.title !== undefined) updateData.title = partial.title;
      if (partial.email !== undefined) updateData.email = partial.email;
      if (partial.fullName !== undefined) updateData.full_name = partial.fullName;
      if (partial.role !== undefined) updateData.role = partial.role;
      if (partial.permissions !== undefined) updateData.permissions = partial.permissions;
      if (partial.isActive !== undefined) updateData.is_active = partial.isActive;

      if (Object.keys(updateData).length > 0) {
        const res = await apiPut(`officers/${id}`, updateData);
        if (res.error) {
          // If built-in admin row isn't in DB yet, create it cleanly
          if (mergedUser && /not found/i.test(res.error)) {
            const createRes = await apiPost('officers', {
              id: mergedUser.id,
              email: partial.email ?? mergedUser.email,
              title: partial.title ?? mergedUser.title,
              full_name: partial.fullName ?? mergedUser.fullName,
              username: mergedUser.username,
              role: partial.role ?? mergedUser.role,
              is_active: partial.isActive ?? mergedUser.isActive,
              permissions: partial.permissions ?? mergedUser.permissions,
              created_at: new Date().toISOString(),
            });
            if (!createRes.error) {
              recordTabUpdate(['accounts']);
              showSyncNotification('✓ User account updated & synced!');
              return;
            }
          }
          console.error('Update user account error:', res.error);
          showSyncNotification(`✗ Failed to sync user account update: ${res.error}`);
          setUsers(previousUsers);
          if (previousCurrentUser?.id === id) {
            setCurrentUser(previousCurrentUser);
          }
        } else {
          recordTabUpdate(['accounts']);
          showSyncNotification('✓ User account updated & synced!');
        }
      }
    } catch (e: any) {
      console.error('Update user account exception:', e);
      showSyncNotification(`✗ Failed to sync user account update: ${e?.message || e}`);
      setUsers(previousUsers);
      if (previousCurrentUser?.id === id) {
        setCurrentUser(previousCurrentUser);
      }
    }
  };

  const deleteUserAccount = async (id: string) => {
    if (!isAdmin) return;
    mutationEpochRef.current += 1;
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
        showSyncNotification(`✗ Failed to delete user account: ${res.error}`);
        setUsers(previousUsers);
        if (previousCurrentUser?.id === id) {
          setCurrentUser(previousCurrentUser);
        }
      } else {
        recordTabUpdate(['accounts']);
        showSyncNotification('✓ User account removed from database!');
      }
    } catch (err: any) {
      console.error('Delete user account exception:', err);
      showSyncNotification(`✗ Failed to delete user account: ${err?.message || err}`);
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

  // Add fleet event
  const addFleetEvent = async (
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

    mutationEpochRef.current += 1;
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
        showSyncNotification(`✗ Failed to sync event to database: ${res.error}`);
        setEvents((prev) => prev.filter((e) => e.id !== newEvent.id));
        return { success: false, conflictResult };
      }
      recordTabUpdate(['calendar']);
      showSyncNotification('✓ Fleet Calendar Event saved & synced live!');
      return { success: true, conflictResult, createdId: newId };
    } catch (e: any) {
      console.error('Events insert exception:', e);
      showSyncNotification(`✗ Failed to sync event to database: ${e?.message || e}`);
      setEvents((prev) => prev.filter((e) => e.id !== newEvent.id));
      return { success: false, conflictResult };
    }
  };

  const updateFleetEvent = async (id: string, partial: Partial<FleetEvent>) => {
    if (!hasSchedulingPermission) return;
    mutationEpochRef.current += 1;
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
          showSyncNotification(`✗ Failed to sync event update: ${res.error}`);
          setEvents(previousEvents);
        } else {
          recordTabUpdate(['calendar']);
          showSyncNotification('✓ Fleet Event updated & synced to Database!');
        }
      }
    } catch (e: any) {
      console.error('Events update exception:', e);
      showSyncNotification(`✗ Failed to sync event update: ${e?.message || e}`);
      setEvents(previousEvents);
    }
  };

  const deleteFleetEvent = async (id: string) => {
    if (!hasSchedulingPermission) return;
    mutationEpochRef.current += 1;
    const previousEvents = events;
    setEvents((prev) => prev.filter((e) => e.id !== id));

    try {
      const res = await apiDelete(`events/${id}`);
      if (res.error) {
        console.error('Events delete error:', res.error);
        showSyncNotification(`✗ Failed to delete event from database: ${res.error}`);
        setEvents(previousEvents);
      } else {
        recordTabUpdate(['calendar']);
        showSyncNotification('✓ Fleet Event removed from Database!');
      }
    } catch (e: any) {
      console.error('Events delete exception:', e);
      showSyncNotification(`✗ Failed to delete event from database: ${e?.message || e}`);
      setEvents(previousEvents);
    }
  };

  const addDailyActivity = async (activity: Omit<DailyActivity, 'id'>) => {
    if (!canEditDailyActivities) return;
    mutationEpochRef.current += 1;
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
        showSyncNotification(`✗ Failed to sync daily activity: ${res.error}`);
        setDailyActivities((prev) => prev.filter((a) => a.id !== newAct.id));
      } else {
        recordTabUpdate(['daily']);
        showSyncNotification('✓ Daily Activity added & published to QD Schedule!');
      }
    } catch (e: any) {
      console.error('Daily activity insert exception:', e);
      showSyncNotification(`✗ Failed to sync daily activity: ${e?.message || e}`);
      setDailyActivities((prev) => prev.filter((a) => a.id !== newAct.id));
    }
  };

  const updateDailyActivity = async (id: string, partial: Partial<DailyActivity>) => {
    if (!canEditDailyActivities) return;
    mutationEpochRef.current += 1;
    const previousActivities = dailyActivities;
    const existing = dailyActivities.find((a) => a.id === id);
    const updatedItem = existing ? { ...existing, ...partial } : undefined;

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
        let res = await apiPut(`daily-activities/${id}`, updateObj);
        // If row didn't exist yet in Supabase, upsert it cleanly
        if (res.error && /not found/i.test(res.error) && updatedItem) {
          res = await apiPost('daily-activities', {
            id: updatedItem.id,
            code: updatedItem.code,
            name: updatedItem.name,
            start_time: updatedItem.startTime,
            end_time: updatedItem.endTime,
            location: updatedItem.location,
            description: updatedItem.description,
            is_mandatory: updatedItem.isMandatory,
            category: updatedItem.category,
          });
        }
        if (res.error) {
          console.error('Daily activity update error:', res.error);
          showSyncNotification(`✗ Failed to sync daily activity update: ${res.error}`);
          setDailyActivities(previousActivities);
        } else {
          recordTabUpdate(['daily']);
          showSyncNotification('✓ Daily Activity updated & synced live!');
        }
      }
    } catch (e: any) {
      console.error('Daily activity update exception:', e);
      showSyncNotification(`✗ Failed to sync daily activity update: ${e?.message || e}`);
      setDailyActivities(previousActivities);
    }
  };

  const deleteDailyActivity = async (id: string) => {
    if (!canEditDailyActivities) return;
    mutationEpochRef.current += 1;
    const previousActivities = dailyActivities;
    setDailyActivities((prev) => prev.filter((a) => a.id !== id));

    try {
      const res = await apiDelete(`daily-activities/${id}`);
      if (res.error) {
        console.error('Daily activity delete error:', res.error);
        showSyncNotification(`✗ Failed to delete daily activity: ${res.error}`);
        setDailyActivities(previousActivities);
      } else {
        recordTabUpdate(['daily']);
        showSyncNotification('✓ Daily Activity deleted from QD Schedule!');
      }
    } catch (e: any) {
      console.error('Daily activity delete exception:', e);
      showSyncNotification(`✗ Failed to delete daily activity: ${e?.message || e}`);
      setDailyActivities(previousActivities);
    }
  };

  // Memo Groups (Admin Only) - synced to Supabase board_meta
  const createMemoGroup = async (name: string, description?: string): Promise<boolean> => {
    if (!isAdmin) return false;
    const cleanName = name.trim();
    if (!cleanName) return false;
    if (memoGroups.some((g) => g.name.toLowerCase() === cleanName.toLowerCase())) {
      return false;
    }

    mutationEpochRef.current += 1;
    const previousGroups = memoGroups;
    const newGroup: MemoGroup = {
      id: `grp-${Date.now()}`,
      name: cleanName,
      description: description?.trim() || '',
      createdAt: toISODateString(new Date()),
    };
    const nextGroups = [...memoGroups, newGroup];
    setMemoGroups(nextGroups);

    const res = await apiPost('board-meta', { key: 'memo_groups', value: nextGroups });
    if (res.error) {
      setMemoGroups(previousGroups);
      showSyncNotification(`✗ Failed to save memo group: ${res.error}`);
      return false;
    }
    recordTabUpdate(['memos']);
    showSyncNotification('✓ Memo Group created & synced!');
    return true;
  };

  const updateMemoGroup = async (id: string, name: string, description?: string) => {
    if (!isAdmin) return;
    mutationEpochRef.current += 1;
    const previousGroups = memoGroups;
    const nextGroups = memoGroups.map((g) =>
      g.id === id ? { ...g, name: name.trim(), description: description?.trim() } : g
    );
    setMemoGroups(nextGroups);

    const res = await apiPost('board-meta', { key: 'memo_groups', value: nextGroups });
    if (res.error) {
      setMemoGroups(previousGroups);
      showSyncNotification(`✗ Failed to update memo group: ${res.error}`);
      return;
    }
    recordTabUpdate(['memos']);
    showSyncNotification('✓ Memo Group updated & synced!');
  };

  const deleteMemoGroup = async (id: string) => {
    if (!isAdmin) return;
    mutationEpochRef.current += 1;
    const previousGroups = memoGroups;
    const nextGroups = memoGroups.filter((g) => g.id !== id);
    setMemoGroups(nextGroups);

    const res = await apiPost('board-meta', { key: 'memo_groups', value: nextGroups });
    if (res.error) {
      setMemoGroups(previousGroups);
      showSyncNotification(`✗ Failed to delete memo group: ${res.error}`);
      return;
    }
    recordTabUpdate(['memos']);
    showSyncNotification('✓ Memo Group removed & synced!');
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
    if (!canUploadMemos) {
      return { success: false, dbSaved: false, storageSaved: false, dbError: 'Unauthorized' };
    }

    mutationEpochRef.current += 1;
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

        const resolvedFileUrl = uploadRes.data?.fileUrl || (uploadRes as any)?.fileUrl;
        if (resolvedFileUrl) {
          fileUrl = resolvedFileUrl;
          storageSaved = true;
        } else {
          storageError = uploadRes.error || 'Storage upload returned no URL';
          showSyncNotification(`✗ Failed to upload memo file: ${storageError}`);
          return {
            success: false,
            dbSaved: false,
            storageSaved: false,
            storageError,
          };
        }
      } catch (err: any) {
        storageError = err?.message || 'Storage upload exception';
        showSyncNotification(`✗ Failed to upload memo file: ${storageError}`);
        return {
          success: false,
          dbSaved: false,
          storageSaved: false,
          storageError,
        };
      }
    }

    const newMemo: Memorandum = {
      ...memo,
      id: `memo-${Date.now()}`,
      fileUrl,
      uploadDate: toISODateString(new Date()),
      uploadedBy: currentUser?.id || 'usr-anon',
      uploadedByName: currentUser?.fullName || 'Fleet Officer',
    };

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
        setMemos((prev) => [newMemo, ...prev]);
        recordTabUpdate(['memos']);
        showSyncNotification('✓ Memorandum uploaded & saved to Database repository!');
        return {
          success: true,
          dbSaved: true,
          storageSaved,
          storageError,
        };
      } else {
        const dbError = res.error || 'Database insert failed';
        showSyncNotification(`✗ Failed to save memorandum to database: ${dbError}`);
        return {
          success: false,
          dbSaved: false,
          storageSaved,
          storageError,
          dbError,
        };
      }
    } catch (err: any) {
      const dbError = err?.message || 'Database insert exception';
      showSyncNotification(`✗ Failed to save memorandum to database: ${dbError}`);
      return {
        success: false,
        dbSaved: false,
        storageSaved,
        storageError,
        dbError,
      };
    }
  };

  const updateMemorandum = async (
    id: string,
    partial: Partial<Memorandum>
  ): Promise<boolean> => {
    if (!canUploadMemos) return false;
    mutationEpochRef.current += 1;
    const previousMemos = memos;
    setMemos((prev) => prev.map((m) => (m.id === id ? { ...m, ...partial } : m)));

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
          showSyncNotification(`✗ Failed to sync memorandum update: ${res.error}`);
          setMemos(previousMemos);
          return false;
        }
      }
      recordTabUpdate(['memos']);
      showSyncNotification('✓ Memorandum updated in Database!');
      return true;
    } catch (err: any) {
      console.error('Update memorandum exception:', err);
      showSyncNotification(`✗ Failed to sync memorandum update: ${err?.message || err}`);
      setMemos(previousMemos);
      return false;
    }
  };

  const deleteMemorandum = async (id: string) => {
    if (!canUploadMemos) return;
    mutationEpochRef.current += 1;
    const previousMemos = memos;
    setMemos((prev) => prev.filter((m) => m.id !== id));

    try {
      const res = await apiDelete(`memos/${id}`);
      if (res.error) {
        console.error('Delete memorandum error:', res.error);
        showSyncNotification(`✗ Failed to delete memorandum: ${res.error}`);
        setMemos(previousMemos);
      } else {
        recordTabUpdate(['memos']);
        showSyncNotification('✓ Memorandum removed from Database!');
      }
    } catch (err: any) {
      console.error('Delete memorandum exception:', err);
      showSyncNotification(`✗ Failed to delete memorandum: ${err?.message || err}`);
      setMemos(previousMemos);
    }
  };

  // Announcements
  const addAnnouncement = async (
    item: Omit<Announcement, 'id' | 'postedAt' | 'date' | 'postedBy' | 'postedByName'>
  ) => {
    if (!canPostAnnouncements) return;
    mutationEpochRef.current += 1;
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
        showSyncNotification(`✗ Failed to sync announcement: ${res.error}`);
        setAnnouncements((prev) => prev.filter((a) => a.id !== newAnnouncement.id));
      } else {
        const isMusterNotice =
          newAnnouncement.category === 'MUSTERING' ||
          newAnnouncement.category === 'OFFICER DIRECTIVE' ||
          newAnnouncement.title.toUpperCase().includes('MUSTERING') ||
          newAnnouncement.title.toUpperCase().includes('MUSTER');
        recordTabUpdate([isMusterNotice ? 'mustering' : 'announcements']);
        showSyncNotification(`✓ Announcement posted & broadcast live to ${newAnnouncement.targetAudience || 'Fleet'}!`);
      }
    } catch (e: any) {
      console.error('Announcements insert exception:', e);
      showSyncNotification(`✗ Failed to sync announcement: ${e?.message || e}`);
      setAnnouncements((prev) => prev.filter((a) => a.id !== newAnnouncement.id));
    }
  };

  const updateAnnouncement = async (id: string, partial: Partial<Announcement>) => {
    if (!canPostAnnouncements) return;
    mutationEpochRef.current += 1;
    const previousAnnouncements = announcements;
    const existingAnn = announcements.find((a) => a.id === id);
    const mergedAnn = existingAnn ? { ...existingAnn, ...partial } : partial;
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
          showSyncNotification(`✗ Failed to sync announcement update: ${res.error}`);
          setAnnouncements(previousAnnouncements);
        } else {
          const isMusterNotice =
            mergedAnn.category === 'MUSTERING' ||
            mergedAnn.category === 'OFFICER DIRECTIVE' ||
            (mergedAnn.title || '').toUpperCase().includes('MUSTERING') ||
            (mergedAnn.title || '').toUpperCase().includes('MUSTER');
          recordTabUpdate([isMusterNotice ? 'mustering' : 'announcements']);
          showSyncNotification('✓ Announcement updated & broadcast live across all devices!');
        }
      }
    } catch (e: any) {
      console.error('Announcements update exception:', e);
      showSyncNotification(`✗ Failed to sync announcement update: ${e?.message || e}`);
      setAnnouncements(previousAnnouncements);
    }
  };

  const deleteAnnouncement = async (id: string) => {
    if (!canPostAnnouncements) return;
    mutationEpochRef.current += 1;
    const previousAnnouncements = announcements;
    const targetAnn = announcements.find((a) => a.id === id);
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));

    try {
      const res = await apiDelete(`announcements/${id}`);
      if (res.error) {
        console.error('Announcements delete error:', res.error);
        showSyncNotification(`✗ Failed to delete announcement: ${res.error}`);
        setAnnouncements(previousAnnouncements);
      } else {
        const isMusterNotice =
          targetAnn?.category === 'MUSTERING' ||
          targetAnn?.category === 'OFFICER DIRECTIVE' ||
          (targetAnn?.title || '').toUpperCase().includes('MUSTERING') ||
          (targetAnn?.title || '').toUpperCase().includes('MUSTER');
        recordTabUpdate([isMusterNotice ? 'mustering' : 'announcements']);
        showSyncNotification('✓ Announcement deleted from Database!');
      }
    } catch (e: any) {
      console.error('Announcements delete exception:', e);
      showSyncNotification(`✗ Failed to delete announcement: ${e?.message || e}`);
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
    recordTabUpdate(['mustering']);
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

    mutationEpochRef.current += 1;
    const previousRoster = dutyRoster;
    const todayStr = toISODateString(new Date());
    const currentItem =
      dutyRoster.find((d) => d.id === id) ||
      selectActiveDuty(dutyRoster);

    const targetObj: DutyRosterItem = {
      ...currentItem,
      ...partial,
      id: currentItem.id || id || 'dty-01',
      date: todayStr,
    };

    setDutyRoster((prev) => {
      const filtered = prev.filter((d) => d.id !== targetObj.id);
      return [targetObj, ...filtered];
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
        setDutyRoster(previousRoster);
        showSyncNotification(`✗ Failed to sync watch bill: ${res.error}`);
      } else {
        recordTabUpdate(['duties']);
        showSyncNotification('✓ Watch Bill (FOD / COOW / MOOW) saved & broadcast live across all devices!');
      }
    } catch (e: any) {
      console.error('Duties upsert exception:', e);
      setDutyRoster(previousRoster);
      showSyncNotification(`✗ Failed to sync watch bill: ${e?.message || e}`);
    }
  };

  // Standing Orders & Board Meta Handlers
  const updateStandingOrders = async (orders: string[]) => {
    if (!canEditDailyActivities) return;
    mutationEpochRef.current += 1;
    const previousOrders = standingOrders;
    setStandingOrders(orders);
    try {
      const res = await apiPost('standing-orders', { orders });
      if (res.error) {
        console.error('Standing orders post error:', res.error);
        showSyncNotification(`✗ Failed to sync standing orders: ${res.error}`);
        setStandingOrders(previousOrders);
      } else {
        recordTabUpdate(['daily']);
        showSyncNotification('✓ Standing Orders saved & broadcast live to all devices!');
      }
    } catch (e: any) {
      console.error('Standing orders post exception:', e);
      showSyncNotification(`✗ Failed to sync standing orders: ${e?.message || e}`);
      setStandingOrders(previousOrders);
    }
  };

  const updateUniformData = async (data: {
    primaryLabel: string;
    primaryValue: string;
    secondaryLabel: string;
    secondaryValue: string;
  }) => {
    if (!canEditDailyActivities) return;
    mutationEpochRef.current += 1;
    const previousUniformData = uniformData;
    setUniformData(data);
    try {
      const res = await apiPost('board-meta', { key: 'uniforms', value: data });
      if (res.error) {
        console.error('Uniform data post error:', res.error);
        showSyncNotification(`✗ Failed to sync uniform requirements: ${res.error}`);
        setUniformData(previousUniformData);
      } else {
        recordTabUpdate(['daily']);
        showSyncNotification('✓ Uniform Requirements saved & synced live!');
      }
    } catch (e: any) {
      console.error('Uniform data post exception:', e);
      showSyncNotification(`✗ Failed to sync uniform requirements: ${e?.message || e}`);
      setUniformData(previousUniformData);
    }
  };

  const updateFleetData = async (data: any) => {
    if (!canEditDailyActivities) return;
    mutationEpochRef.current += 1;
    const previousFleetData = fleetData;
    setFleetData(data);
    try {
      const res = await apiPost('board-meta', { key: 'fleet_roster', value: data });
      if (res.error) {
        console.error('Fleet data post error:', res.error);
        showSyncNotification(`✗ Failed to sync fleet roster: ${res.error}`);
        setFleetData(previousFleetData);
      } else {
        recordTabUpdate(['daily']);
        showSyncNotification('✓ Fleet Section Roster saved & updated live!');
      }
    } catch (e: any) {
      console.error('Fleet data post exception:', e);
      showSyncNotification(`✗ Failed to sync fleet roster: ${e?.message || e}`);
      setFleetData(previousFleetData);
    }
  };

  const updateStrengthRows = async (rows: any[], asOf: string) => {
    if (!canEditDailyActivities) return;
    mutationEpochRef.current += 1;
    const previousStrengthRows = strengthRows;
    const previousStrengthAsOf = strengthAsOf;
    setStrengthRows(rows);
    setStrengthAsOf(asOf);
    try {
      const res = await apiPost('board-meta', { key: 'total_strength', value: { rows, asOf } });
      if (res.error) {
        console.error('Strength rows post error:', res.error);
        showSyncNotification(`✗ Failed to sync personnel strength: ${res.error}`);
        setStrengthRows(previousStrengthRows);
        setStrengthAsOf(previousStrengthAsOf);
      } else {
        recordTabUpdate(['daily']);
        showSyncNotification('✓ Total Personnel Strength saved & synced live across all devices!');
      }
    } catch (e: any) {
      console.error('Strength rows post exception:', e);
      showSyncNotification(`✗ Failed to sync personnel strength: ${e?.message || e}`);
      setStrengthRows(previousStrengthRows);
      setStrengthAsOf(previousStrengthAsOf);
    }
  };

  // Daily Reset Simulator (resets date & local muster roll without wiping Supabase board data)
  const simulateDailyReset = () => {
    const today = toISODateString(new Date());
    setLastResetDate(today);
    resetMusterRoll();
    showSyncNotification(`✓ Daily Cycle Refreshed for ${today}.`);
  };

  const clearResetNotification = () => setResetNotification(null);

  return (
    <FleetContext.Provider
      value={{
        activePage,
        setActivePage,
        unreadTabs,
        hasAnyUnreadTab,
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
