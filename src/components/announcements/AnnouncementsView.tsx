import React, { useState, useMemo } from 'react';
import { useFleet } from '../../context/FleetContext';
import { Announcement, AnnouncementAudience } from '../../types';
import {
  Bell,
  Plus,
  Trash2,
  Edit2,
  X,
  Users,
  ShieldCheck,
  Check,
} from 'lucide-react';

const AUDIENCE_OPTIONS: { id: AnnouncementAudience; label: string; badge: string; desc: string }[] = [
  { id: 'Fleet', label: 'Fleet (All)', badge: '⚓ FLEET', desc: 'All Cadets & Academy Ranks' },
  { id: '1st Year', label: '1st Year', badge: '🎓 1ST YEAR', desc: 'Freshmen / Plebe Cadets' },
  { id: '2nd Year', label: '2nd Year', badge: '⚓ 2ND YEAR', desc: 'Sophomore Midshipmen' },
  { id: '3rd Year', label: '3rd Year', badge: '⭐ 3RD YEAR', desc: 'Junior / Senior Cadets' },
];

export const AnnouncementsView: React.FC<{ onOpenLogin: () => void }> = () => {
  const {
    announcements,
    addAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    canPostAnnouncements: isFleetOfficerOrAdmin,
    lastResetDate,
  } = useFleet();

  // Tab Filtering: 'Fleet' | '1st Year' | '2nd Year' | '3rd Year'
  const [selectedAudience, setSelectedAudience] = useState<AnnouncementAudience>('Fleet');

  // Post Notice Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'ROUTINE' | 'IMPORTANT' | 'CRITICAL'>('ROUTINE');
  const [category, setCategory] = useState('FLEET DIRECTIVE');
  const [targetAudience, setTargetAudience] = useState<AnnouncementAudience>('Fleet');

  // Edit Notice Modal state
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editPriority, setEditPriority] = useState<'ROUTINE' | 'IMPORTANT' | 'CRITICAL'>('ROUTINE');
  const [editCategory, setEditCategory] = useState('FLEET DIRECTIVE');
  const [editTargetAudience, setEditTargetAudience] = useState<AnnouncementAudience>('Fleet');

  // Open Create Modal
  const openCreateModal = () => {
    setTitle('');
    setContent('');
    setPriority('ROUTINE');
    setCategory('FLEET DIRECTIVE');
    setTargetAudience(selectedAudience);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (ann: Announcement) => {
    setEditingAnnouncement(ann);
    setEditTitle(ann.title);
    setEditContent(ann.content);
    setEditPriority(ann.priority);
    setEditCategory(ann.category || 'FLEET DIRECTIVE');
    setEditTargetAudience(ann.targetAudience || 'Fleet');
  };

  // Submit New Notice
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    await addAnnouncement({
      title: title.trim(),
      content: content.trim(),
      priority,
      category: category.trim().toUpperCase(),
      targetAudience,
    });

    setIsModalOpen(false);
    setTitle('');
    setContent('');
  };

  // Submit Edit Notice
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAnnouncement || !editTitle.trim() || !editContent.trim()) return;

    await updateAnnouncement(editingAnnouncement.id, {
      title: editTitle.trim(),
      content: editContent.trim(),
      priority: editPriority,
      category: editCategory.trim().toUpperCase(),
      targetAudience: editTargetAudience,
    });

    setEditingAnnouncement(null);
  };

  // Counts by audience
  const audienceCounts = useMemo(() => {
    const counts: Record<AnnouncementAudience, number> = {
      Fleet: 0,
      '1st Year': 0,
      '2nd Year': 0,
      '3rd Year': 0,
    };

    announcements.forEach((a) => {
      const aud = a.targetAudience || 'Fleet';
      if (aud in counts) {
        counts[aud as AnnouncementAudience]++;
      } else {
        counts.Fleet++;
      }
    });

    return counts;
  }, [announcements]);

  // Filtered announcements
  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((a) => (a.targetAudience || 'Fleet') === selectedAudience);
  }, [announcements, selectedAudience]);

  // Visual audience badge helper
  const getAudienceBadgeStyle = (aud?: AnnouncementAudience) => {
    switch (aud) {
      case '1st Year':
        return 'bg-emerald-500/25 text-emerald-200 border-emerald-400/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]';
      case '2nd Year':
        return 'bg-purple-500/25 text-purple-200 border-purple-400/40 shadow-[0_0_10px_rgba(168,85,247,0.2)]';
      case '3rd Year':
        return 'bg-amber-500/25 text-amber-200 border-amber-400/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]';
      case 'Fleet':
      default:
        return 'bg-blue-500/25 text-blue-200 border-blue-400/40 shadow-[0_0_10px_rgba(59,130,246,0.2)]';
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto text-white">
      {/* Title - Frosted Glass Container */}
      <div className="p-6 sm:p-7 bg-white/12 backdrop-blur-2xl rounded-3xl border border-white/25 shadow-[0_15px_40px_rgba(0,0,0,0.25)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-medium mb-2.5">
            <Bell className="w-3.5 h-3.5" />
            <span>Daily Reset Broadcast · {lastResetDate}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Announcements</h1>
          <p className="text-xs sm:text-sm text-white/75 mt-1 max-w-lg">
            Level-targeted notices (1st, 2nd, 3rd Year) and Fleet-wide directives. Officers can edit announcements for each year level or all.
          </p>
        </div>

        {isFleetOfficerOrAdmin && (
          <button
            onClick={openCreateModal}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-full flex items-center gap-2 transition-all duration-200 shadow-[0_4px_16px_rgba(37,99,235,0.45)] border border-blue-400/40 self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Post Notice</span>
          </button>
        )}
      </div>

      {/* Target Audience Filter Selector Tabs */}
      <div className="p-2 sm:p-2.5 bg-white/10 backdrop-blur-2xl rounded-2xl border border-white/20 shadow-[0_8px_25px_rgba(0,0,0,0.15)] flex flex-wrap items-center gap-1.5 sm:gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-white/60 px-2.5 hidden md:inline-flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-blue-300" />
          <span>Audience:</span>
        </span>

        {/* 'Fleet' Tab */}
        <button
          onClick={() => setSelectedAudience('Fleet')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
            selectedAudience === 'Fleet'
              ? 'bg-blue-600 text-white shadow-md border border-blue-400/40'
              : 'text-white/70 hover:text-white hover:bg-white/10 border border-transparent'
          }`}
        >
          <span>Fleet (All Levels)</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${selectedAudience === 'Fleet' ? 'bg-white/20 text-white' : 'bg-white/10 text-white/60'}`}>
            {audienceCounts.Fleet}
          </span>
        </button>

        {/* '1st Year' Tab */}
        <button
          onClick={() => setSelectedAudience('1st Year')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
            selectedAudience === '1st Year'
              ? 'bg-emerald-600 text-white shadow-md border border-emerald-400/40'
              : 'text-white/70 hover:text-white hover:bg-white/10 border border-transparent'
          }`}
        >
          <span>1st Year</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${selectedAudience === '1st Year' ? 'bg-white/20 text-white' : 'bg-white/10 text-white/60'}`}>
            {audienceCounts['1st Year']}
          </span>
        </button>

        {/* '2nd Year' Tab */}
        <button
          onClick={() => setSelectedAudience('2nd Year')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
            selectedAudience === '2nd Year'
              ? 'bg-purple-600 text-white shadow-md border border-purple-400/40'
              : 'text-white/70 hover:text-white hover:bg-white/10 border border-transparent'
          }`}
        >
          <span>2nd Year</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${selectedAudience === '2nd Year' ? 'bg-white/20 text-white' : 'bg-white/10 text-white/60'}`}>
            {audienceCounts['2nd Year']}
          </span>
        </button>

        {/* '3rd Year' Tab */}
        <button
          onClick={() => setSelectedAudience('3rd Year')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
            selectedAudience === '3rd Year'
              ? 'bg-amber-600 text-white shadow-md border border-amber-400/40'
              : 'text-white/70 hover:text-white hover:bg-white/10 border border-transparent'
          }`}
        >
          <span>3rd Year</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${selectedAudience === '3rd Year' ? 'bg-white/20 text-white' : 'bg-white/10 text-white/60'}`}>
            {audienceCounts['3rd Year']}
          </span>
        </button>
      </div>

      {/* Announcements List - Rounded Glass Cards */}
      <div className="space-y-3">
        {filteredAnnouncements.length === 0 ? (
          <div className="py-14 text-center bg-white/12 backdrop-blur-2xl rounded-3xl border border-dashed border-white/20 text-white/70 shadow-[0_15px_40px_rgba(0,0,0,0.25)]">
            <Bell className="w-9 h-9 text-white/40 mx-auto mb-2 opacity-60" />
            <p className="text-sm font-semibold text-white">
              No active announcements for {selectedAudience}
            </p>
            <p className="text-xs text-white/70 mt-1">
              {isFleetOfficerOrAdmin ? 'Click "Post Notice" above to publish an announcement for this level.' : 'All clear for this year level.'}
            </p>
          </div>
        ) : (
          filteredAnnouncements.map((ann) => {
            const isCritical = ann.priority === 'CRITICAL';
            const isImportant = ann.priority === 'IMPORTANT';
            const aud = ann.targetAudience || 'Fleet';

            return (
              <div
                key={ann.id}
                className={`p-5 sm:p-6 rounded-2xl backdrop-blur-2xl border transition-all duration-200 text-white ${
                  isCritical
                    ? 'bg-red-500/20 border-red-400/40 shadow-xs'
                    : isImportant
                    ? 'bg-amber-500/20 border-amber-400/40 shadow-xs'
                    : 'bg-white/12 border-white/25 hover:border-white/40 shadow-[0_15px_40px_rgba(0,0,0,0.25)]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 text-xs flex-wrap">
                      {/* Priority Tag */}
                      <span
                        className={`font-mono text-[10px] font-bold px-3 py-0.5 rounded-full border shadow-2xs ${
                          isCritical
                            ? 'bg-red-500/30 text-red-200 border-red-400/40'
                            : isImportant
                            ? 'bg-amber-500/30 text-amber-200 border-amber-400/40'
                            : 'bg-blue-500/20 text-blue-200 border-blue-400/30'
                        }`}
                      >
                        {ann.priority}
                      </span>

                      {/* Year Level / Fleet Audience Tag */}
                      <span
                        className={`font-mono text-[10px] font-bold px-3 py-0.5 rounded-full border ${getAudienceBadgeStyle(
                          aud
                        )}`}
                      >
                        {aud === 'Fleet' ? '⚓ FLEET' : `🎓 ${aud.toUpperCase()}`}
                      </span>

                      <span className="text-white/70 font-mono text-[11px]">{ann.postedAt}</span>
                      <span className="text-white/30">·</span>
                      <span className="text-white/80 font-medium">{ann.category}</span>
                    </div>

                    <h3 className="text-base font-bold text-white tracking-tight">{ann.title}</h3>
                    <p className="text-xs text-white/85 leading-relaxed whitespace-pre-line">{ann.content}</p>

                    <div className="text-[11px] text-white/70 pt-1 font-mono">
                      By: <strong className="text-white">{ann.postedByName}</strong>
                    </div>
                  </div>

                  {isFleetOfficerOrAdmin && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEditModal(ann)}
                        className="p-2 text-blue-300 hover:text-white rounded-full hover:bg-blue-500/20 transition-colors cursor-pointer"
                        title="Edit Announcement"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm(`Delete announcement "${ann.title}"?`)) {
                            await deleteAnnouncement(ann.id);
                          }
                        }}
                        className="p-2 text-red-300 hover:text-red-200 rounded-full hover:bg-red-500/20 transition-colors cursor-pointer"
                        title="Remove Announcement"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* POST NOTICE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-slate-900/95 backdrop-blur-3xl rounded-3xl border border-white/25 shadow-[0_25px_60px_rgba(0,0,0,0.6)] p-6 sm:p-7 text-white">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 text-white/60 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-2xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Post Announcement</h2>
                <p className="text-xs text-white/60">Broadcast directives to Fleet or specific year levels</p>
              </div>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              {/* Target Audience Selector (Fleet, 1st Year, 2nd, 3rd) */}
              <div>
                <label className="block text-white/80 font-semibold mb-1.5">
                  Target Audience / Level *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {AUDIENCE_OPTIONS.map((opt) => (
                    <button
                      type="button"
                      key={opt.id}
                      onClick={() => setTargetAudience(opt.id)}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                        targetAudience === opt.id
                          ? 'bg-blue-600 border-blue-400 text-white shadow-md font-bold'
                          : 'bg-white/5 border-white/15 text-white/70 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span className="text-xs font-semibold">{opt.label}</span>
                      <span className="text-[10px] opacity-70 truncate max-w-full">
                        {opt.id === 'Fleet' ? 'All Cadets' : `${opt.id}`}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-white/80 font-medium mb-1.5">Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Mandatory Assembly for 1st Year Cadets"
                  className="w-full px-4 py-2.5 bg-white/12 border border-white/20 rounded-xl text-white placeholder-white/45 focus:outline-none focus:border-blue-400 transition-all font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-white/80 font-medium mb-1.5">Priority</label>
                  <select
                    value={priority}
                    onChange={(e: any) => setPriority(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/12 border border-white/20 rounded-xl text-white focus:outline-none focus:border-blue-400 transition-all font-medium"
                  >
                    <option value="ROUTINE" className="bg-slate-900 text-white">Routine</option>
                    <option value="IMPORTANT" className="bg-slate-900 text-white">Important</option>
                    <option value="CRITICAL" className="bg-slate-900 text-white">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-white/80 font-medium mb-1.5">Category</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="PROTOCOL"
                    className="w-full px-4 py-2.5 bg-white/12 border border-white/20 rounded-xl text-white placeholder-white/45 focus:outline-none focus:border-blue-400 transition-all font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white/80 font-medium mb-1.5">Body / Content *</label>
                <textarea
                  rows={3}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Detailed announcement directives, instructions, or uniform requirements..."
                  className="w-full px-4 py-2.5 bg-white/12 border border-white/20 rounded-xl text-white placeholder-white/45 focus:outline-none focus:border-blue-400 transition-all resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/15">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-white/70 hover:text-white rounded-full font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-full shadow-[0_4px_16px_rgba(37,99,235,0.45)] border border-blue-400/40 transition-all cursor-pointer"
                >
                  Publish Notice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT NOTICE MODAL */}
      {editingAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-slate-900/95 backdrop-blur-3xl rounded-3xl border border-white/25 shadow-[0_25px_60px_rgba(0,0,0,0.6)] p-6 sm:p-7 text-white">
            <button
              onClick={() => setEditingAnnouncement(null)}
              className="absolute top-6 right-6 text-white/60 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                <Edit2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Edit Announcement</h2>
                <p className="text-xs text-white/60">Update directives for {editTargetAudience} or change target level</p>
              </div>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              {/* Target Audience Selector (Fleet, 1st Year, 2nd, 3rd) */}
              <div>
                <label className="block text-white/80 font-semibold mb-1.5">
                  Target Audience / Level *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {AUDIENCE_OPTIONS.map((opt) => (
                    <button
                      type="button"
                      key={opt.id}
                      onClick={() => setEditTargetAudience(opt.id)}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                        editTargetAudience === opt.id
                          ? 'bg-blue-600 border-blue-400 text-white shadow-md font-bold'
                          : 'bg-white/5 border-white/15 text-white/70 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span className="text-xs font-semibold">{opt.label}</span>
                      <span className="text-[10px] opacity-70 truncate max-w-full">
                        {opt.id === 'Fleet' ? 'All Cadets' : `${opt.id}`}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-white/80 font-medium mb-1.5">Title *</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/12 border border-white/20 rounded-xl text-white placeholder-white/45 focus:outline-none focus:border-blue-400 transition-all font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-white/80 font-medium mb-1.5">Priority</label>
                  <select
                    value={editPriority}
                    onChange={(e: any) => setEditPriority(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/12 border border-white/20 rounded-xl text-white focus:outline-none focus:border-blue-400 transition-all font-medium"
                  >
                    <option value="ROUTINE" className="bg-slate-900 text-white">Routine</option>
                    <option value="IMPORTANT" className="bg-slate-900 text-white">Important</option>
                    <option value="CRITICAL" className="bg-slate-900 text-white">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-white/80 font-medium mb-1.5">Category</label>
                  <input
                    type="text"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    placeholder="PROTOCOL"
                    className="w-full px-4 py-2.5 bg-white/12 border border-white/20 rounded-xl text-white placeholder-white/45 focus:outline-none focus:border-blue-400 transition-all font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white/80 font-medium mb-1.5">Body / Content *</label>
                <textarea
                  rows={4}
                  required
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/12 border border-white/20 rounded-xl text-white placeholder-white/45 focus:outline-none focus:border-blue-400 transition-all resize-none font-medium leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/15">
                <button
                  type="button"
                  onClick={() => setEditingAnnouncement(null)}
                  className="px-4 py-2.5 text-white/70 hover:text-white rounded-full font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-full shadow-[0_4px_16px_rgba(37,99,235,0.45)] border border-blue-400/40 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
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
