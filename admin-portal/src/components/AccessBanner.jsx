import React from 'react';
import { Eye, ShieldAlert, Edit3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AccessBanner({ pageKey }) {
  const { isSuperAdmin, canEdit } = useAuth();
  const hasEdit = isSuperAdmin() || canEdit(pageKey);

  if (hasEdit) {
    return null; // Don't clutter UI when user has full edit access
  }

  return (
    <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-amber-300">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
          <Eye className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-amber-200">Read-Only View Mode Active</h4>
          <p className="text-xs text-amber-300/80">
            The Super Admin has granted you View-Only access to this module. Form inputs, add/edit buttons, and deletions are disabled for this account.
          </p>
        </div>
      </div>
      <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs font-semibold">
        Modifications Locked
      </div>
    </div>
  );
}
