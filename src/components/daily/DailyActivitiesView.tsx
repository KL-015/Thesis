import React, { useState, useMemo } from 'react';
import { useFleet } from '../../context/FleetContext';
import { DailyActivity, DutyRosterItem } from '../../types';
import {
  militaryTimeToMinutes,
  getCurrentMilitaryTime,
  toISODateString,
} from '../../utils/timeConflict';
import { RotateCcw, ArrowRight, Plus, Edit2, Trash2, X, ShieldAlert } from 'lucide-react';
import { apiGet, apiPost } from '../../lib/supabase';

interface FleetSection {
  title: string;
  names: string[];
}

interface FleetCardData {
  section1: FleetSection;
  section2: FleetSection;
  section3: FleetSection;
  note: string;
}

const DEFAULT_FLEET_DATA: FleetCardData = {
  section1: {
    title: 'CADET CANDIDATES',
    names: ['BATCH 3'],
  },
  section2: {
    title: 'CADET TRAINER',
    names: ['OLIVAR', 'OCDP', 'BERINGUELA', 'BALUCOS', 'GO'],
  },
  section3: {
    title: 'SLDP',
    names: ['BELOLO', 'DE OCAMPO'],
  },
  note: 'ABOARD CADETS',
};

export interface StrengthRow {
  id: string;
  batch: string;
  ts: number | string;
  tp: number | string;
  nya: number | string;
}

const DEFAULT_STRENGTH_ROWS: StrengthRow[] = [
  { id: 'str-1', batch: 'SLDP', ts: 2, tp: 2, nya: 0 },
  { id: 'str-2', batch: 'CADET TRAINERS', ts: 108, tp: 108, nya: 0 },
  { id: 'str-3', batch: 'CADET CANDIDATES (265)', ts: 211, tp: 211, nya: 0 },
];

interface UniformRequirementsData {
  primaryLabel: string;
  primaryValue: string;
  secondaryLabel: string;
  secondaryValue: string;
}

const DEFAULT_UNIFORMS: UniformRequirementsData = {
  primaryLabel: 'UNIFORM OF THE DAY',
  primaryValue: 'NAVY BLUE SHIRT W/ JEANS',
  secondaryLabel: 'ENRICHMENT UNIFORM OF THE DAY',
  secondaryValue: 'ANY ATHLETIC ATTIRE',
};

