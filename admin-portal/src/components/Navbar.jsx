import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, LogOut, User, Lock, Eye, Edit3 } from 'lucide-react';

export default function Navbar({ activeTab, pageTitle }) {
  const { user, logout, isSuperAdmin, getAccessLevel } = useAuth();
  const currentLevel = getAccessLevel(activeTab);

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🐼</span>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              Panda Nest
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                admin.pandanest.in
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">Executive ERP & Multi-Firm Financial Portal</p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 pl-4 border-l border-slate-800">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Active Module:</span>
          <span className="text-sm font-semibold text-slate-200">{pageTitle}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Permission Mode Pill */}
        {isSuperAdmin() ? (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            Super Admin (Unrestricted)
          </div>
        ) : currentLevel === 'edit' ? (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold">
            <Edit3 className="w-3.5 h-3.5" />
            Edit Mode (Full Access)
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
            <Eye className="w-3.5 h-3.5" />
            View-Only (Read Mode)
          </div>
        )}

        {/* User Profile Pill */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-200">
          <div className="w-7 h-7 rounded-lg bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-300 font-bold text-xs">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-xs font-semibold leading-tight text-slate-100">{user?.name || 'Admin'}</div>
            <div className="text-[10px] text-slate-400 leading-tight font-mono">{user?.email}</div>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={logout}
          title="Sign Out"
          className="p-2 rounded-xl bg-slate-800/80 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700/60 hover:border-red-500/30 transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
