import {
  UserAccount,
  DailyActivity,
  FleetEvent,
  MemoGroup,
  Memorandum,
  Announcement,
  MusterEntry,
  DutyRosterItem,
} from '../types';
import { toISODateString } from '../utils/timeConflict';

export const INITIAL_USERS: UserAccount[] = [
  {
    id: 'usr-1',
    username: 'admin',
    email: 'admin@fleet.ops',
    title: 'Administrator',
    password: 'admin123',
    fullName: 'Administrator',
    rank: 'Administrator',
    role: 'admin',
    createdAt: '2026-01-10',
    isActive: true,
  },
];

export const INITIAL_MEMO_GROUPS: MemoGroup[] = [
  {
    id: 'grp-acad',
    name: 'Academy Memorandums',
    description: 'Directives from the Superintendent and Dean of Academics',
    createdAt: '2026-01-01',
    isDefault: true,
  },
  {
    id: 'grp-fleet',
    name: 'Fleet Memorandums',
    description: 'Fleet-wide operational instructions, formation rules, and parade orders',
    createdAt: '2026-01-01',
    isDefault: true,
  },
  {
    id: 'grp-train',
    name: 'Training Memorandums',
    description: 'Drill guidelines, simulator rotations, sea phase readiness criteria',
    createdAt: '2026-01-01',
    isDefault: true,
  },
  {
    id: 'grp-admin',
    name: 'Administrative Memorandums',
    description: 'Personnel policies, leave quotas, uniform regulations, conduct codes',
    createdAt: '2026-01-01',
    isDefault: true,
  },
  {
    id: 'grp-ops',
    name: 'Operations Memorandums',
    description: 'Quarterdeck watch bills, harbour security, vessel boarding procedures',
    createdAt: '2026-01-01',
    isDefault: true,
  },
];

export const INITIAL_MEMOS: Memorandum[] = [];

export const INITIAL_DAILY_ACTIVITIES: DailyActivity[] = [
  {
    id: 'qd-01',
    code: 'MESS-01',
    name: 'Morning Mess',
    startTime: '0700H',
    endTime: '0800H',
    location: 'Cadet Mess Hall',
    description: 'Morning meal service.',
    isMandatory: true,
    category: 'ROUTINE',
  },
  {
    id: 'qd-02',
    code: 'TALK-01',
    name: 'ADMIN / DCO REVISED TALK',
    startTime: '0800H',
    endTime: '1000H',
    location: 'Academy Auditorium',
    description: 'Administrative and Discipline Command Officer briefing.',
    isMandatory: true,
    category: 'ROUTINE',
  },
  {
    id: 'qd-03',
    code: 'CLN-01',
    name: 'DORMITORY CLEANING',
    startTime: '1000H',
    endTime: '1100H',
    location: 'Cadet Berthing Spaces',
    description: 'Company dormitory sanitation and field day preparations.',
    isMandatory: true,
    category: 'ROUTINE',
  },
  {
    id: 'qd-04',
    code: 'CLN-02',
    name: 'DORMITORY CLEANING',
    startTime: '1100H',
    endTime: '1200H',
    location: 'Cadet Berthing Spaces',
    description: 'Berthing space alignment and inspection staging.',
    isMandatory: true,
    category: 'ROUTINE',
  },
  {
    id: 'qd-05',
    code: 'MESS-02',
    name: 'Noon Mess',
    startTime: '1200H',
    endTime: '1300H',
    location: 'Cadet Mess Hall',
    description: 'Midday meal service for all midshipmen.',
    isMandatory: true,
    category: 'ROUTINE',
  },
  {
    id: 'qd-06',
    code: 'INSP-01',
    name: 'DORMITORY INSPECTION',
    startTime: '1300H',
    endTime: '1400H',
    location: 'Dormitory Blocks',
    description: 'Official Quarterdeck inspection of barracks decks.',
    isMandatory: true,
    category: 'ROUTINE',
  },
  {
    id: 'qd-07',
    code: 'CER-01',
    name: 'TURN-OVER CEREMONY',
    startTime: '1600H',
    endTime: '1700H',
    location: 'Parade Grounds',
    description: 'Ceremonial relief and turnover.',
    isMandatory: true,
    category: 'CEREMONIAL',
  },
  {
    id: 'qd-08',
    code: 'MOV-01',
    name: 'MOVE OUT OF BATCH 2',
    startTime: '1700H',
    endTime: '1800H',
    location: 'Academy Gate / Assembly Deck',
    description: 'Cadet departure and movement logistics.',
    isMandatory: true,
    category: 'ROUTINE',
  },
  {
    id: 'qd-09',
    code: 'MESS-03',
    name: 'Evening Mess',
    startTime: '1800H',
    endTime: '1900H',
    location: 'Cadet Mess Hall',
    description: 'Evening dinner muster and service.',
    isMandatory: true,
    category: 'ROUTINE',
  },
  {
    id: 'qd-10',
    code: 'FILM-01',
    name: 'FILM SHOWING',
    startTime: '1900H',
    endTime: '2100H',
    location: 'Briefing Hall',
    description: 'Educational and maritime documentary screening.',
    isMandatory: false,
    category: 'TRAINING',
  },
  {
    id: 'qd-11',
    code: 'MUST-01',
    name: 'Evening Mustering',
    startTime: '2100H',
    endTime: '2130H',
    location: 'Quarterdeck Plaza',
    description: 'Evening roll call and physical count.',
    isMandatory: true,
    category: 'CEREMONIAL',
  },
  {
    id: 'qd-12',
    code: 'CAD-01',
    name: "CADRE'S TIME / CLEANING STATION",
    startTime: '2130H',
    endTime: '2200H',
    location: 'Battalion Area',
    description: 'Cadre consultation and cleaning station check.',
    isMandatory: true,
    category: 'ROUTINE',
  },
  {
    id: 'qd-13',
    code: 'LIGHT-01',
    name: 'LIGHTS OFF',
    startTime: '2200H',
    endTime: '2300H',
    location: 'All Berthing Quarters',
    description: 'Night silence on all decks.',
    isMandatory: true,
    category: 'ROUTINE',
  },
];

export function getInitialEvents(): FleetEvent[] {
  return [];
}

export function getInitialAnnouncements(): Announcement[] {
  return [];
}

export function getInitialMuster(): MusterEntry[] {
  return [];
}

export function getInitialDuties(): DutyRosterItem[] {
  const today = toISODateString(new Date());
  return [
    {
      id: 'dty-01',
      date: today,
      watchPeriod: 'Quarterdeck Watch Bill',
      fod: '',
      fodRank: '',
      coow: '',
      coowRank: '',
      acoow1: '',
      acoow2: '',
      acwo: '',
      acwoRank: '',
      moow: '',
      amoow1: '',
      amoow2: '',
      station: 'Quarterdeck Main Desk',
      status: 'ON_WATCH',
      logSummary: 'Quarterdeck watch posted.',
    },
  ];
}
