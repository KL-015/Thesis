import React, { useState } from 'react';
import { useFleet } from '../../context/FleetContext';
import { UserAccount, UserRole, UserPermissions } from '../../types';
import {
  UserPlus,
  Edit2,
  Trash2,
  X,
  Lock,
  Shield,
  Mail,
  ShieldCheck,
  CheckSquare,
  Square,
} from 'lucide-react';

export const AccountManagementView: React.FC<{ onOpenLogin: () => void }> = ({ onOpenLogin }) => {
  const {
    users,
    createUserAccount,
    updateUserAccount,
    deleteUserAccount,
    isAdmin,
    currentUser,
  } = useFleet();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);

  const [title, setTitle] = useState('Officer On Watch');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('fleet_officer');
  
  const [permissions, setPermissions] = useState<UserPermissions>({
    canAddCalendarEvents: true,
    canUploadMemos: true,
    canPostAnnouncements: true,
    canEditDuties: true,
    canEditDailyActivities: true,
    canConductMustering: true,
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isAdmin) {
    return (
      <div className="py-20 text-center max-w-md mx-auto space-y-4">
        <div className="w-14 h-14 bg-white/12 backdrop-blur-2xl border border-white/25 rounded-3xl flex items-center justify-center text-blue-300 mx-auto shadow-md">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">Admin Only</h2>
        <p className="text-xs text-white/70 leading-relaxed">
          Account Management is restricted to the Administrator. Cadets browse in read-only mode without accounts.
        </p>
        <button
          onClick={onOpenLogin}
          className="mt-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-full shadow-[0_4px_16px_rgba(37,99,235,0.4)] border border-blue-400/30 transition-all inline-block cursor-pointer"
        >
          Administrator Login
        </button>
      </div>
    );
  }

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

  const openCreateModal = () => {
    setEditingUser(null);
    setTitle('Officer On Watch');
    setEmail('');
    setUsername('');
    setPassword('');
    setFullName('');
    setRole('fleet_officer');
    setPermissions({
      canAddCalendarEvents: true,
      canUploadMemos: true,
      canPostAnnouncements: true,
      canEditDuties: true,
      canEditDailyActivities: true,
      canConductMustering: true,
    });
    setErrorMsg(null);
    setIsCreateOpen(true);
  };

  const openEditModal = (user: UserAccount) => {
    setEditingUser(user);
    setTitle(user.title || user.rank || 'Officer On Watch');
    setEmail(user.email || `${user.username}@fleet.ops`);
    setUsername(user.username);
    setPassword('');
    setFullName(user.fullName);
    setRole(user.role);
    setPermissions(
      user.permissions || {
        canAddCalendarEvents: true,
        canUploadMemos: true,
        canPostAnnouncements: true,
        canEditDuties: true,
        canEditDailyActivities: true,
        canConductMustering: true,
      }
    );
    setErrorMsg(null);
    setIsCreateOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanTitle = title.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanTitle) {
      setErrorMsg('Title / Duty Rank is required.');
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('A valid email address is required.');
      return;
    }

    const cleanFullName = fullName.trim() || cleanTitle;
    const cleanUsername = username.trim() || cleanEmail.split('@')[0].replace(/[^a-z0-9_-]/g, '_');

    if (editingUser) {
      updateUserAccount(editingUser.id, {
        title: cleanTitle,
        rank: cleanTitle,
        email: cleanEmail,
        fullName: cleanFullName,
        role,
        permissions,
        ...(password.trim() ? { password: password.trim() } : {}),
      });
      setIsCreateOpen(false);
    } else {
      const res = await createUserAccount({
        title: cleanTitle,
        rank: cleanTitle,
        email: cleanEmail,
        username: cleanUsername,
        fullName: cleanFullName,
        role,
        isActive: true,
        permissions,
      });

      if (res.success) {
        setIsCreateOpen(false);
      } else {
        setErrorMsg(res.error || 'Failed to create user account.');
      }
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto text-white">
      {/* Title with Glassmorphism */}
      <div className="p-6 sm:p-7 bg-white/12 backdrop-blur-2xl rounded-3xl border border-white/25 shadow-[0_15px_40px_rgba(0,0,0,0.25)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-medium mb-2.5 backdrop-blur-md">
            <Shield className="w-3.5 h-3.5" />
            <span>Administrator Control Center</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Account Management</h1>
          <p className="text-xs text-white/70 mt-1 max-w-lg">
            Add and manage Fleet Officers, assign specific function permissions (Calendar, Memos, Announcements, Duties, Activities, Mustering), and configure officer email sign-in.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-full flex items-center gap-2 transition-all duration-200 shadow-[0_4px_16px_rgba(37,99,235,0.4)] border border-blue-400/30 cursor-pointer self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Add User</span>
        </button>
      </div>

      {/* Rounded Glass Table */}
      <div className="rounded-3xl bg-white/12 backdrop-blur-2xl border border-white/25 shadow-[0_15px_40px_rgba(0,0,0,0.25)] overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-white/15 bg-black/25 text-white/70 font-mono text-[11px] uppercase tracking-wider">
              <th className="py-3.5 px-5 font-bold">Title &amp; Name</th>
              <th className="py-3.5 px-4 font-bold">Email Address</th>
              <th className="py-3.5 px-4 font-bold">Role &amp; Permissions</th>
              <th className="py-3.5 px-5 text-right font-bold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {users.map((u) => {
              const isSelf = currentUser?.id === u.id;
              const p = u.permissions;

              return (
                <tr key={u.id} className="hover:bg-white/10 transition-colors">
                  <td className="py-3.5 px-5">
                    <div className="font-bold text-white text-xs flex items-center gap-1.5">
                      <span>{u.title || u.rank || 'Officer On Watch'}</span>
                      {isSelf && (
                        <span className="text-[10px] text-blue-200 bg-blue-500/25 border border-blue-400/30 px-2 py-0.5 rounded-full font-medium">
                          (You)
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-white/70 font-medium">{u.fullName}</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-blue-300">
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-white/50 shrink-0" />
                      <span>{u.email || `${u.username}@fleet.ops`}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="space-y-1.5">
                      <span
                        className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border backdrop-blur-md inline-block ${
                          u.role === 'admin'
                            ? 'bg-indigo-500/20 text-indigo-200 border-indigo-400/40'
                            : 'bg-blue-500/20 text-blue-200 border-blue-400/40'
                        }`}
                      >
                        {u.role.replace('_', ' ')}
                      </span>

                      {u.role !== 'admin' && (
                        <div className="flex flex-wrap gap-1">
                          {(!p || p.canAddCalendarEvents !== false) && (
                            <span className="text-[9px] bg-white/10 text-white/80 px-1.5 py-0.5 rounded border border-white/15">Calendar</span>
                          )}
                          {(!p || p.canUploadMemos !== false) && (
                            <span className="text-[9px] bg-white/10 text-white/80 px-1.5 py-0.5 rounded border border-white/15">Memos</span>
                          )}
                          {(!p || p.canPostAnnouncements !== false) && (
                            <span className="text-[9px] bg-white/10 text-white/80 px-1.5 py-0.5 rounded border border-white/15">Announce</span>
                          )}
                          {(!p || p.canEditDuties !== false) && (
                            <span className="text-[9px] bg-white/10 text-white/80 px-1.5 py-0.5 rounded border border-white/15">Duties</span>
                          )}
                          {(!p || p.canEditDailyActivities !== false) && (
                            <span className="text-[9px] bg-white/10 text-white/80 px-1.5 py-0.5 rounded border border-white/15">Activities</span>
                          )}
                          {(!p || p.canConductMustering !== false) && (
                            <span className="text-[9px] bg-white/10 text-white/80 px-1.5 py-0.5 rounded border border-white/15">Muster</span>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEditModal(u)}
                        className="p-2 text-white/70 hover:text-white rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition-colors cursor-pointer"
                        title="Edit User & Permissions"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {!isSelf && (
                        <button
                          onClick={async () => {
                            if (confirm(`Remove user ${u.fullName} (${u.email || u.username})?`)) {
                              await deleteUserAccount(u.id);
                            }
                          }}
                          className="p-2 text-white/50 hover:text-red-300 rounded-full bg-white/10 hover:bg-red-500/20 border border-white/20 transition-colors cursor-pointer"
                          title="Delete User"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* CREATE / EDIT ACCOUNT MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-slate-900/90 backdrop-blur-3xl rounded-3xl border border-white/25 shadow-[0_25px_60px_rgba(0,0,0,0.6)] p-6 sm:p-7 text-white max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-6 right-6 text-white/60 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-lg font-bold text-white mb-1">
              {editingUser ? `Edit ${editingUser.fullName}` : 'Add Authorized User'}
            </h2>
            <p className="text-xs text-white/60 mb-4">
              Set title, registered officer email, and grant specific function permissions.
            </p>

            {errorMsg && (
              <div className="mb-3 p-3 bg-red-500/20 border border-red-400/30 text-red-200 rounded-2xl text-xs backdrop-blur-md">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-white/80 font-semibold mb-1.5">
                  Title / Duty Rank *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Officer On Watch or Fleet Operations Officer"
                  className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-blue-400 focus:bg-white/15 transition-all"
                />
              </div>

              <div>
                <label className="block text-white/80 font-semibold mb-1.5 flex items-center justify-between">
                  <span>Email Address *</span>
                  <span className="text-[10px] text-blue-300 font-normal">Officer login key</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-white/40 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. officer@fleet.ops"
                    className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white font-mono placeholder-white/40 focus:outline-none focus:border-blue-400 focus:bg-white/15 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white/80 font-semibold mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. LT. DANIEL MARQUEZ (defaults to Title if empty)"
                  className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-blue-400 focus:bg-white/15 transition-all"
                />
              </div>

              <div>
                <label className="block text-white/80 font-semibold mb-1.5">Role *</label>
                <select
                  value={role}
                  onChange={(e: any) => setRole(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-800 text-white border border-white/20 rounded-xl focus:outline-none focus:border-blue-400 transition-all"
                >
                  <option value="fleet_officer" className="bg-slate-900 text-white">
                    Fleet Officer (Custom function permissions below)
                  </option>
                  <option value="admin" className="bg-slate-900 text-white">
                    Admin (Full System Control &amp; User Management)
                  </option>
                </select>
              </div>

              {/* Function Checkboxes Section */}
              {role !== 'admin' && (
                <div className="p-4 bg-white/10 rounded-2xl border border-white/15 space-y-3 backdrop-blur-md">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <div className="flex items-center gap-2 text-blue-200 font-bold">
                      <ShieldCheck className="w-4 h-4 text-blue-400" />
                      <span>Select Authorized Functions</span>
                    </div>

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
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/15">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2.5 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 border border-white/15 rounded-full font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-full shadow-[0_4px_16px_rgba(37,99,235,0.4)] border border-blue-400/30 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{editingUser ? 'Save Changes' : 'Add User'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};