export const DailyActivitiesView: React.FC<{ onNavigateToCalendar: () => void }> = ({
  onNavigateToCalendar,
}) => {
  const {
    dailyActivities,
    addDailyActivity,
    updateDailyActivity,
    deleteDailyActivity,
    simulateDailyReset,
    events,
    canEditDailyActivities: isFleetOfficerOrAdmin,
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
  } = useFleet();

  const currentMilitary = getCurrentMilitaryTime();
  const todayStr = toISODateString(new Date());

  // Edit / Add Activity Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<DailyActivity | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [startTimeInput, setStartTimeInput] = useState('');
  const [endTimeInput, setEndTimeInput] = useState('');
  const [locationInput, setLocationInput] = useState('');

  const currentDuty: DutyRosterItem = dutyRoster.find((d) => d.date === todayStr) || dutyRoster[0] || {
    id: `dty-${todayStr}`,
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
  };

  // Duty Personnel Edit Modal state
  const [isDutyModalOpen, setIsDutyModalOpen] = useState(false);
  const [fodInput, setFodInput] = useState('');
  const [coowInput, setCoowInput] = useState('');
  const [acoow1Input, setAcoow1Input] = useState('');
  const [acoow2Input, setAcoow2Input] = useState('');
  const [moowInput, setMoowInput] = useState('');
  const [amoow1Input, setAmoow1Input] = useState('');
  const [amoow2Input, setAmoow2Input] = useState('');

  // Standing Orders State
  const [isStandingOrdersModalOpen, setIsStandingOrdersModalOpen] = useState(false);
  const [tempStandingOrders, setTempStandingOrders] = useState<string[]>([]);
  const [newOrderInput, setNewOrderInput] = useState('');

  const openDutyModal = () => {
    setFodInput(currentDuty.fod || '');
    setCoowInput(currentDuty.coow || '');
    setAcoow1Input(currentDuty.acoow1 || currentDuty.acwo || '');
    setAcoow2Input(currentDuty.acoow2 || '');
    setMoowInput(currentDuty.moow || '');
    setAmoow1Input(currentDuty.amoow1 || '');
    setAmoow2Input(currentDuty.amoow2 || '');
    setIsDutyModalOpen(true);
  };

  const handleSaveDuty = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateDutyItem(currentDuty.id, {
      fod: fodInput.trim(),
      coow: coowInput.trim(),
      acoow1: acoow1Input.trim(),
      acoow2: acoow2Input.trim(),
      acwo: acoow1Input.trim(),
      moow: moowInput.trim(),
      amoow1: amoow1Input.trim(),
      amoow2: amoow2Input.trim(),
    });
    setIsDutyModalOpen(false);
  };

  // Uniform Requirements Modal state
  const [isUniformModalOpen, setIsUniformModalOpen] = useState(false);
  const [primaryLabelInput, setPrimaryLabelInput] = useState('');
  const [primaryValueInput, setPrimaryValueInput] = useState('');
  const [secondaryLabelInput, setSecondaryLabelInput] = useState('');
  const [secondaryValueInput, setSecondaryValueInput] = useState('');

  const openUniformModal = () => {
    setPrimaryLabelInput(uniformData.primaryLabel);
    setPrimaryValueInput(uniformData.primaryValue);
    setSecondaryLabelInput(uniformData.secondaryLabel);
    setSecondaryValueInput(uniformData.secondaryValue);
    setIsUniformModalOpen(true);
  };

  const handleSaveUniform = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated: UniformRequirementsData = {
      primaryLabel: primaryLabelInput.trim() || 'UNIFORM OF THE DAY',
      primaryValue: primaryValueInput.trim() || 'NAVY BLUE SHIRT W/ JEANS',
      secondaryLabel: secondaryLabelInput.trim() || 'ENRICHMENT UNIFORM OF THE DAY',
      secondaryValue: secondaryValueInput.trim() || 'ANY ATHLETIC ATTIRE',
    };
    await updateUniformData(updated);
    setIsUniformModalOpen(false);
  };

  // Fleet Section Modal state
  const [isFleetModalOpen, setIsFleetModalOpen] = useState(false);
  const [sec1TitleInput, setSec1TitleInput] = useState('');
  const [sec1NamesInput, setSec1NamesInput] = useState('');
  const [sec2TitleInput, setSec2TitleInput] = useState('');
  const [sec2NamesInput, setSec2NamesInput] = useState('');
  const [sec3TitleInput, setSec3TitleInput] = useState('');
  const [sec3NamesInput, setSec3NamesInput] = useState('');
  const [noteInput, setNoteInput] = useState('');

  const openFleetModal = () => {
    setSec1TitleInput(fleetData.section1.title);
    setSec1NamesInput(fleetData.section1.names.join('\n'));
    setSec2TitleInput(fleetData.section2.title);
    setSec2NamesInput(fleetData.section2.names.join('\n'));
    setSec3TitleInput(fleetData.section3.title);
    setSec3NamesInput(fleetData.section3.names.join('\n'));
    setNoteInput(fleetData.note || 'ABOARD CADETS');
    setIsFleetModalOpen(true);
  };

  const handleSaveFleet = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated: FleetCardData = {
      section1: {
        title: sec1TitleInput.trim() || 'CADET CANDIDATES',
        names: sec1NamesInput
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
      },
      section2: {
        title: sec2TitleInput.trim() || 'CADET TRAINER',
        names: sec2NamesInput
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
      },
      section3: {
        title: sec3TitleInput.trim() || 'SLDP',
        names: sec3NamesInput
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
      },
      note: noteInput.trim() || 'ABOARD CADETS',
    };

    await updateFleetData(updated);
    setIsFleetModalOpen(false);
  };

  // Total Strength Modal state
  const [isStrengthModalOpen, setIsStrengthModalOpen] = useState(false);
  const [editingRows, setEditingRows] = useState<StrengthRow[]>([]);
  const [editingAsOf, setEditingAsOf] = useState('');

  const openStrengthModal = () => {
    setEditingRows(strengthRows.map((r) => ({ ...r })));
    setEditingAsOf(strengthAsOf || currentMilitary || '0800H');
    setIsStrengthModalOpen(true);
  };

  const handleRowChange = (index: number, field: keyof StrengthRow, val: string) => {
    setEditingRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleAddRow = () => {
    setEditingRows((prev) => [
      ...prev,
      {
        id: `str-${Date.now()}`,
        batch: 'NEW BATCH',
        ts: 0,
        tp: 0,
        nya: 0,
      },
    ]);
  };

  const handleRemoveRow = (index: number) => {
    if (editingRows.length <= 1) return;
    setEditingRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveStrength = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRows = editingRows.map((r) => ({
      ...r,
      batch: r.batch.trim() || 'BATCH',
      ts: Number(r.ts) || 0,
      tp: Number(r.tp) || 0,
      nya: Number(r.nya) || 0,
    }));
    await updateStrengthRows(cleanRows, editingAsOf.trim());
    setIsStrengthModalOpen(false);
  };

  const totalTS = useMemo(
    () => strengthRows.reduce((sum, r) => sum + (Number(r.ts) || 0), 0),
    [strengthRows]
  );
  const totalTP = useMemo(
    () => strengthRows.reduce((sum, r) => sum + (Number(r.tp) || 0), 0),
    [strengthRows]
  );
  const totalNYA = useMemo(
    () => strengthRows.reduce((sum, r) => sum + (Number(r.nya) || 0), 0),
    [strengthRows]
  );

  const formattedDate = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).toUpperCase();
  }, []);

  const todayCalendarEvents = useMemo(() => {
    return events.filter((e) => e.date === todayStr);
  }, [events, todayStr]);

  // Identify meal and mustering rows according to the template
  const isMealOrMuster = (name: string) => {
    const n = name.toLowerCase();
    return (
      n.includes('morning mess') ||
      n.includes('noon mess') ||
      n.includes('evening mess') ||
      n.includes('evening mustering') ||
      n.includes('mess') ||
      n.includes('mustering')
    );
  };

  const openAddModal = () => {
    setEditingActivity(null);
    setNameInput('');
    setStartTimeInput('0800H');
    setEndTimeInput('0900H');
    setLocationInput('Parade Ground');
    setIsModalOpen(true);
  };

  const openEditModal = (act: DailyActivity) => {
    setEditingActivity(act);
    setNameInput(act.name);
    setStartTimeInput(act.startTime);
    setEndTimeInput(act.endTime);
    setLocationInput(act.location || '');
    setIsModalOpen(true);
  };

  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim() || !startTimeInput.trim()) return;

    if (editingActivity) {
      await updateDailyActivity(editingActivity.id, {
        name: nameInput.trim(),
        startTime: startTimeInput.trim(),
        endTime: endTimeInput.trim() || startTimeInput.trim(),
        location: locationInput.trim() || 'Academy Grounds',
        description: nameInput.trim(),
      });
    } else {
      await addDailyActivity({
        code: `ACT-${Date.now().toString().slice(-4)}`,
        name: nameInput.trim(),
        startTime: startTimeInput.trim(),
        endTime: endTimeInput.trim() || startTimeInput.trim(),
        location: locationInput.trim() || 'Academy Grounds',
        description: nameInput.trim(),
        isMandatory: true,
        category: 'ROUTINE',
      });
    }
    setIsModalOpen(false);
  };

  return (
    <div className="max-w-[1200px] mx-auto py-2">
      {/* Header Card - Frosted Glass Container */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white/12 backdrop-blur-2xl text-white p-4 sm:px-6 rounded-3xl border border-white/25 shadow-[0_15px_40px_rgba(0,0,0,0.25)] mb-5 gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold tracking-wider uppercase text-white">
            Activities &amp; Status Board
          </h1>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          {/* Quick Simulate Daily Reset Button */}
          <button
            onClick={simulateDailyReset}
            title="Simulate daily midnight reset"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all border border-white/20 cursor-pointer backdrop-blur-md"
          >
            <RotateCcw className="w-3.5 h-3.5 text-blue-300" />
            <span className="hidden sm:inline">Reset Day</span>
          </button>

          {/* Date Badge */}
          <div className="bg-blue-600 text-white font-bold px-3.5 py-1.5 rounded-xl text-sm sm:text-base font-sans tracking-wide shrink-0 shadow-[0_4px_14px_rgba(37,99,235,0.4)] border border-blue-400/30">
            DATE: {formattedDate}
          </div>
        </div>
      </div>

      {/* Two-Column Dashboard (7fr 5fr on desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: SCHEDULE & STANDING ORDERS (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Daily Activities Schedule Card */}
          <div className="bg-white/12 backdrop-blur-2xl border border-white/25 rounded-3xl p-6 shadow-[0_15px_40px_rgba(0,0,0,0.2)] text-white">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/15">
            <div className="flex items-center gap-3">
              <h2 className="text-[1.1rem] font-bold text-white">Daily Activities</h2>
              {isFleetOfficerOrAdmin && (
                <button
                  onClick={openAddModal}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-[0_4px_12px_rgba(37,99,235,0.35)] border border-blue-400/30 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Activity</span>
                </button>
              )}
            </div>

            <button
              onClick={onNavigateToCalendar}
              className="text-xs text-blue-300 hover:text-white font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Fleet Calendar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-white/10 text-white/70 text-[0.8rem] uppercase">
                  <th className="w-[100px] py-2.5 px-3 font-bold border-b border-white/15">Time</th>
                  <th className="py-2.5 px-3 font-bold border-b border-white/15">Activity / Event</th>
                  {isFleetOfficerOrAdmin && (
                    <th className="w-[80px] py-2.5 px-3 font-bold border-b border-white/15 text-right">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {dailyActivities.length === 0 ? (
                  <tr>
                    <td colSpan={isFleetOfficerOrAdmin ? 3 : 2} className="py-8 text-center text-xs text-white/50 italic">
                      No daily activities configured. Click &quot;Add Activity&quot; above to schedule.
                    </td>
                  </tr>
                ) : (
                  dailyActivities.map((act) => {
                    const actStart = militaryTimeToMinutes(act.startTime);
                    const actEnd = militaryTimeToMinutes(act.endTime);

                    // Check if any fleet event today overlaps with this daily activity
                    const overlappingEvents = todayCalendarEvents.filter((ev) => {
                      const evStart = militaryTimeToMinutes(ev.startTime);
                      const evEnd = militaryTimeToMinutes(ev.endTime);
                      return Math.max(actStart, evStart) < Math.min(actEnd, evEnd);
                    });

                    const isHighlighted = isMealOrMuster(act.name);

                    return (
                      <tr
                        key={act.id}
                        className="border-b border-white/10 hover:bg-white/10 transition-colors group"
                      >
                        <td className="w-[100px] py-2.5 px-3 font-bold text-blue-300 font-mono text-sm align-middle whitespace-nowrap">
                          {act.startTime}
                        </td>
                        <td
                          className={`py-2.5 px-3 text-sm align-middle ${
                            isHighlighted
                              ? 'bg-amber-400/20 text-amber-200 border-l-2 border-amber-400 font-bold text-center uppercase tracking-wide rounded-sm'
                              : 'text-white font-medium'
                          }`}
                        >
                          <div>
                            <span>{act.name}</span>
                            {overlappingEvents.length > 0 && (
                              <div className="mt-1 text-[11px] text-amber-200 bg-amber-500/25 px-2 py-0.5 rounded-lg border border-amber-400/40 font-semibold inline-flex items-center gap-1 normal-case tracking-normal backdrop-blur-md">
                                <span>⚠️ Overlapping Event: {overlappingEvents.map((e) => e.name).join(', ')}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        {isFleetOfficerOrAdmin && (
                          <td className="py-2.5 px-3 text-right align-middle whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => openEditModal(act)}
                                title="Edit Activity"
                                className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/15 cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={async () => {
                                  if (confirm(`Remove activity "${act.name}"?`)) {
                                    await deleteDailyActivity(act.id);
                                  }
                                }}
                                title="Delete Activity"
                                className="p-1.5 text-white/50 hover:text-red-400 rounded-lg hover:bg-red-500/20 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* CARD BELOW DAILY ACTIVITIES: STANDING ORDERS (Constrained height to align with Total Strength card) */}
        <div className="bg-white/12 backdrop-blur-2xl border border-white/25 rounded-3xl p-5 shadow-[0_15px_40px_rgba(0,0,0,0.25)] text-white space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-white/15 pb-2.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-400/30">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Academy Standing Orders</span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/30 font-semibold">
                    Directives
                  </span>
                </h3>
                <p className="text-[11px] text-white/60">Standard operating guidelines for cadet battalions &amp; watch posts</p>
              </div>
            </div>

            {isFleetOfficerOrAdmin && (
              <button
                onClick={() => {
                  setTempStandingOrders([...standingOrders]);
                  setNewOrderInput('');
                  setIsStandingOrdersModalOpen(true);
                }}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-full flex items-center gap-1.5 transition-all shadow-md border border-blue-400/40 cursor-pointer self-start sm:self-auto shrink-0"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Orders</span>
              </button>
            )}
          </div>

          <ul className="space-y-1.5 text-xs text-white/90 max-h-[190px] overflow-y-auto pr-1">
            {standingOrders.map((order, idx) => (
              <li key={idx} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors backdrop-blur-md">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 mt-1.5 shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
                <span className="leading-relaxed font-medium text-[11px] sm:text-xs">{order}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

        {/* RIGHT COLUMN: OFFICERS, UNIFORMS & STRENGTH (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Duty Personnel — Synchronized with Duties Tab */}
          <div className="bg-white/12 backdrop-blur-2xl border border-white/25 rounded-3xl p-5 shadow-[0_12px_35px_rgba(0,0,0,0.2)] text-white">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/15">
              <h3 className="text-[1rem] font-bold text-white">
                Duty Personnel
              </h3>
              {isFleetOfficerOrAdmin && (
                <button
                  onClick={openDutyModal}
                  className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/15 flex items-center gap-1 text-xs font-semibold cursor-pointer transition-colors"
                  title="Edit Watch Personnel (FOD, COOW, ACOOW, MOOW, AMOOW)"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Edit</span>
                </button>
              )}
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block text-[0.72rem] uppercase text-white/60 font-bold tracking-wider">
                  Formation Officer of the Day (FOD)
                </label>
                <div className="text-[0.95rem] font-semibold text-white">
                  {currentDuty.fod || '—'}
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-[0.72rem] uppercase text-white/60 font-bold tracking-wider">
                  COOW
                </label>
                <div className="text-[0.95rem] font-semibold text-white">
                  {currentDuty.coow || '—'}
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-[0.72rem] uppercase text-white/60 font-bold tracking-wider">
                  ACOOW
                </label>
                <div className="text-[0.95rem] font-semibold text-white">
                  {currentDuty.acoow1 ? (
                    currentDuty.acoow2 ? `${currentDuty.acoow1} / ${currentDuty.acoow2}` : currentDuty.acoow1
                  ) : (
                    currentDuty.acoow2 || '—'
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-[0.72rem] uppercase text-white/60 font-bold tracking-wider">
                  MOOW
                </label>
                <div className="text-[0.95rem] font-semibold text-white">
                  {currentDuty.moow || '—'}
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-[0.72rem] uppercase text-white/60 font-bold tracking-wider">
                  AMOOW
                </label>
                <div className="text-[0.95rem] font-semibold text-white">
                  {currentDuty.amoow1 ? (
                    currentDuty.amoow2 ? `${currentDuty.amoow1} / ${currentDuty.amoow2}` : currentDuty.amoow1
                  ) : (
                    currentDuty.amoow2 || '—'
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Uniform Requirements — Editable for Officers */}
          <div className="bg-white/12 backdrop-blur-2xl border border-white/25 rounded-3xl p-5 shadow-[0_12px_35px_rgba(0,0,0,0.2)] text-white">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/15">
              <h3 className="text-[1rem] font-bold text-white">
                Uniform Requirements
              </h3>
              {isFleetOfficerOrAdmin && (
                <button
                  onClick={openUniformModal}
                  className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/15 flex items-center gap-1 text-xs font-semibold cursor-pointer transition-colors"
                  title="Edit Uniform Requirements"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Edit</span>
                </button>
              )}
            </div>
            <div
              onClick={isFleetOfficerOrAdmin ? openUniformModal : undefined}
              className={`space-y-3 ${isFleetOfficerOrAdmin ? 'cursor-pointer' : ''}`}
            >
              <div className="bg-blue-600/25 border-l-4 border-blue-400 p-3 rounded-r-2xl hover:bg-blue-600/35 transition-colors backdrop-blur-md">
                <label className="block text-[0.7rem] text-blue-200 font-bold uppercase tracking-wider mb-1">
                  {uniformData.primaryLabel}
                </label>
                <div className="text-[0.95rem] font-bold text-white">
                  {uniformData.primaryValue}
                </div>
              </div>
              <div className="bg-emerald-600/25 border-l-4 border-emerald-400 p-3 rounded-r-2xl hover:bg-emerald-600/35 transition-colors backdrop-blur-md">
                <label className="block text-[0.7rem] text-emerald-200 font-bold uppercase tracking-wider mb-1">
                  {uniformData.secondaryLabel}
                </label>
                <div className="text-[0.95rem] font-bold text-white">
                  {uniformData.secondaryValue}
                </div>
              </div>
            </div>
          </div>

          {/* Fleet Roster (formerly Cadets On Duty) */}
          <div className="bg-white/12 backdrop-blur-2xl border border-white/25 rounded-3xl p-5 shadow-[0_12px_35px_rgba(0,0,0,0.2)] text-white">
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/15">
              <div className="w-8" />
              <h3 className="text-[1.05rem] font-bold text-white text-center uppercase tracking-wider flex-1">
                Fleet
              </h3>
              {isFleetOfficerOrAdmin ? (
                <button
                  onClick={openFleetModal}
                  className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/15 flex items-center gap-1 text-xs font-semibold cursor-pointer transition-colors"
                  title="Edit Fleet Section Titles & Names"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Edit</span>
                </button>
              ) : (
                <div className="w-8" />
              )}
            </div>
            <div
              onClick={isFleetOfficerOrAdmin ? openFleetModal : undefined}
              className={`grid grid-cols-3 gap-2.5 mt-2.5 text-[0.85rem] ${
                isFleetOfficerOrAdmin ? 'cursor-pointer' : ''
              }`}
            >
              {/* Column 1: CADET CANDIDATES */}
              <div className="bg-white/10 p-2.5 rounded-2xl border border-white/15 min-h-[140px] flex flex-col hover:border-white/30 transition-colors backdrop-blur-md">
                <h4 className="text-[0.75rem] font-bold text-blue-200 border-b border-white/15 pb-1 mb-1.5 uppercase truncate tracking-wide">
                  {fleetData.section1.title}
                </h4>
                {fleetData.section1.names.length === 1 && !fleetData.section1.names[0].includes(' ') ? (
                  <p className="text-[0.75rem] text-white/80 font-medium">
                    {fleetData.section1.names[0]}
                  </p>
                ) : (
                  <ul className="space-y-0.5 text-xs text-white/90 font-medium">
                    {fleetData.section1.names.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Column 2: CADET TRAINER */}
              <div className="bg-white/10 p-2.5 rounded-2xl border border-white/15 min-h-[140px] flex flex-col hover:border-white/30 transition-colors backdrop-blur-md">
                <h4 className="text-[0.75rem] font-bold text-blue-200 border-b border-white/15 pb-1 mb-1.5 uppercase truncate tracking-wide">
                  {fleetData.section2.title}
                </h4>
                <ul className="space-y-0.5 text-xs text-white/90 font-medium">
                  {fleetData.section2.names.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              </div>

              {/* Column 3: SLDP */}
              <div className="bg-white/10 p-2.5 rounded-2xl border border-white/15 min-h-[140px] flex flex-col hover:border-white/30 transition-colors backdrop-blur-md">
                <h4 className="text-[0.75rem] font-bold text-blue-200 border-b border-white/15 pb-1 mb-1.5 uppercase truncate tracking-wide">
                  {fleetData.section3.title}
                </h4>
                <ul className="space-y-0.5 text-xs text-white/90 font-medium">
                  {fleetData.section3.names.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="text-[0.75rem] text-white/70 font-semibold mt-3">
              <strong className="text-white">NOTE:</strong> {fleetData.note || 'ABOARD CADETS'}
            </p>
          </div>

          {/* Total Strength Table (formerly Personnel Strength) */}
          <div className="bg-white/12 backdrop-blur-2xl border border-white/25 rounded-3xl p-5 shadow-[0_12px_35px_rgba(0,0,0,0.2)] text-white">
            <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-white/15">
              <h3 className="text-[1rem] font-bold text-white">
                Total Strength
              </h3>
              {isFleetOfficerOrAdmin && (
                <button
                  onClick={openStrengthModal}
                  className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/15 flex items-center gap-1 text-xs font-semibold cursor-pointer transition-colors"
                  title="Edit Total Strength Numbers"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Edit</span>
                </button>
              )}
            </div>
            <table className="w-full border-collapse mt-2.5 text-center text-sm border border-white/20">
              <thead>
                <tr className="bg-white/10 font-bold text-white">
                  <th className="border border-white/20 p-2 text-left">BATCH</th>
                  <th className="border border-white/20 p-2">TS</th>
                  <th className="border border-white/20 p-2">TP</th>
                  <th className="border border-white/20 p-2">NYA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/15">
                {strengthRows.map((row) => (
                  <tr key={row.id} className="hover:bg-white/5 transition-colors">
                    <td className="border border-white/20 p-2 text-left font-medium text-white/90">{row.batch}</td>
                    <td className="border border-white/20 p-2 font-mono text-white">{row.ts}</td>
                    <td className="border border-white/20 p-2 font-mono text-white">{row.tp}</td>
                    <td className="border border-white/20 p-2 font-mono text-white">{row.nya}</td>
                  </tr>
                ))}
                <tr className="font-bold bg-white/15 text-white">
                  <td className="border border-white/20 p-2 text-left">TOTAL</td>
                  <td className="border border-white/20 p-2 font-mono">{totalTS}</td>
                  <td className="border border-white/20 p-2 font-mono">{totalTP}</td>
                  <td className="border border-white/20 p-2 font-mono">{totalNYA}</td>
                </tr>
              </tbody>
            </table>
            <p className="text-[0.75rem] text-white/60 text-right mt-2 font-mono font-medium">
              AS OF: {strengthAsOf || currentMilitary || '0800H'}
            </p>
          </div>
        </div>
      </div>

      {/* Edit / Add Activity Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-slate-900/85 backdrop-blur-3xl rounded-3xl border border-white/25 shadow-[0_25px_60px_rgba(0,0,0,0.6)] p-6 text-white">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-white/60 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/15">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
                <Edit2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {editingActivity ? 'Edit Daily Activity' : 'Add Daily Activity'}
                </h3>
                <p className="text-xs text-white/60">Configure routine schedule and military time</p>
              </div>
            </div>

            <form onSubmit={handleSaveActivity} className="space-y-4 text-xs">
              <div>
                <label className="block text-white/80 font-semibold mb-1">Activity Name *</label>
                <input
                  type="text"
                  required
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g. MORNING COLORS & CEREMONIAL DRILL"
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-blue-400 focus:bg-white/15 transition-all font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/80 font-semibold mb-1">Start Time (Military) *</label>
                  <input
                    type="text"
                    required
                    value={startTimeInput}
                    onChange={(e) => setStartTimeInput(e.target.value)}
                    placeholder="e.g. 0630H or 06:30"
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-blue-400 focus:bg-white/15 transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="block text-white/80 font-semibold mb-1">End Time</label>
                  <input
                    type="text"
                    value={endTimeInput}
                    onChange={(e) => setEndTimeInput(e.target.value)}
                    placeholder="e.g. 0730H or 07:30"
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-blue-400 focus:bg-white/15 transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white/80 font-semibold mb-1">Location</label>
                <input
                  type="text"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  placeholder="e.g. Parade Ground / Mess Hall"
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-blue-400 focus:bg-white/15 transition-all"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/15">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl font-medium cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-[0_4px_16px_rgba(37,99,235,0.4)] border border-blue-400/30 cursor-pointer transition-all"
                >
                  {editingActivity ? 'Save Changes' : 'Create Activity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Uniform Requirements Modal */}
      {isUniformModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-slate-900/85 backdrop-blur-3xl rounded-3xl border border-white/25 shadow-[0_25px_60px_rgba(0,0,0,0.6)] p-6 text-white max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsUniformModalOpen(false)}
              className="absolute top-5 right-5 text-white/60 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/15">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
                <Edit2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Edit Uniform Requirements
                </h3>
                <p className="text-xs text-white/60">
                  Configure daily attire and enrichment uniform directives
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveUniform} className="space-y-4 text-xs">
              {/* Primary Uniform */}
              <div className="p-3 bg-blue-600/20 rounded-2xl border border-blue-400/30 space-y-2">
                <div>
                  <label className="block text-blue-200 font-bold mb-1">
                    Primary Uniform Label
                  </label>
                  <input
                    type="text"
                    required
                    value={primaryLabelInput}
                    onChange={(e) => setPrimaryLabelInput(e.target.value)}
                    placeholder="e.g. UNIFORM OF THE DAY"
                    className="w-full px-2.5 py-1.5 bg-white/10 border border-white/20 rounded-xl text-white font-semibold focus:outline-none focus:border-blue-400 text-xs uppercase"
                  />
                </div>
                <div>
                  <label className="block text-blue-200 font-bold mb-1">
                    Attire / Attire Details *
                  </label>
                  <input
                    type="text"
                    required
                    value={primaryValueInput}
                    onChange={(e) => setPrimaryValueInput(e.target.value)}
                    placeholder="e.g. NAVY BLUE SHIRT W/ JEANS"
                    className="w-full px-2.5 py-1.5 bg-white/10 border border-white/20 rounded-xl text-white font-bold focus:outline-none focus:border-blue-400 text-xs uppercase"
                  />
                </div>
              </div>

              {/* Secondary / Enrichment Uniform */}
              <div className="p-3 bg-emerald-600/20 rounded-2xl border border-emerald-400/30 space-y-2">
                <div>
                  <label className="block text-emerald-200 font-bold mb-1">
                    Secondary Uniform Label
                  </label>
                  <input
                    type="text"
                    required
                    value={secondaryLabelInput}
                    onChange={(e) => setSecondaryLabelInput(e.target.value)}
                    placeholder="e.g. ENRICHMENT UNIFORM OF THE DAY"
                    className="w-full px-2.5 py-1.5 bg-white/10 border border-white/20 rounded-xl text-white font-semibold focus:outline-none focus:border-emerald-400 text-xs uppercase"
                  />
                </div>
                <div>
                  <label className="block text-emerald-200 font-bold mb-1">
                    Attire / Attire Details *
                  </label>
                  <input
                    type="text"
                    required
                    value={secondaryValueInput}
                    onChange={(e) => setSecondaryValueInput(e.target.value)}
                    placeholder="e.g. ANY ATHLETIC ATTIRE"
                    className="w-full px-2.5 py-1.5 bg-white/10 border border-white/20 rounded-xl text-white font-bold focus:outline-none focus:border-emerald-400 text-xs uppercase"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/15">
                <button
                  type="button"
                  onClick={() => setIsUniformModalOpen(false)}
                  className="px-4 py-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl border border-white/15 font-medium cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-[0_4px_16px_rgba(37,99,235,0.4)] border border-blue-400/30 cursor-pointer transition-all"
                >
                  Save Uniforms
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Fleet Modal */}
      {isFleetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl bg-slate-900/85 backdrop-blur-3xl rounded-3xl border border-white/25 shadow-[0_25px_60px_rgba(0,0,0,0.6)] p-6 text-white max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsFleetModalOpen(false)}
              className="absolute top-5 right-5 text-white/60 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/15">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
                <Edit2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Edit Fleet Section
                </h3>
                <p className="text-xs text-white/60">
                  Update column titles, names list, and aboard cadet notes
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveFleet} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {/* Column 1 */}
                <div className="p-3 bg-white/5 rounded-2xl border border-white/15 space-y-2">
                  <div>
                    <label className="block text-blue-200 font-bold mb-1">
                      Column 1 Title
                    </label>
                    <input
                      type="text"
                      value={sec1TitleInput}
                      onChange={(e) => setSec1TitleInput(e.target.value)}
                      placeholder="e.g. CADET CANDIDATES"
                      className="w-full px-2.5 py-1.5 bg-white/10 border border-white/20 rounded-xl text-white font-semibold focus:outline-none focus:border-blue-400 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-white/70 font-medium mb-1">
                      Names / Lines
                    </label>
                    <textarea
                      rows={6}
                      value={sec1NamesInput}
                      onChange={(e) => setSec1NamesInput(e.target.value)}
                      placeholder="e.g. BATCH 3"
                      className="w-full px-2.5 py-1.5 bg-white/10 border border-white/20 rounded-xl text-white font-medium focus:outline-none focus:border-blue-400 text-xs resize-none font-mono"
                    />
                  </div>
                </div>

                {/* Column 2 */}
                <div className="p-3 bg-white/5 rounded-2xl border border-white/15 space-y-2">
                  <div>
                    <label className="block text-blue-200 font-bold mb-1">
                      Column 2 Title
                    </label>
                    <input
                      type="text"
                      value={sec2TitleInput}
                      onChange={(e) => setSec2TitleInput(e.target.value)}
                      placeholder="e.g. CADET TRAINER"
                      className="w-full px-2.5 py-1.5 bg-white/10 border border-white/20 rounded-xl text-white font-semibold focus:outline-none focus:border-blue-400 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-white/70 font-medium mb-1">
                      Names (1 per line)
                    </label>
                    <textarea
                      rows={6}
                      value={sec2NamesInput}
                      onChange={(e) => setSec2NamesInput(e.target.value)}
                      placeholder="OLIVAR&#10;OCDP&#10;BERINGUELA&#10;BALUCOS&#10;GO"
                      className="w-full px-2.5 py-1.5 bg-white/10 border border-white/20 rounded-xl text-white font-medium focus:outline-none focus:border-blue-400 text-xs resize-none font-mono"
                    />
                  </div>
                </div>

                {/* Column 3 */}
                <div className="p-3 bg-white/5 rounded-2xl border border-white/15 space-y-2">
                  <div>
                    <label className="block text-blue-200 font-bold mb-1">
                      Column 3 Title
                    </label>
                    <input
                      type="text"
                      value={sec3TitleInput}
                      onChange={(e) => setSec3TitleInput(e.target.value)}
                      placeholder="e.g. SLDP"
                      className="w-full px-2.5 py-1.5 bg-white/10 border border-white/20 rounded-xl text-white font-semibold focus:outline-none focus:border-blue-400 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-white/70 font-medium mb-1">
                      Names (1 per line)
                    </label>
                    <textarea
                      rows={6}
                      value={sec3NamesInput}
                      onChange={(e) => setSec3NamesInput(e.target.value)}
                      placeholder="BELOLO&#10;DE OCAMPO"
                      className="w-full px-2.5 py-1.5 bg-white/10 border border-white/20 rounded-xl text-white font-medium focus:outline-none focus:border-blue-400 text-xs resize-none font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-white/80 font-semibold mb-1">
                  Footer Note
                </label>
                <input
                  type="text"
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="e.g. ABOARD CADETS"
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-blue-400 text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/15">
                <button
                  type="button"
                  onClick={() => setIsFleetModalOpen(false)}
                  className="px-4 py-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl border border-white/15 font-medium cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-[0_4px_16px_rgba(37,99,235,0.4)] border border-blue-400/30 cursor-pointer transition-all"
                >
                  Save Fleet Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Duty Personnel Modal */}
      {isDutyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-slate-900/85 backdrop-blur-3xl rounded-3xl border border-white/25 shadow-[0_25px_60px_rgba(0,0,0,0.6)] p-6 text-white max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsDutyModalOpen(false)}
              className="absolute top-5 right-5 text-white/60 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/15">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
                <Edit2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Edit Duty Personnel
                </h3>
                <p className="text-xs text-white/60">
                  Updates watch bill stations (matches Duties tab)
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveDuty} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-white/80 font-semibold mb-1">
                  Formation Officer of the Day (FOD)
                </label>
                <input
                  type="text"
                  value={fodInput}
                  onChange={(e) => setFodInput(e.target.value)}
                  placeholder="e.g. LTJG. EDUARDO DELA CRUZ"
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-blue-400 font-medium"
                />
              </div>

              <div>
                <label className="block text-white/80 font-semibold mb-1">
                  COOW Name
                </label>
                <input
                  type="text"
                  value={coowInput}
                  onChange={(e) => setCoowInput(e.target.value)}
                  placeholder="e.g. CDT. NAVIDAD"
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-blue-400 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-white/80 font-semibold mb-1">
                    ACOOW (1)
                  </label>
                  <input
                    type="text"
                    value={acoow1Input}
                    onChange={(e) => setAcoow1Input(e.target.value)}
                    placeholder="e.g. CDT. PASCUA"
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-blue-400 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-white/80 font-semibold mb-1">
                    ACOOW (2)
                  </label>
                  <input
                    type="text"
                    value={acoow2Input}
                    onChange={(e) => setAcoow2Input(e.target.value)}
                    placeholder="e.g. CDT. SANTOS"
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-blue-400 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white/80 font-semibold mb-1">
                  MOOW Name
                </label>
                <input
                  type="text"
                  value={moowInput}
                  onChange={(e) => setMoowInput(e.target.value)}
                  placeholder="e.g. CDT. REYES"
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-blue-400 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-white/80 font-semibold mb-1">
                    AMOOW (1)
                  </label>
                  <input
                    type="text"
                    value={amoow1Input}
                    onChange={(e) => setAmoow1Input(e.target.value)}
                    placeholder="e.g. CDT. MENDOZA"
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-blue-400 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-white/80 font-semibold mb-1">
                    AMOOW (2)
                  </label>
                  <input
                    type="text"
                    value={amoow2Input}
                    onChange={(e) => setAmoow2Input(e.target.value)}
                    placeholder="e.g. CDT. GARCIA"
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-blue-400 font-medium"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/15">
                <button
                  type="button"
                  onClick={() => setIsDutyModalOpen(false)}
                  className="px-4 py-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl border border-white/15 font-medium cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-[0_4px_16px_rgba(37,99,235,0.4)] border border-blue-400/30 cursor-pointer transition-all"
                >
                  Save Duties
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Total Strength Modal */}
      {isStrengthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-slate-900/85 backdrop-blur-3xl rounded-3xl border border-white/25 shadow-[0_25px_60px_rgba(0,0,0,0.6)] p-6 text-white max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsStrengthModalOpen(false)}
              className="absolute top-5 right-5 text-white/60 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/15">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
                <Edit2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Edit Total Strength
                </h3>
                <p className="text-xs text-white/60">
                  Configure batch counts: Total Strength (TS), Present (TP), and Not Yet Aboard (NYA)
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveStrength} className="space-y-4 text-xs">
              <div className="space-y-3">
                <div className="grid grid-cols-12 gap-2 text-[11px] font-bold text-white/70 uppercase px-1">
                  <div className="col-span-5">Batch / Category</div>
                  <div className="col-span-2 text-center">TS</div>
                  <div className="col-span-2 text-center">TP</div>
                  <div className="col-span-2 text-center">NYA</div>
                  <div className="col-span-1"></div>
                </div>

                {editingRows.map((row, idx) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-12 gap-2 items-center bg-white/5 p-2 rounded-2xl border border-white/15"
                  >
                    <div className="col-span-5">
                      <input
                        type="text"
                        required
                        value={row.batch}
                        onChange={(e) => handleRowChange(idx, 'batch', e.target.value)}
                        placeholder="Batch name"
                        className="w-full px-2.5 py-1.5 bg-white/10 border border-white/20 rounded-xl text-white font-medium focus:outline-none focus:border-blue-400 text-xs"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        min="0"
                        value={row.ts}
                        onChange={(e) => handleRowChange(idx, 'ts', e.target.value)}
                        className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded-xl text-white font-mono text-center focus:outline-none focus:border-blue-400 text-xs"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        min="0"
                        value={row.tp}
                        onChange={(e) => handleRowChange(idx, 'tp', e.target.value)}
                        className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded-xl text-white font-mono text-center focus:outline-none focus:border-blue-400 text-xs"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        min="0"
                        value={row.nya}
                        onChange={(e) => handleRowChange(idx, 'nya', e.target.value)}
                        className="w-full px-2 py-1.5 bg-white/10 border border-white/20 rounded-xl text-white font-mono text-center focus:outline-none focus:border-blue-400 text-xs"
                      />
                    </div>
                    <div className="col-span-1 text-center">
                      {editingRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(idx)}
                          className="p-1 text-white/40 hover:text-red-400 rounded cursor-pointer"
                          title="Remove row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="px-3 py-1.5 text-xs font-semibold text-blue-300 hover:text-white bg-blue-600/30 hover:bg-blue-600/50 border border-blue-400/30 rounded-xl flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ Add Batch Row</span>
                </button>

                <div className="flex items-center gap-2">
                  <label className="text-white/70 font-medium">As Of Time:</label>
                  <input
                    type="text"
                    value={editingAsOf}
                    onChange={(e) => setEditingAsOf(e.target.value)}
                    placeholder="e.g. 0800H"
                    className="w-24 px-2 py-1 bg-white/10 border border-white/20 rounded-xl text-white font-mono text-center text-xs"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-white/15">
                <button
                  type="button"
                  onClick={() => setIsStrengthModalOpen(false)}
                  className="px-4 py-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl border border-white/15 font-medium cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-[0_4px_16px_rgba(37,99,235,0.4)] border border-blue-400/30 cursor-pointer transition-all"
                >
                  Save Strength
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT STANDING ORDERS MODAL */}
      {isStandingOrdersModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-slate-900/90 backdrop-blur-3xl rounded-3xl border border-white/25 shadow-[0_25px_60px_rgba(0,0,0,0.6)] p-6 text-white max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsStandingOrdersModalOpen(false)}
              className="absolute top-5 right-5 text-white/60 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/15">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Edit Academy Standing Orders
                </h3>
                <p className="text-xs text-white/60">Add, update, or remove standing bullet directives</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              {/* Add New Order Input */}
              <div className="p-3 bg-white/10 rounded-2xl border border-white/15 space-y-2">
                <label className="block text-white/80 font-bold text-[11px] uppercase tracking-wider">
                  + Add New Standing Order
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newOrderInput}
                    onChange={(e) => setNewOrderInput(e.target.value)}
                    placeholder="Enter order text e.g. Taps and Lights Out at 2200H..."
                    className="flex-1 px-3.5 py-2 bg-black/30 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-blue-400 text-xs font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newOrderInput.trim()) return;
                      setTempStandingOrders([...tempStandingOrders, newOrderInput.trim()]);
                      setNewOrderInput('');
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs transition-all border border-blue-400/40 cursor-pointer shrink-0"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* List of current orders */}
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                <label className="block text-white/80 font-bold text-[11px] uppercase tracking-wider">
                  Current Orders ({tempStandingOrders.length})
                </label>

                {tempStandingOrders.map((order, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-white/5 rounded-xl border border-white/10">
                    <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-300 font-bold flex items-center justify-center text-[10px] shrink-0 font-mono">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={order}
                      onChange={(e) => {
                        const updated = [...tempStandingOrders];
                        updated[idx] = e.target.value;
                        setTempStandingOrders(updated);
                      }}
                      className="flex-1 px-3 py-1.5 bg-black/30 border border-white/15 rounded-lg text-white text-xs font-medium focus:outline-none focus:border-blue-400"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setTempStandingOrders(tempStandingOrders.filter((_, i) => i !== idx));
                      }}
                      className="p-1.5 text-red-300 hover:text-white hover:bg-red-500/20 rounded-lg transition-colors cursor-pointer shrink-0"
                      title="Delete Order"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/15">
                <button
                  type="button"
                  onClick={() => setIsStandingOrdersModalOpen(false)}
                  className="px-4 py-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 border border-white/15 rounded-full font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const cleanOrders = tempStandingOrders.filter((o) => o.trim().length > 0);
                    await updateStandingOrders(cleanOrders);
                    setIsStandingOrdersModalOpen(false);
                  }}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-full shadow-[0_4px_16px_rgba(37,99,235,0.4)] border border-blue-400/30 transition-all cursor-pointer"
                >
                  Save Standing Orders
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
