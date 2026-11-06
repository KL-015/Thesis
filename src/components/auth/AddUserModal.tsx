import React, { useState } from 'react';
import { useFleet } from '../../context/FleetContext';
import { UserPermissions } from '../../types';
import {
  UserPlus,
  X,
  Mail,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  CheckSquare,
  Square,
} from 'lucide-react';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddUserModal: React.FC<AddUserModalProps> = ({ isOpen, onClose }) => {
  const { createUserAccount, isAdmin } = useFleet();

  const [title, setTitle] = useState('Officer On Watch');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  
  // Granular function permissions state
  const [permissions, setPermissions] = useState<UserPermissions>({
    canAddCalendarEvents: true,
    canUploadMemos: true,
    canPostAnnouncements: true,
    canEditDuties: true,
    canEditDailyActivities: true,
    canConductMustering: true,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const quickTitles = [
    'Officer On Watch',
    'Fleet Operations Officer',
    'Duty Watch Officer',
    'Tactical Schedule Officer',
  ];

  const allSelected =
    permissions.canAddCalendarEvents &&
    permissions.canUploadMemos &&
    permissions.canPostAnnouncements &&
    permissions.canEditDuties &&
    permissions.canEditDailyActivities &&
    permissions.canConductMustering;

  const toggleSelectAll = () => {
    const nextState = !allSelected;
    setPermissions({
      canAddCalendarEvents: nextState,
      canUploadMemos: nextState,
      canPostAnnouncements: nextState,
      canEditDuties: nextState,
      canEditDailyActivities: nextState,
      canConductMustering: nextState,
    });
  };

  const togglePermission = (key: keyof UserPermissions) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanTitle = title.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanTitle) {
      setErrorMsg('Please enter a Title or Rank for the user.');
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    const cleanFullName = fullName.trim() || cleanTitle;
    const username = cleanEmail.split('@')[0].replace(/[^a-z0-9_-]/g, '_');

    setIsSaving(true);
    const result = await createUserAccount({
      username,
      email: cleanEmail,
      title: cleanTitle,
      rank: cleanTitle,
      fullName: cleanFullName,
      role: 'fleet_officer',
      isActive: true,
      permissions,
    });
    setIsSaving(false);

    if (result.success) {
      setSuccessMsg(`Officer added successfully! Authorized permissions assigned.`);
      setEmail('');
      setFullName('');
      setTimeout(() => {
        onClose();
        setSuccessMsg(null);
      }, 2000);
    } else {
      setErrorMsg(result.error || 'Failed to add user.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900/90 backdrop-blur-3xl rounded-3xl border border-white/25 shadow-[0_25px_60px_rgba(0,0,0,0.6)] p-6 sm:p-7 text-white max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-white/60 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mb-5">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center justify-center font-bold mb-3 shadow-2xs backdrop-blur-md">
            <UserPlus className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Add Authorized Officer</h2>
          <p className="text-xs text-white/60 mt-1">
            Specify Title, Email, and assign function permissions for this officer.
          </p>
        </div>

        {!isAdmin ? (
          <div className="p-4 bg-amber-500/20 border border-amber-400/30 rounded-2xl text-xs text-amber-200 flex items-center gap-2.5 backdrop-blur-md">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>Only Administrators can add new users. Please sign in as Admin first.</span>
          </div>
        ) : (
          <>
            {errorMsg && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-400/30 rounded-2xl text-xs text-red-200 flex items-center gap-2 backdrop-blur-md">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3.5 bg-emerald-500/25 border border-emerald-400/40 rounded-2xl text-xs text-emerald-200 flex items-start gap-2.5 backdrop-blur-md">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                <span className="font-medium leading-relaxed">{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Title / Rank */}
              <div>
                <label className="block text-white/80 font-semibold mb-1.5 flex items-center justify-between">
                  <span>Title / Duty Rank *</span>
                  <span className="text-[10px] text-white/50 font-normal">e.g. Officer On Watch</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Officer On Watch"
                  className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 text-xs focus:outline-none focus:border-blue-400 focus:bg-white/15 transition-all"
                />

                {/* Quick suggestions */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {quickTitles.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTitle(t)}
                      className={`text-[10px] px-2.5 py-1 rounded-full transition-all border cursor-pointer ${
                        title === t
                          ? 'bg-blue-600 text-white border-blue-400/40 font-semibold shadow-xs'
                          : 'bg-white/10 text-white/70 border-white/15 hover:bg-white/20 hover:text-white'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-white/80 font-semibold mb-1.5 flex items-center justify-between">
                  <span>Email Address *</span>
                  <span className="text-[10px] text-blue-300 font-normal">Saved to Supabase</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-white/40 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. officer@fleet.ops or name@gmail.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 text-xs focus:outline-none focus:border-blue-400 focus:bg-white/15 transition-all font-mono"
                  />
                </div>
                <p className="text-[10px] text-white/50 mt-1">
                  Saved in Supabase database for officer email login.
                </p>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-white/80 font-semibold mb-1.5">
                  Full Name (Optional)
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. LT. DANIEL MARQUEZ (defaults to title if empty)"
                  className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 text-xs focus:outline-none focus:border-blue-400 focus:bg-white/15 transition-all"
                />
              </div>

              {/* Function Checkboxes Section */}
              <div className="p-4 bg-white/10 rounded-2xl border border-white/15 space-y-3 backdrop-blur-md">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2 text-blue-200 font-bold">
                    <ShieldCheck className="w-4 h-4 text-blue-400" />
                    <span>Select Authorized Functions</span>
                  </div>

                  {/* Select All Toggle */}
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="flex items-center gap-1 text-[11px] font-semibold text-blue-300 hover:text-white transition-colors cursor-pointer bg-blue-500/20 px-2.5 py-1 rounded-lg border border-blue-400/30"
                  >
                    {allSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                    <span>{allSelected ? 'Deselect All' : 'Select All / Full Access'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2.5 p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 cursor-pointer transition-all">
                    <input
                      type="checkbox"
                      checked={!!permissions.canAddCalendarEvents}
                      onChange={() => togglePermission('canAddCalendarEvents')}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-white/10 border-white/30 cursor-pointer"
                    />
                    <span className="text-white/90 font-medium">Add Calendar Events</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 cursor-pointer transition-all">
                    <input
                      type="checkbox"
                      checked={!!permissions.canUploadMemos}
                      onChange={() => togglePermission('canUploadMemos')}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-white/10 border-white/30 cursor-pointer"
                    />
                    <span className="text-white/90 font-medium">Upload Memos</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 cursor-pointer transition-all">
                    <input
                      type="checkbox"
                      checked={!!permissions.canPostAnnouncements}
                      onChange={() => togglePermission('canPostAnnouncements')}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-white/10 border-white/30 cursor-pointer"
                    />
                    <span className="text-white/90 font-medium">Post Announcements</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 cursor-pointer transition-all">
                    <input
                      type="checkbox"
                      checked={!!permissions.canEditDuties}
                      onChange={() => togglePermission('canEditDuties')}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-white/10 border-white/30 cursor-pointer"
                    />
                    <span className="text-white/90 font-medium">Edit Fleet Duties</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 cursor-pointer transition-all">
                    <input
                      type="checkbox"
                      checked={!!permissions.canEditDailyActivities}
                      onChange={() => togglePermission('canEditDailyActivities')}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-white/10 border-white/30 cursor-pointer"
                    />
                    <span className="text-white/90 font-medium">Edit Daily Activities</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 cursor-pointer transition-all">
                    <input
                      type="checkbox"
                      checked={!!permissions.canConductMustering}
                      onChange={() => togglePermission('canConductMustering')}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-white/10 border-white/30 cursor-pointer"
                    />
                    <span className="text-white/90 font-medium">Mustering &amp; Officer Announcements</span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/15">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full font-medium transition-colors border border-white/15 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-full shadow-[0_4px_16px_rgba(37,99,235,0.4)] border border-blue-400/30 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving to Supabase...' : 'Add User'}</span>
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

