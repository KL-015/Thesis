import React, { useState } from 'react';
import { useFleet } from '../../context/FleetContext';
import {
  KeyRound,
  AlertCircle,
  X,
  Shield,
  User,
  Mail,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { login } = useFleet();

  const [activeTab, setActiveTab] = useState<'officer' | 'admin'>('officer');
  const [officerEmail, setOfficerEmail] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleOfficerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = officerEmail.trim();
    if (!cleanEmail) {
      setError('Please enter your officer email address.');
      return;
    }

    const res = login(cleanEmail);
    if (res.success) {
      onClose();
      setOfficerEmail('');
      setError(null);
    } else {
      setError(
        res.error ||
          `Access Denied: The email "${cleanEmail}" is not recognized or not added as a user by an Admin.`
      );
    }
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!adminUsername.trim() || !adminPassword.trim()) {
      setError('Please enter administrator username and password.');
      return;
    }

    const res = login(adminUsername.trim(), adminPassword.trim());
    if (res.success) {
      onClose();
      setError(null);
    } else {
      setError(res.error || 'Invalid administrator username or password.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900/85 backdrop-blur-3xl rounded-3xl border border-white/25 shadow-[0_25px_60px_rgba(0,0,0,0.6)] p-6 sm:p-7 text-white">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-white/60 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="mb-5">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center justify-center font-bold mb-3 shadow-2xs backdrop-blur-md">
            <KeyRound className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">System Login</h2>
          <p className="text-xs text-white/60 mt-1">
            Sign in as an Officer using registered email, or Administrator using credentials.
          </p>
        </div>

        {/* Tabs: Officer (Email Only) vs Administrator */}
        <div className="flex p-1 bg-black/30 backdrop-blur-md rounded-2xl mb-5 border border-white/15">
          <button
            type="button"
            onClick={() => {
              setActiveTab('officer');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'officer'
                ? 'bg-blue-600 text-white shadow-md border border-blue-400/30'
                : 'text-white/70 hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Officer (Email)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('admin');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'admin'
                ? 'bg-blue-600 text-white shadow-md border border-blue-400/30'
                : 'text-white/70 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Administrator</span>
          </button>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div className="mb-4 p-3.5 bg-red-500/20 border border-red-400/30 rounded-2xl text-xs text-red-200 flex items-start gap-2.5 animate-in fade-in duration-200 backdrop-blur-md">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <div className="leading-relaxed">{error}</div>
          </div>
        )}

        {/* TAB 1: Officer Email Sign In */}
        {activeTab === 'officer' && (
          <form onSubmit={handleOfficerSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-white/80 font-semibold mb-1.5">
                Officer Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-white/40 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={officerEmail}
                  onChange={(e) => setOfficerEmail(e.target.value)}
                  placeholder="e.g. officer@fleet.ops"
                  className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 text-xs focus:outline-none focus:border-blue-400 focus:bg-white/15 font-mono transition-all"
                />
              </div>
              <p className="text-[11px] text-white/60 mt-1.5">
                Enter your registered officer email address. If not recognized, access is denied until an Admin registers your account.
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-full transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(37,99,235,0.4)] border border-blue-400/30 cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Sign In with Email</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        )}

        {/* TAB 2: Administrator Sign In */}
        {activeTab === 'admin' && (
          <form onSubmit={handleAdminSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-white/80 font-semibold mb-1.5">
                Admin Username or Email
              </label>
              <input
                type="text"
                required
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                placeholder="e.g. admin or admin@fleet.ops"
                className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 text-xs focus:outline-none focus:border-blue-400 focus:bg-white/15 font-mono transition-all"
              />
            </div>

            <div>
              <label className="block text-white/80 font-semibold mb-1.5">Password</label>
              <input
                type="password"
                required
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Enter admin password"
                className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 text-xs focus:outline-none focus:border-blue-400 focus:bg-white/15 font-mono transition-all"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-full transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(37,99,235,0.4)] border border-blue-400/30 cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Sign In as Administrator</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

