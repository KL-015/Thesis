import React, { useState, useMemo } from 'react';
import { useFleet } from '../../context/FleetContext';
import { Announcement } from '../../types';
import {
  Lock,
  Megaphone,
  PlusCircle,
  X,
  Clock,
  ShieldCheck,
  Trash2,
  Edit2,
  Check,
  ShieldAlert,
} from 'lucide-react';

export const MusteringView: React.FC<{ onOpenLogin: () => void }> = ({ onOpenLogin }) => {
  const {
    canConductMustering,
    currentUser,
    lastResetDate,
    announcements,
    addAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
  } = useFleet();

  // Post Officer Announcement Modal inside Mustering
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeContent, setNoticeContent] = useState('');
  const [noticePriority, setNoticePriority] = useState<'ROUTINE' | 'IMPORTANT' | 'CRITICAL'>('ROUTINE');

  // Edit Officer Announcement Modal inside Mustering
  const [editingNotice, setEditingNotice] = useState<Announcement | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editPriority, setEditPriority] = useState<'ROUTINE' | 'IMPORTANT' | 'CRITICAL'>('ROUTINE');

  // Filter announcements for Mustering / Officer Directives
  const officerNotices = useMemo(() => {
    return announcements.filter(
      (a) =>
        a.category === 'MUSTERING' ||
        a.category === 'OFFICER DIRECTIVE' ||
        a.title.toUpperCase().includes('MUSTERING') ||
        a.title.toUpperCase().includes('MUSTER')
    );
  }, [announcements]);

  const handlePostNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeTitle.trim() || !noticeContent.trim()) return;

    await addAnnouncement({
      title: noticeTitle.trim(),
      content: noticeContent.trim(),
      priority: noticePriority,
      category: 'MUSTERING',
      targetAudience: 'Fleet',
    });

    setNoticeTitle('');
    setNoticeContent('');
    setIsNoticeModalOpen(false);
  };

  const openEditModal = (notice: Announcement) => {
    setEditingNotice(notice);
    setEditTitle(notice.title);
    setEditContent(notice.content);
    setEditPriority(notice.priority);
  };

  const handleEditNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNotice || !editTitle.trim() || !editContent.trim()) return;

    await updateAnnouncement(editingNotice.id, {
      title: editTitle.trim(),
      content: editContent.trim(),
      priority: editPriority,
    });

    setEditingNotice(null);
  };

  // RESTRICTED ACCESS SCREEN: Only Officers with accounts can see, edit, and add
  if (!currentUser || !canConductMustering) {
    return (
      <div className="py-20 text-center max-w-lg mx-auto space-y-5">
        <div className="w-16 h-16 bg-white/12 backdrop-blur-2xl border border-white/25 rounded-3xl flex items-center justify-center text-blue-300 mx-auto shadow-lg">
          <Lock className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Officer Account Required</h2>
        <p className="text-xs text-white/75 leading-relaxed max-w-md mx-auto">
          Mustering Announcements and Officer Directives are restricted exclusively to registered Officers with active accounts. Cadets operate in public view mode and cannot view this tab.
        </p>
        <button
          onClick={onOpenLogin}
          className="px-7 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-full shadow-[0_4px_20px_rgba(37,99,235,0.45)] border border-blue-400/30 transition-all inline-flex items-center gap-2 cursor-pointer"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Officer Sign In to Access Mustering</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto text-white">
      {/* Title Header */}
      <div className="p-6 sm:p-7 bg-white/12 backdrop-blur-2xl rounded-3xl border border-white/25 shadow-[0_15px_40px_rgba(0,0,0,0.25)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-medium mb-2.5 backdrop-blur-md">
            <ShieldAlert className="w-3.5 h-3.5 text-blue-300" />
            <span>Restricted Officer Directives ({lastResetDate})</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Mustering Announcements</h1>
          <p className="text-xs text-white/70 mt-1 max-w-lg">
            Internal officer directives and mustering notices. Only officers with accounts can view, publish, and edit these notices.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setIsNoticeModalOpen(true)}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-xs text-white rounded-full transition-all flex items-center gap-2 font-semibold shadow-[0_4px_16px_rgba(37,99,235,0.45)] cursor-pointer border border-blue-400/40"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Officer Announcement</span>
          </button>
        </div>
      </div>

      {/* Officer Announcements & Mustering Directives List */}
      <div className="p-6 bg-white/12 backdrop-blur-2xl rounded-3xl border border-white/25 shadow-[0_15px_40px_rgba(0,0,0,0.25)] space-y-4">
        <div className="flex items-center justify-between border-b border-white/15 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-400/30">
              <Megaphone className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Officer Mustering Announcements</h2>
              <p className="text-[11px] text-white/60">Restricted directives for officer watch &amp; inspection briefings</p>
            </div>
          </div>
          <span className="text-[10px] font-mono bg-blue-500/20 text-blue-200 border border-blue-400/30 px-3 py-1 rounded-full font-bold">
            {officerNotices.length} Active Directives
          </span>
        </div>

        {officerNotices.length === 0 ? (
          <div className="p-12 text-center bg-white/5 rounded-2xl border border-dashed border-white/15 text-xs text-white/60">
            <Megaphone className="w-8 h-8 text-white/30 mx-auto mb-2" />
            <p className="font-semibold text-white">No officer mustering announcements posted for today.</p>
            <p className="mt-1 text-white/50">Click &quot;+ Officer Announcement&quot; above to publish a restricted muster notice.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {officerNotices.map((notice) => (
              <div
                key={notice.id}
                className="p-5 bg-black/30 backdrop-blur-md rounded-2xl border border-white/15 relative group flex flex-col justify-between hover:border-white/30 transition-all shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                          notice.priority === 'CRITICAL'
                            ? 'bg-red-500/20 text-red-200 border-red-400/40'
                            : notice.priority === 'IMPORTANT'
                            ? 'bg-amber-500/20 text-amber-200 border-amber-400/40'
                            : 'bg-blue-500/20 text-blue-200 border-blue-400/40'
                        }`}
                      >
                        {notice.priority}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-blue-500/20 text-blue-200 border border-blue-400/30">
                        MUSTERING DIRECTIVE
                      </span>
                    </div>

                    <span className="text-[10px] font-mono text-white/50 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-white/40" />
                      {notice.postedAt}
                    </span>
                  </div>

                  <h3 className="font-bold text-white text-sm mb-1.5 tracking-tight">{notice.title}</h3>
                  <p className="text-white/80 text-xs leading-relaxed whitespace-pre-wrap">{notice.content}</p>
                </div>

                <div className="flex items-center justify-between border-t border-white/10 pt-3 mt-4 text-[11px] text-white/60">
                  <span className="font-mono text-blue-300">By: <strong className="text-white">{notice.postedByName}</strong></span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(notice)}
                      className="p-1.5 text-blue-300 hover:text-white hover:bg-blue-500/20 rounded-lg transition-all cursor-pointer"
                      title="Edit Announcement"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm(`Delete officer announcement "${notice.title}"?`)) {
                          await deleteAnnouncement(notice.id);
                        }
                      }}
                      className="p-1.5 text-red-300 hover:text-red-200 hover:bg-red-500/20 rounded-lg transition-all cursor-pointer"
                      title="Delete Announcement"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* POST OFFICER ANNOUNCEMENT MODAL */}
      {isNoticeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-slate-900/95 backdrop-blur-3xl rounded-3xl border border-white/25 shadow-[0_25px_60px_rgba(0,0,0,0.6)] p-6 sm:p-7 text-white">
            <button
              onClick={() => setIsNoticeModalOpen(false)}
              className="absolute top-6 right-6 text-white/60 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="mb-5">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center justify-center font-bold mb-3 shadow-2xs backdrop-blur-md">
                <Megaphone className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">Post Officer Announcement</h2>
              <p className="text-xs text-white/60 mt-1">
                Post an internal directive visible exclusively to officers with accounts.
              </p>
            </div>

            <form onSubmit={handlePostNotice} className="space-y-4 text-xs">
              <div>
                <label className="block text-white/80 font-semibold mb-1.5">Announcement Title *</label>
                <input
                  type="text"
                  required
                  value={noticeTitle}
                  onChange={(e) => setNoticeTitle(e.target.value)}
                  placeholder="e.g. MUSTERING DIRECTIVE: Uniform & Station Inspection"
                  className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-blue-400 transition-all text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-white/80 font-semibold mb-1.5">Priority Level</label>
                <select
                  value={noticePriority}
                  onChange={(e: any) => setNoticePriority(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-800 text-white border border-white/20 rounded-xl focus:outline-none focus:border-blue-400 transition-all text-xs"
                >
                  <option value="ROUTINE" className="bg-slate-900 text-white">Routine Announcement</option>
                  <option value="IMPORTANT" className="bg-slate-900 text-white">Important Directive</option>
                  <option value="CRITICAL" className="bg-slate-900 text-white">Critical Priority Notice</option>
                </select>
              </div>

              <div>
                <label className="block text-white/80 font-semibold mb-1.5">Directive Details / Content *</label>
                <textarea
                  required
                  rows={4}
                  value={noticeContent}
                  onChange={(e) => setNoticeContent(e.target.value)}
                  placeholder="Enter muster instructions, company assignments, or officer watch directives..."
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-blue-400 transition-all text-xs resize-none leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/15">
                <button
                  type="button"
                  onClick={() => setIsNoticeModalOpen(false)}
                  className="px-4 py-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 border border-white/15 rounded-full font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-full shadow-[0_4px_16px_rgba(37,99,235,0.4)] border border-blue-400/30 transition-all cursor-pointer"
                >
                  Publish Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT OFFICER ANNOUNCEMENT MODAL */}
      {editingNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-slate-900/95 backdrop-blur-3xl rounded-3xl border border-white/25 shadow-[0_25px_60px_rgba(0,0,0,0.6)] p-6 sm:p-7 text-white">
            <button
              onClick={() => setEditingNotice(null)}
              className="absolute top-6 right-6 text-white/60 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="mb-5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center justify-center font-bold mb-3 shadow-2xs backdrop-blur-md">
                <Edit2 className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">Edit Officer Announcement</h2>
              <p className="text-xs text-white/60 mt-1">
                Update the directive title, priority, or instructions.
              </p>
            </div>

            <form onSubmit={handleEditNotice} className="space-y-4 text-xs">
              <div>
                <label className="block text-white/80 font-semibold mb-1.5">Announcement Title *</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-blue-400 transition-all text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-white/80 font-semibold mb-1.5">Priority Level</label>
                <select
                  value={editPriority}
                  onChange={(e: any) => setEditPriority(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-800 text-white border border-white/20 rounded-xl focus:outline-none focus:border-blue-400 transition-all text-xs"
                >
                  <option value="ROUTINE" className="bg-slate-900 text-white">Routine Announcement</option>
                  <option value="IMPORTANT" className="bg-slate-900 text-white">Important Directive</option>
                  <option value="CRITICAL" className="bg-slate-900 text-white">Critical Priority Notice</option>
                </select>
              </div>

              <div>
                <label className="block text-white/80 font-semibold mb-1.5">Directive Details / Content *</label>
                <textarea
                  required
                  rows={4}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-blue-400 transition-all text-xs resize-none leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/15">
                <button
                  type="button"
                  onClick={() => setEditingNotice(null)}
                  className="px-4 py-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 border border-white/15 rounded-full font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-full shadow-[0_4px_16px_rgba(37,99,235,0.4)] border border-blue-400/30 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
