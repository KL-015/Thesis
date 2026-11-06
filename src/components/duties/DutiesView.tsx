import React, { useState } from 'react';
import { useFleet } from '../../context/FleetContext';
import { Edit2, X, Check } from 'lucide-react';

export const DutiesView: React.FC<{ onOpenLogin: () => void }> = ({ onOpenLogin }) => {
  const { dutyRoster, updateDutyItem, canEditDuties: isFleetOfficerOrAdmin } = useFleet();

  const todayStr = new Date().toISOString().split('T')[0];
  const currentDuty = dutyRoster.find((d) => d.date === todayStr) || dutyRoster[0] || {
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

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Form input states
  const [fodInput, setFodInput] = useState(currentDuty.fod || '');
  const [coowInput, setCoowInput] = useState(currentDuty.coow || '');
  const [acoow1Input, setAcoow1Input] = useState(currentDuty.acoow1 || currentDuty.acwo || '');
  const [acoow2Input, setAcoow2Input] = useState(currentDuty.acoow2 || '');
  const [moowInput, setMoowInput] = useState(currentDuty.moow || '');
  const [amoow1Input, setAmoow1Input] = useState(currentDuty.amoow1 || '');
  const [amoow2Input, setAmoow2Input] = useState(currentDuty.amoow2 || '');
  const [stationInput, setStationInput] = useState(currentDuty.station || 'Quarterdeck Main Desk');

  const openEditModal = () => {
    setFodInput(currentDuty.fod || '');
    setCoowInput(currentDuty.coow || '');
    setAcoow1Input(currentDuty.acoow1 || currentDuty.acwo || '');
    setAcoow2Input(currentDuty.acoow2 || '');
    setMoowInput(currentDuty.moow || '');
    setAmoow1Input(currentDuty.amoow1 || '');
    setAmoow2Input(currentDuty.amoow2 || '');
    setStationInput(currentDuty.station || 'Quarterdeck Main Desk');
    setIsEditModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateDutyItem(currentDuty.id, {
      fod: fodInput.trim(),
      coow: coowInput.trim(),
      acoow1: acoow1Input.trim(),
      acoow2: acoow2Input.trim(),
      acwo: acoow1Input.trim(), // sync for backward compatibility
      moow: moowInput.trim(),
      amoow1: amoow1Input.trim(),
      amoow2: amoow2Input.trim(),
      station: stationInput.trim(),
    });
    setIsEditModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto text-white">
      {/* Title & Actions - Frosted Glass Container */}
      <div className="p-6 sm:p-7 bg-white/12 backdrop-blur-2xl rounded-3xl border border-white/25 shadow-[0_15px_40px_rgba(0,0,0,0.25)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Duties &amp; Watch Bill</h1>
          <p className="text-xs sm:text-sm text-white/75 mt-1 max-w-lg">
            Quarterdeck duty stations: FOD, COOW, and MOOW.
          </p>
        </div>

        {isFleetOfficerOrAdmin && (
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              onClick={openEditModal}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-full flex items-center gap-2 transition-all duration-200 shadow-[0_4px_16px_rgba(37,99,235,0.45)] border border-blue-400/40 cursor-pointer"
            >
              <Edit2 className="w-4 h-4" />
              <span>Edit Officers On Watch</span>
            </button>
          </div>
        )}
      </div>

      {/* 3 PANELS ONLY: FOD | COOW | MOOW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {/* PANEL 1: FOD */}
        <div className="p-6 bg-white/12 backdrop-blur-2xl rounded-3xl border border-white/25 shadow-[0_15px_40px_rgba(0,0,0,0.25)] space-y-4 text-white">
          <div className="flex items-center justify-between pb-3 border-b border-white/15">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
              <h2 className="text-lg font-bold tracking-wider text-white uppercase">FOD</h2>
            </div>
            <span className="text-[11px] font-semibold text-blue-200 bg-blue-500/20 px-3 py-0.5 rounded-full border border-blue-400/30">
              Officer of the Day
            </span>
          </div>

          {/* Slot where the FOD name goes */}
          <div className="space-y-1.5">
            <span className="text-[11px] uppercase font-bold tracking-wider text-white/70 block">
              FOD
            </span>
            <div
              onClick={isFleetOfficerOrAdmin ? openEditModal : undefined}
              className={`p-5 rounded-2xl border transition-all ${
                isFleetOfficerOrAdmin
                  ? 'hover:border-blue-400/80 hover:bg-white/15 cursor-pointer'
                  : ''
              } ${
                currentDuty.fod
                  ? 'bg-white/10 border-white/20'
                  : 'bg-amber-500/10 border-dashed border-amber-400/40'
              }`}
            >
              {currentDuty.fod ? (
                <div className="space-y-1">
                  <p className="text-base sm:text-lg font-bold text-white tracking-wide font-sans leading-tight">
                    {currentDuty.fod}
                  </p>
                  <p className="text-[11px] text-white/70 font-medium">Formation Officer of the Day</p>
                </div>
              ) : (
                <p className="text-xs text-white/50 italic py-2">
                  {isFleetOfficerOrAdmin ? '[ Empty · Click to assign FOD ]' : '[ Unassigned ]'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* PANEL 2: COOW */}
        <div className="p-6 bg-white/12 backdrop-blur-2xl rounded-3xl border border-white/25 shadow-[0_15px_40px_rgba(0,0,0,0.25)] space-y-4 text-white">
          <div className="flex items-center justify-between pb-3 border-b border-white/15">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]" />
              <h2 className="text-lg font-bold tracking-wider text-white uppercase">COOW</h2>
            </div>
            <span className="text-[11px] font-semibold text-indigo-200 bg-indigo-500/20 px-3 py-0.5 rounded-full border border-indigo-400/30">
              Cadet Watch
            </span>
          </div>

          {/* 3 Sub-Panels: COOW, ACOOW, ACOOW */}
          <div className="space-y-3">
            {/* Row 1: COOW */}
            <div className="space-y-1">
              <span className="text-[11px] uppercase font-bold tracking-wider text-white/70 block">
                COOW
              </span>
              <div
                onClick={isFleetOfficerOrAdmin ? openEditModal : undefined}
                className={`p-3.5 rounded-2xl border transition-all ${
                  isFleetOfficerOrAdmin ? 'hover:border-indigo-400/80 hover:bg-white/15 cursor-pointer' : ''
                } ${
                  currentDuty.coow
                    ? 'bg-white/10 border-white/20'
                    : 'bg-amber-500/10 border-dashed border-amber-400/40'
                }`}
              >
                <p className="text-sm font-bold text-white">
                  {currentDuty.coow || (
                    <span className="text-white/50 font-normal italic">
                      {isFleetOfficerOrAdmin ? '[ Empty · Enter Name ]' : '[ Unassigned ]'}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Row 2: ACOOW */}
            <div className="space-y-1">
              <span className="text-[11px] uppercase font-bold tracking-wider text-white/70 block">
                ACOOW
              </span>
              <div
                onClick={isFleetOfficerOrAdmin ? openEditModal : undefined}
                className={`p-3.5 rounded-2xl border transition-all ${
                  isFleetOfficerOrAdmin ? 'hover:border-indigo-400/80 hover:bg-white/15 cursor-pointer' : ''
                } ${
                  currentDuty.acoow1
                    ? 'bg-white/10 border-white/20'
                    : 'bg-amber-500/10 border-dashed border-amber-400/40'
                }`}
              >
                <p className="text-sm font-bold text-white">
                  {currentDuty.acoow1 || (
                    <span className="text-white/50 font-normal italic">
                      {isFleetOfficerOrAdmin ? '[ Empty · Enter Name ]' : '[ Unassigned ]'}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Row 3: ACOOW */}
            <div className="space-y-1">
              <span className="text-[11px] uppercase font-bold tracking-wider text-white/70 block">
                ACOOW
              </span>
              <div
                onClick={isFleetOfficerOrAdmin ? openEditModal : undefined}
                className={`p-3.5 rounded-2xl border transition-all ${
                  isFleetOfficerOrAdmin ? 'hover:border-indigo-400/80 hover:bg-white/15 cursor-pointer' : ''
                } ${
                  currentDuty.acoow2
                    ? 'bg-white/10 border-white/20'
                    : 'bg-amber-500/10 border-dashed border-amber-400/40'
                }`}
              >
                <p className="text-sm font-bold text-white">
                  {currentDuty.acoow2 || (
                    <span className="text-white/50 font-normal italic">
                      {isFleetOfficerOrAdmin ? '[ Empty · Enter Name ]' : '[ Unassigned ]'}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* PANEL 3: MOOW */}
        <div className="p-6 bg-white/12 backdrop-blur-2xl rounded-3xl border border-white/25 shadow-[0_15px_40px_rgba(0,0,0,0.25)] space-y-4 text-white">
          <div className="flex items-center justify-between pb-3 border-b border-white/15">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
              <h2 className="text-lg font-bold tracking-wider text-white uppercase">MOOW</h2>
            </div>
            <span className="text-[11px] font-semibold text-cyan-200 bg-cyan-500/20 px-3 py-0.5 rounded-full border border-cyan-400/30">
              Mate Watch
            </span>
          </div>

          {/* 3 Sub-Panels: MOOW, AMOOW, AMOOW */}
          <div className="space-y-3">
            {/* Row 1: MOOW */}
            <div className="space-y-1">
              <span className="text-[11px] uppercase font-bold tracking-wider text-white/70 block">
                MOOW
              </span>
              <div
                onClick={isFleetOfficerOrAdmin ? openEditModal : undefined}
                className={`p-3.5 rounded-2xl border transition-all ${
                  isFleetOfficerOrAdmin ? 'hover:border-cyan-400/80 hover:bg-white/15 cursor-pointer' : ''
                } ${
                  currentDuty.moow
                    ? 'bg-white/10 border-white/20'
                    : 'bg-amber-500/10 border-dashed border-amber-400/40'
                }`}
              >
                <p className="text-sm font-bold text-white">
                  {currentDuty.moow || (
                    <span className="text-white/50 font-normal italic">
                      {isFleetOfficerOrAdmin ? '[ Empty · Enter Name ]' : '[ Unassigned ]'}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Row 2: AMOOW */}
            <div className="space-y-1">
              <span className="text-[11px] uppercase font-bold tracking-wider text-white/70 block">
                AMOOW
              </span>
              <div
                onClick={isFleetOfficerOrAdmin ? openEditModal : undefined}
                className={`p-3.5 rounded-2xl border transition-all ${
                  isFleetOfficerOrAdmin ? 'hover:border-cyan-400/80 hover:bg-white/15 cursor-pointer' : ''
                } ${
                  currentDuty.amoow1
                    ? 'bg-white/10 border-white/20'
                    : 'bg-amber-500/10 border-dashed border-amber-400/40'
                }`}
              >
                <p className="text-sm font-bold text-white">
                  {currentDuty.amoow1 || (
                    <span className="text-white/50 font-normal italic">
                      {isFleetOfficerOrAdmin ? '[ Empty · Enter Name ]' : '[ Unassigned ]'}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Row 3: AMOOW */}
            <div className="space-y-1">
              <span className="text-[11px] uppercase font-bold tracking-wider text-white/70 block">
                AMOOW
              </span>
              <div
                onClick={isFleetOfficerOrAdmin ? openEditModal : undefined}
                className={`p-3.5 rounded-2xl border transition-all ${
                  isFleetOfficerOrAdmin ? 'hover:border-cyan-400/80 hover:bg-white/15 cursor-pointer' : ''
                } ${
                  currentDuty.amoow2
                    ? 'bg-white/10 border-white/20'
                    : 'bg-amber-500/10 border-dashed border-amber-400/40'
                }`}
              >
                <p className="text-sm font-bold text-white">
                  {currentDuty.amoow2 || (
                    <span className="text-white/50 font-normal italic">
                      {isFleetOfficerOrAdmin ? '[ Empty · Enter Name ]' : '[ Unassigned ]'}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* EDIT MODAL FOR FLEET OFFICER & ADMIN */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl bg-slate-900/90 backdrop-blur-3xl rounded-3xl border border-white/25 shadow-[0_25px_60px_rgba(0,0,0,0.6)] p-6 sm:p-7 text-white max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-6 right-6 text-white/60 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-5 pb-3 border-b border-white/15">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
                <Edit2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Edit Officers On Watch</h2>
                <p className="text-xs text-white/70">Update names for FOD, COOW, and MOOW stations</p>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-5 text-xs">
              {/* Panel 1 Inputs: FOD */}
              <div className="p-4 bg-white/10 rounded-2xl border border-white/15 space-y-3">
                <span className="font-bold text-blue-300 uppercase text-[11px] block">
                  Panel 1: FOD (Formation Officer of the Day)
                </span>
                <div>
                  <label className="block text-white/80 font-medium mb-1">FOD Name</label>
                  <input
                    type="text"
                    value={fodInput}
                    onChange={(e) => setFodInput(e.target.value)}
                    placeholder="e.g. LTJG. EDUARDO DELA CRUZ"
                    className="w-full px-3.5 py-2.5 bg-white/12 border border-white/20 rounded-xl text-white placeholder-white/45 focus:outline-none focus:border-blue-400 transition-all font-medium"
                  />
                </div>
              </div>

              {/* Panel 2 Inputs: COOW */}
              <div className="p-4 bg-white/10 rounded-2xl border border-white/15 space-y-3">
                <span className="font-bold text-indigo-300 uppercase text-[11px] block">
                  Panel 2: COOW Station Cadets
                </span>
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-white/80 font-medium mb-1">COOW Name</label>
                    <input
                      type="text"
                      value={coowInput}
                      onChange={(e) => setCoowInput(e.target.value)}
                      placeholder="e.g. CDT. NAVIDAD"
                      className="w-full px-3.5 py-2.5 bg-white/12 border border-white/20 rounded-xl text-white placeholder-white/45 focus:outline-none focus:border-indigo-400 transition-all font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-white/80 font-medium mb-1">ACOOW Name (1)</label>
                    <input
                      type="text"
                      value={acoow1Input}
                      onChange={(e) => setAcoow1Input(e.target.value)}
                      placeholder="e.g. CDT. PASCUA"
                      className="w-full px-3.5 py-2.5 bg-white/12 border border-white/20 rounded-xl text-white placeholder-white/45 focus:outline-none focus:border-indigo-400 transition-all font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-white/80 font-medium mb-1">ACOOW Name (2)</label>
                    <input
                      type="text"
                      value={acoow2Input}
                      onChange={(e) => setAcoow2Input(e.target.value)}
                      placeholder="e.g. CDT. SANTOS"
                      className="w-full px-3.5 py-2.5 bg-white/12 border border-white/20 rounded-xl text-white placeholder-white/45 focus:outline-none focus:border-indigo-400 transition-all font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Panel 3 Inputs: MOOW */}
              <div className="p-4 bg-white/10 rounded-2xl border border-white/15 space-y-3">
                <span className="font-bold text-cyan-300 uppercase text-[11px] block">
                  Panel 3: MOOW Station Cadets
                </span>
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-white/80 font-medium mb-1">MOOW Name</label>
                    <input
                      type="text"
                      value={moowInput}
                      onChange={(e) => setMoowInput(e.target.value)}
                      placeholder="e.g. CDT. REYES"
                      className="w-full px-3.5 py-2.5 bg-white/12 border border-white/20 rounded-xl text-white placeholder-white/45 focus:outline-none focus:border-cyan-400 transition-all font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-white/80 font-medium mb-1">AMOOW Name (1)</label>
                    <input
                      type="text"
                      value={amoow1Input}
                      onChange={(e) => setAmoow1Input(e.target.value)}
                      placeholder="e.g. CDT. MENDOZA"
                      className="w-full px-3.5 py-2.5 bg-white/12 border border-white/20 rounded-xl text-white placeholder-white/45 focus:outline-none focus:border-cyan-400 transition-all font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-white/80 font-medium mb-1">AMOOW Name (2)</label>
                    <input
                      type="text"
                      value={amoow2Input}
                      onChange={(e) => setAmoow2Input(e.target.value)}
                      placeholder="e.g. CDT. GARCIA"
                      className="w-full px-3.5 py-2.5 bg-white/12 border border-white/20 rounded-xl text-white placeholder-white/45 focus:outline-none focus:border-cyan-400 transition-all font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/15">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 text-white/70 hover:text-white rounded-full font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-full shadow-[0_4px_16px_rgba(37,99,235,0.45)] border border-blue-400/40 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Officers On Watch</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
