import React, { useState, useMemo } from 'react';
import { useFleet } from '../../context/FleetContext';
import { MemoGroup, Memorandum } from '../../types';
import {
  FileText,
  Upload,
  Search,
  Download,
  Eye,
  Trash2,
  Edit2,
  FolderPlus,
  X,
  Database,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

export const MemoRepositoryView: React.FC<{ onOpenLogin: () => void }> = ({ onOpenLogin }) => {
  const {
    memoGroups,
    memos,
    createMemoGroup,
    updateMemoGroup,
    deleteMemoGroup,
    uploadMemorandum,
    updateMemorandum,
    deleteMemorandum,
    isAdmin,
    canUploadMemos: isFleetOfficerOrAdmin,
    currentUser,
  } = useFleet();

  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingMemo, setViewingMemo] = useState<Memorandum | null>(null);

  // Edit Memo State (Change Memo Name / Title & Details)
  const [editingMemo, setEditingMemo] = useState<Memorandum | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editMemoNumber, setEditMemoNumber] = useState('');
  const [editGroupId, setEditGroupId] = useState('');
  const [editSignatory, setEditSignatory] = useState('');
  const [editEffectiveDate, setEditEffectiveDate] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Upload Modal State
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadMemoNumber, setUploadMemoNumber] = useState('');
  const [uploadGroupId, setUploadGroupId] = useState(memoGroups[0]?.id || '');
  const [uploadFormat, setUploadFormat] = useState<'PDF' | 'DOCX'>('PDF');
  const [uploadFileName, setUploadFileName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadFeedback, setUploadFeedback] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
    submessage?: string;
  } | null>(null);
  const [uploadEffectiveDate, setUploadEffectiveDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [uploadSignatory, setUploadSignatory] = useState(
    currentUser?.fullName || 'Administrator'
  );
  const [uploadSummary, setUploadSummary] = useState('');

  // Supabase Guide Modal State
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Admin Group Modal State
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<MemoGroup | null>(null);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [groupDescInput, setGroupDescInput] = useState('');
  const [groupError, setGroupError] = useState<string | null>(null);

  const groupCounts = useMemo(() => {
    const map = new Map<string, number>();
    memos.forEach((m) => {
      map.set(m.groupId, (map.get(m.groupId) || 0) + 1);
    });
    return map;
  }, [memos]);

  const filteredMemos = useMemo(() => {
    return memos.filter((m) => {
      const groupMatches = selectedGroupId === 'all' || m.groupId === selectedGroupId;
      const searchMatches =
        !searchQuery.trim() ||
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.memoNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.signatory.toLowerCase().includes(searchQuery.toLowerCase());

      return groupMatches && searchMatches;
    });
  }, [memos, selectedGroupId, searchQuery]);

  const openEditMemoModal = (memo: Memorandum) => {
    setEditingMemo(memo);
    setEditTitle(memo.title);
    setEditMemoNumber(memo.memoNumber);
    setEditGroupId(memo.groupId);
    setEditSignatory(memo.signatory);
    setEditEffectiveDate(memo.effectiveDate);
    setEditSummary(memo.summary);
    setIsSavingEdit(false);
  };

  const handleSaveMemoEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMemo || !editTitle.trim()) return;

    setIsSavingEdit(true);
    await updateMemorandum(editingMemo.id, {
      title: editTitle.trim(),
      memoNumber: editMemoNumber.trim() || editingMemo.memoNumber,
      groupId: editGroupId || editingMemo.groupId,
      signatory: editSignatory.trim() || editingMemo.signatory,
      effectiveDate: editEffectiveDate || editingMemo.effectiveDate,
      summary: editSummary.trim(),
    });
    setIsSavingEdit(false);
    setEditingMemo(null);
  };

  const openUploadModal = () => {
    setUploadTitle('');
    setUploadMemoNumber(`MMMA-MEMO-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
    setUploadGroupId(selectedGroupId !== 'all' ? selectedGroupId : memoGroups[0]?.id || '');
    setUploadFormat('PDF');
    setUploadFileName('');
    setSelectedFile(null);
    setUploadStatus(null);
    setIsUploading(false);
    setUploadSummary('');
    setUploadSignatory(currentUser?.fullName || 'Fleet Operations Officer');
    setIsUploadOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadFileName(file.name);
      const isDoc = file.name.endsWith('.docx') || file.name.endsWith('.doc');
      setUploadFormat(isDoc ? 'DOCX' : 'PDF');
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim() || !uploadMemoNumber.trim() || !uploadGroupId) return;

    setIsUploading(true);
    setUploadStatus('Uploading to Supabase Storage & Database...');

    const calculatedSize = selectedFile
      ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`
      : '1.2 MB';

    const res = await uploadMemorandum(
      {
        title: uploadTitle.trim(),
        memoNumber: uploadMemoNumber.trim(),
        groupId: uploadGroupId,
        effectiveDate: uploadEffectiveDate,
        signatory: uploadSignatory.trim(),
        summary: uploadSummary.trim(),
        fileFormat: uploadFormat,
        fileName: uploadFileName || `${uploadMemoNumber.toLowerCase()}.${uploadFormat.toLowerCase()}`,
        fileSize: calculatedSize,
        isPublicToCadets: true,
      },
      selectedFile || undefined
    );

    setIsUploading(false);
    setUploadStatus(null);
    setIsUploadOpen(false);

    if (res.storageError) {
      setUploadFeedback({
        type: 'warning',
        message: 'Memo document saved to Supabase Database!',
        submessage:
          'Note: PDF/DOCX file binary requires Supabase Storage bucket RLS policy to allow uploads. Click "View SQL Setup" to enable.',
      });
    } else if (res.dbSaved || res.storageSaved) {
      setUploadFeedback({
        type: 'success',
        message: 'Memo successfully published & synchronized to Supabase Cloud!',
        submessage: selectedFile
          ? 'File binary is hosted on Supabase Storage and metadata is recorded in the memos table.'
          : 'Metadata record is saved in the Supabase memos table.',
      });
    } else {
      setUploadFeedback({
        type: 'success',
        message: 'Memo published successfully!',
      });
    }
  };

  const openCreateGroupModal = () => {
    setEditingGroup(null);
    setGroupNameInput('');
    setGroupDescInput('');
    setGroupError(null);
    setIsGroupModalOpen(true);
  };

  const openEditGroupModal = (g: MemoGroup) => {
    setEditingGroup(g);
    setGroupNameInput(g.name);
    setGroupDescInput(g.description || '');
    setGroupError(null);
    setIsGroupModalOpen(true);
  };

  const handleGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupNameInput.trim()) return;

    if (editingGroup) {
      updateMemoGroup(editingGroup.id, groupNameInput.trim(), groupDescInput.trim());
    } else {
      createMemoGroup(groupNameInput.trim(), groupDescInput.trim());
    }
    setIsGroupModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto text-white">
      {/* Title & Actions - Frosted Glass Container */}
      <div className="p-6 sm:p-7 bg-white/12 backdrop-blur-2xl rounded-3xl border border-white/25 shadow-[0_15px_40px_rgba(0,0,0,0.25)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Memo Repository</h1>
          <p className="text-xs sm:text-sm text-white/75 mt-1 max-w-lg">
            Official academy directives, regulations, and circulars synchronized to Supabase Cloud.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <button
            onClick={() => setIsSupabaseModalOpen(true)}
            className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 rounded-full text-xs font-semibold text-emerald-300 flex items-center gap-2 transition-all shadow-xs cursor-pointer"
            title="View Supabase project cloud connection & SQL storage policy setup"
          >
            <Cloud className="w-3.5 h-3.5 text-emerald-300" />
            <span>Supabase Cloud</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse" />
          </button>

          {isFleetOfficerOrAdmin && (
            <button
              onClick={openUploadModal}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-full flex items-center gap-2 transition-all duration-200 shadow-[0_4px_16px_rgba(37,99,235,0.45)] border border-blue-400/40 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Memo</span>
            </button>
          )}
        </div>
      </div>

      {/* Cloud Sync / Upload Notice Feedback */}
      {uploadFeedback && (
        <div
          className={`p-4 rounded-2xl border flex items-start justify-between gap-3 text-xs backdrop-blur-xl animate-in fade-in transition-all ${
            uploadFeedback.type === 'success'
              ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200 shadow-xs'
              : uploadFeedback.type === 'warning'
              ? 'bg-amber-500/20 border-amber-400/40 text-amber-200 shadow-xs'
              : 'bg-red-500/20 border-red-400/40 text-red-200 shadow-xs'
          }`}
        >
          <div className="space-y-0.5">
            <p className="font-semibold flex items-center gap-2">
              {uploadFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
              ) : uploadFeedback.type === 'warning' ? (
                <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />
              ) : (
                <X className="w-4 h-4 text-red-300 shrink-0" />
              )}
              <span>{uploadFeedback.message}</span>
            </p>
            {uploadFeedback.submessage && (
              <p className="text-[11px] opacity-90 pl-6">{uploadFeedback.submessage}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {uploadFeedback.type === 'warning' && (
              <button
                onClick={() => setIsSupabaseModalOpen(true)}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-full text-[11px] transition-colors shadow-xs cursor-pointer"
              >
                View SQL Setup
              </button>
            )}
            <button
              onClick={() => setUploadFeedback(null)}
              className="p-1 text-white/60 hover:text-white rounded-full transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* HORIZONTAL AXIS GROUP HEADER (Rounded Pill Tabs) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs px-2">
          <span className="text-white/70 font-semibold tracking-wide">Group Categories</span>
          {isAdmin && (
            <button
              onClick={openCreateGroupModal}
              className="text-blue-300 hover:text-white font-semibold flex items-center gap-1.5 transition-colors"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>+ Add Group (Admin)</span>
            </button>
          )}
        </div>

        {/* Horizontal Axis Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          <button
            onClick={() => setSelectedGroupId('all')}
            className={`px-4 py-2 text-xs font-medium rounded-full whitespace-nowrap transition-all duration-200 flex items-center gap-2 cursor-pointer ${
              selectedGroupId === 'all'
                ? 'bg-blue-600 text-white font-semibold shadow-[0_4px_16px_rgba(37,99,235,0.45)] border border-blue-400/40'
                : 'bg-white/10 text-white/85 hover:text-white hover:bg-white/20 border border-white/20'
            }`}
          >
            <span>All Directives</span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${selectedGroupId === 'all' ? 'bg-blue-700 text-white' : 'bg-white/15 text-white/90'}`}>
              {memos.length}
            </span>
          </button>

          {memoGroups.map((g) => {
            const isSelected = selectedGroupId === g.id;
            const count = groupCounts.get(g.id) || 0;

            return (
              <div key={g.id} className="relative group shrink-0 flex items-center">
                <button
                  onClick={() => setSelectedGroupId(g.id)}
                  className={`px-4 py-2 text-xs font-medium rounded-full whitespace-nowrap transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white font-semibold shadow-[0_4px_16px_rgba(37,99,235,0.45)] border border-blue-400/40'
                      : 'bg-white/10 text-white/85 hover:text-white hover:bg-white/20 border border-white/20'
                  }`}
                >
                  <span>{g.name}</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${isSelected ? 'bg-blue-700 text-white' : 'bg-white/15 text-white/90'}`}>
                    {count}
                  </span>
                </button>

                {isAdmin && (
                  <div className="hidden group-hover:flex items-center gap-0.5 ml-1.5">
                    <button
                      onClick={() => openEditGroupModal(g)}
                      title="Rename"
                      className="p-1.5 text-white/70 hover:text-white rounded-full hover:bg-white/15"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    {!g.isDefault && (
                      <button
                        onClick={() => {
                          if (confirm(`Delete group "${g.name}"?`)) {
                            deleteMemoGroup(g.id);
                            if (selectedGroupId === g.id) setSelectedGroupId('all');
                          }
                        }}
                        title="Delete"
                        className="p-1.5 text-red-300 hover:text-red-200 rounded-full hover:bg-red-500/20"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Search Input - Glass Pill */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/50" />
        <input
          type="text"
          placeholder="Search by title, memo number, signatory..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-2.5 bg-white/12 backdrop-blur-xl border border-white/25 rounded-full text-white placeholder-white/50 text-xs focus:outline-none focus:border-blue-400 transition-all font-medium"
        />
      </div>

      {/* Memos List */}
      <div className="space-y-3">
        {filteredMemos.length === 0 ? (
          <div className="py-14 text-center bg-white/12 backdrop-blur-2xl rounded-3xl border border-dashed border-white/20 text-white/70 shadow-[0_15px_40px_rgba(0,0,0,0.25)]">
            <FileText className="w-9 h-9 text-white/40 mx-auto mb-2 opacity-60" />
            <p className="text-sm font-semibold text-white">No memorandums found</p>
            <p className="text-xs text-white/70 mt-1">
              Select another group or adjust search keywords.
            </p>
          </div>
        ) : (
          filteredMemos.map((memo) => {
            const groupObj = memoGroups.find((g) => g.id === memo.groupId);

            return (
              <div
                key={memo.id}
                className="p-5 sm:p-6 rounded-2xl bg-white/12 backdrop-blur-2xl border border-white/25 hover:border-white/40 shadow-[0_15px_40px_rgba(0,0,0,0.25)] text-white transition-all duration-200"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 text-xs flex-wrap">
                      <span className="font-mono font-bold text-blue-200 bg-blue-500/20 px-2.5 py-0.5 rounded-full border border-blue-400/30">
                        {memo.memoNumber}
                      </span>
                      <span className="text-white/30">·</span>
                      <span className="text-white/80 font-medium">{groupObj?.name || 'Directive'}</span>
                      <span className="text-white/30">·</span>
                      <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border ${memo.fileFormat === 'PDF' ? 'bg-red-500/20 text-red-200 border-red-400/30' : 'bg-blue-500/20 text-blue-200 border-blue-400/30'}`}>
                        {memo.fileFormat}
                      </span>
                      {memo.fileUrl && (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-medium flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                          <span>Supabase Cloud</span>
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-white tracking-tight">{memo.title}</h3>
                    <p className="text-xs text-white/80 leading-relaxed line-clamp-2">{memo.summary}</p>

                    <div className="text-[11px] text-white/70 pt-1 font-mono">
                      <span>Signatory: <strong className="text-white">{memo.signatory}</strong></span> · Effective: {memo.effectiveDate}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-start shrink-0 pt-2 sm:pt-0">
                    <button
                      onClick={() => setViewingMemo(memo)}
                      className="px-3.5 py-2 text-xs text-white/90 hover:text-white bg-white/10 hover:bg-white/20 rounded-full border border-white/20 transition-colors flex items-center gap-1.5 font-medium cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-300" />
                      <span>View</span>
                    </button>
                    <button
                      onClick={() => {
                        if (memo.fileUrl) {
                          window.open(memo.fileUrl, '_blank');
                        } else {
                          const content = `${memo.title}\n${memo.memoNumber}\nSignatory: ${memo.signatory}\nEffective: ${memo.effectiveDate}\n\n${memo.summary}`;
                          const blob = new Blob([content], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = memo.fileName || `${memo.memoNumber}.txt`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }
                      }}
                      className="px-3.5 py-2 text-xs text-white/90 hover:text-white bg-white/10 hover:bg-white/20 rounded-full border border-white/20 transition-colors flex items-center gap-1.5 font-medium cursor-pointer"
                      title={memo.fileUrl ? 'Open / Download from Supabase' : 'Download Document'}
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Download</span>
                    </button>
                    {isFleetOfficerOrAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditMemoModal(memo)}
                          className="p-2 text-white/70 hover:text-blue-300 rounded-full hover:bg-white/15 transition-colors cursor-pointer"
                          title="Change Memo Name / Edit Memo"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm(`Delete memo "${memo.memoNumber}"?`)) {
                              await deleteMemorandum(memo.id);
                            }
                          }}
                          className="p-2 text-red-300 hover:text-red-200 rounded-full hover:bg-red-500/20 transition-colors cursor-pointer"
                          title="Remove Memo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* VIEW MODAL - Frosted Glass Card */}
      {viewingMemo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-slate-900/90 backdrop-blur-3xl rounded-3xl border border-white/25 shadow-[0_25px_60px_rgba(0,0,0,0.6)] p-6 sm:p-7 text-white max-h-[90vh] overflow-y-auto space-y-4 text-xs">
            <button
              onClick={() => setViewingMemo(null)}
              className="absolute top-6 right-6 text-white/60 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="border-b border-white/15 pb-3">
              <span className="text-[10px] uppercase font-mono text-blue-300 font-bold tracking-wider">
                Fleet Command &amp; Operations
              </span>
              <h2 className="text-lg font-bold text-white mt-1">{viewingMemo.title}</h2>
              <span className="font-mono text-white/70 font-medium">{viewingMemo.memoNumber}</span>
            </div>

            <div className="p-4 bg-white/10 rounded-2xl border border-white/15 text-white/90 leading-relaxed whitespace-pre-line">
              {viewingMemo.summary}
              {'\n\n'}
              All midshipmen and academy staff shall be guided accordingly.
            </div>

            <div className="flex items-center justify-between text-[11px] text-white/70 border-t border-white/15 pt-3">
              <span>Signatory: <strong className="text-white">{viewingMemo.signatory}</strong></span>
              <span>Effective: {viewingMemo.effectiveDate}</span>
            </div>

            {viewingMemo.fileUrl && (
              <div className="p-3 bg-emerald-500/20 border border-emerald-400/30 rounded-2xl text-[11px] text-emerald-200 flex items-center justify-between gap-2">
                <span>Stored on Supabase Cloud Storage</span>
                <a
                  href={viewingMemo.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold underline text-white hover:text-emerald-300"
                >
                  Open Direct File ↗
                </a>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setViewingMemo(null)}
                className="px-4 py-2 text-white/70 hover:text-white rounded-full font-medium cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  if (viewingMemo.fileUrl) {
                    window.open(viewingMemo.fileUrl, '_blank');
                  } else {
                    const content = `${viewingMemo.title}\n${viewingMemo.memoNumber}\nSignatory: ${viewingMemo.signatory}\nEffective: ${viewingMemo.effectiveDate}\n\n${viewingMemo.summary}`;
                    const blob = new Blob([content], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = viewingMemo.fileName || `${viewingMemo.memoNumber}.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }
                }}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-full flex items-center gap-2 shadow-[0_4px_16px_rgba(37,99,235,0.45)] border border-blue-400/40 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download ({viewingMemo.fileFormat})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MEMO MODAL - CHANGE MEMO NAME & PROPERTIES */}
      {editingMemo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-slate-900/90 backdrop-blur-3xl rounded-3xl border border-white/25 shadow-[0_25px_60px_rgba(0,0,0,0.6)] p-6 sm:p-7 text-white">
            <button
              onClick={() => setEditingMemo(null)}
              className="absolute top-6 right-6 text-white/60 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/15">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
                <Edit2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Change Memo Name &amp; Details</h2>
                <p className="text-xs text-white/70">Updates live record in Supabase database</p>
              </div>
            </div>

            <form onSubmit={handleSaveMemoEdit} className="space-y-4 text-xs">
              <div>
                <label className="block text-white/80 font-semibold mb-1.5">Memo Title / Name *</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="e.g. Mandatory Briefing on Safety Protocol"
                  className="w-full px-4 py-2.5 bg-white/12 border border-white/20 rounded-xl text-white placeholder-white/45 focus:outline-none focus:border-blue-400 transition-all font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/80 font-semibold mb-1.5">Memo Number *</label>
                  <input
                    type="text"
                    required
                    value={editMemoNumber}
                    onChange={(e) => setEditMemoNumber(e.target.value)}
                    placeholder="e.g. MMMA-MEMO-2026-104"
                    className="w-full px-3.5 py-2.5 bg-white/12 border border-white/20 rounded-xl text-white font-mono focus:outline-none focus:border-blue-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-white/80 font-semibold mb-1.5">Group Category</label>
                  <select
                    value={editGroupId}
                    onChange={(e) => setEditGroupId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white/12 border border-white/20 rounded-xl text-white focus:outline-none focus:border-blue-400 transition-all"
                  >
                    {memoGroups.map((g) => (
                      <option key={g.id} value={g.id} className="bg-slate-900 text-white">
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/80 font-semibold mb-1.5">Signatory</label>
                  <input
                    type="text"
                    value={editSignatory}
                    onChange={(e) => setEditSignatory(e.target.value)}
                    placeholder="e.g. Administrator or Superintendent"
                    className="w-full px-3.5 py-2.5 bg-white/12 border border-white/20 rounded-xl text-white placeholder-white/45 focus:outline-none focus:border-blue-400 transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="block text-white/80 font-semibold mb-1.5">Effective Date</label>
                  <input
                    type="date"
                    value={editEffectiveDate}
                    onChange={(e) => setEditEffectiveDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white/12 border border-white/20 rounded-xl text-white font-mono focus:outline-none focus:border-blue-400 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white/80 font-semibold mb-1.5">Summary / Directive Text</label>
                <textarea
                  rows={3}
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  placeholder="Summary of this memorandum..."
                  className="w-full px-4 py-2.5 bg-white/12 border border-white/20 rounded-xl text-white placeholder-white/45 focus:outline-none focus:border-blue-400 transition-all resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/15">
                <button
                  type="button"
                  onClick={() => setEditingMemo(null)}
                  className="px-4 py-2 text-white/70 hover:text-white rounded-full font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-full shadow-[0_4px_16px_rgba(37,99,235,0.45)] border border-blue-400/40 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSavingEdit ? 'Saving to Supabase...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPLOAD MODAL - Frosted Glass Card */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-slate-900/90 backdrop-blur-3xl rounded-3xl border border-white/25 shadow-[0_25px_60px_rgba(0,0,0,0.6)] p-6 sm:p-7 text-white">
            <button
              onClick={() => setIsUploadOpen(false)}
              className="absolute top-6 right-6 text-white/60 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-lg font-bold text-white mb-4">Upload Memorandum</h2>

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-white/80 font-medium mb-1.5">Group Category *</label>
                <select
                  value={uploadGroupId}
                  onChange={(e) => setUploadGroupId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/12 border border-white/20 rounded-xl text-white focus:outline-none focus:border-blue-400 transition-all font-medium"
                >
                  {memoGroups.map((g) => (
                    <option key={g.id} value={g.id} className="bg-slate-900 text-white">
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-white/80 font-medium mb-1.5">Memo Title *</label>
                <input
                  type="text"
                  required
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Revised Uniform Regulations"
                  className="w-full px-4 py-2.5 bg-white/12 border border-white/20 rounded-xl text-white placeholder-white/45 focus:outline-none focus:border-blue-400 transition-all font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-white/80 font-medium mb-1.5">Memo Number *</label>
                  <input
                    type="text"
                    required
                    value={uploadMemoNumber}
                    onChange={(e) => setUploadMemoNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white/12 border border-white/20 rounded-xl text-white font-mono focus:outline-none focus:border-blue-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-white/80 font-medium mb-1.5">Effective Date *</label>
                  <input
                    type="date"
                    required
                    value={uploadEffectiveDate}
                    onChange={(e) => setUploadEffectiveDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white/12 border border-white/20 rounded-xl text-white font-mono focus:outline-none focus:border-blue-400 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white/80 font-medium mb-1.5">Attach File (PDF or DOCX) *</label>
                <input
                  type="file"
                  accept=".pdf,.docx,.doc"
                  onChange={handleFileChange}
                  className="block w-full text-xs text-white/70 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-600 file:text-white file:font-semibold cursor-pointer"
                />
                {uploadFileName && (
                  <span className="text-[11px] text-emerald-300 mt-1 block font-medium">
                    Selected: {uploadFileName} ({uploadFormat})
                  </span>
                )}
              </div>

              <div>
                <label className="block text-white/80 font-medium mb-1.5">Signatory *</label>
                <input
                  type="text"
                  required
                  value={uploadSignatory}
                  onChange={(e) => setUploadSignatory(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/12 border border-white/20 rounded-xl text-white placeholder-white/45 focus:outline-none focus:border-blue-400 transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-white/80 font-medium mb-1.5">Summary</label>
                <textarea
                  rows={2}
                  value={uploadSummary}
                  onChange={(e) => setUploadSummary(e.target.value)}
                  placeholder="Short description..."
                  className="w-full px-4 py-2.5 bg-white/12 border border-white/20 rounded-xl text-white placeholder-white/45 focus:outline-none focus:border-blue-400 transition-all resize-none"
                />
              </div>

              {isUploading && (
                <div className="p-3 bg-blue-500/20 border border-blue-400/30 rounded-2xl flex items-center gap-2.5 text-xs text-blue-200 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping shrink-0" />
                  <span className="font-medium">{uploadStatus || 'Uploading document to Supabase...'}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/15">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  disabled={isUploading}
                  className="px-4 py-2.5 text-white/70 hover:text-white rounded-full font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-full shadow-[0_4px_16px_rgba(37,99,235,0.45)] border border-blue-400/40 transition-all cursor-pointer flex items-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Publishing...</span>
                    </>
                  ) : (
                    <span>Publish Memo</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE GROUP MODAL */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-slate-900/90 backdrop-blur-3xl rounded-3xl border border-white/25 shadow-[0_25px_60px_rgba(0,0,0,0.6)] p-6 sm:p-7 text-white">
            <button
              onClick={() => setIsGroupModalOpen(false)}
              className="absolute top-6 right-6 text-white/60 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-base font-bold text-white mb-2">
              {editingGroup ? 'Rename Memo Group' : 'New Memo Group'}
            </h2>

            {groupError && (
              <div className="mb-2 p-2 bg-red-500/20 border border-red-400/30 text-red-200 rounded-xl text-xs">
                {groupError}
              </div>
            )}

            <form onSubmit={handleGroupSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-white/80 font-medium mb-1.5">Group Name *</label>
                <input
                  type="text"
                  required
                  value={groupNameInput}
                  onChange={(e) => setGroupNameInput(e.target.value)}
                  placeholder="e.g. Operations Memorandums"
                  className="w-full px-4 py-2.5 bg-white/12 border border-white/20 rounded-xl text-white placeholder-white/45 focus:outline-none focus:border-blue-400 transition-all font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/15">
                <button
                  type="button"
                  onClick={() => setIsGroupModalOpen(false)}
                  className="px-4 py-2 text-white/70 hover:text-white rounded-full font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-full shadow-[0_4px_16px_rgba(37,99,235,0.45)] border border-blue-400/40 transition-all cursor-pointer"
                >
                  Save Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUPABASE CONNECTION & SQL SETUP GUIDE MODAL */}
      {isSupabaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl bg-slate-900/90 backdrop-blur-3xl rounded-3xl border border-white/25 shadow-[0_25px_60px_rgba(0,0,0,0.6)] p-6 sm:p-7 text-white max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsSupabaseModalOpen(false)}
              className="absolute top-6 right-6 text-white/60 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Supabase Cloud Connection</h2>
                <p className="text-xs text-white/70">FleetSync live integration &amp; storage setup</p>
              </div>
            </div>

            {/* Connection Status Cards */}
            <div className="space-y-3 mb-5">
              <div className="p-3.5 bg-white/10 rounded-2xl border border-white/15 text-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-white/60 block tracking-wider">Fleet Repository Storage Engine</span>
                  <span className="font-mono font-medium text-white text-[11px]">Server Proxy Protected · Encrypted REST API</span>
                </div>
                <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 rounded-full text-[10px] font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                  Active
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-emerald-500/15 rounded-2xl border border-emerald-400/30 flex items-start gap-2.5">
                  <Database className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-emerald-200 block">Fleet Database</span>
                    <span className="text-[11px] text-white/80">
                      Memorandums &amp; officer documents synced securely via server proxy.
                    </span>
                  </div>
                </div>

                <div className="p-3.5 bg-blue-500/15 rounded-2xl border border-blue-400/30 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-blue-300 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-blue-200 block">Backend Security</span>
                    <span className="text-[11px] text-white/80">
                      Credentials &amp; API keys concealed behind Express server routes.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-white/10 rounded-2xl border border-white/15 text-xs space-y-2 mb-4">
              <span className="font-bold text-white block">Fleet Storage Verification:</span>
              <p className="text-white/80 text-[11px] leading-relaxed">
                All document uploads, memo downloads, and officer permission updates are routed server-side. Direct database endpoints and credentials are hidden from browser dev tools.
              </p>
            </div>

            <div className="flex justify-end pt-2 border-t border-white/15">
              <button
                onClick={() => setIsSupabaseModalOpen(false)}
                className="px-6 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-full text-xs font-semibold cursor-pointer transition-all"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
