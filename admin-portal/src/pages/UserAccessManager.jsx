import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  UserPlus,
  Check,
  X,
  Eye,
  Edit3,
  Trash2,
  Power,
  RefreshCw,
  Search,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

const PAGE_MODULES = [
  { key: 'main_ledger', label: 'Main Page (Cashbook)', sub: 'Acube, Treo, Tritoy, Cash' },
  { key: 'partner_kharcha', label: 'Partner Kharcha (गल्ला)', sub: 'Daily Counter Withdrawals' },
  { key: 'vendor_page', label: 'Vendor Page (Khata)', sub: 'Purchases, Payments, Due' },
  { key: 'salary_rent', label: 'सबका Salary + Rent', sub: 'Staff Payroll & Property Rent' },
  { key: 'platform_profit', label: 'Platform Profit (P&L)', sub: 'E-commerce Channel P&L' },
  { key: 'investment', label: 'Investment Tracker', sub: 'Capital Contributions' },
  { key: 'audit_logs', label: 'Audit Log Explorer', sub: 'Activity Log Review' },
];

export default function UserAccessManager() {
  const { token, isSuperAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    name: '',
    role: 'member',
    initialPassword: '',
    permissions: PAGE_MODULES.reduce((acc, m) => ({ ...acc, [m.key]: 'view' }), {}),
  });
  const [savingId, setSavingId] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin-portal/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users || []);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to load users' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionToggle = (userId, pageKey, nextLevel) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        if (u.permissions === 'ALL_EDIT') return u;
        return {
          ...u,
          permissions: {
            ...u.permissions,
            [pageKey]: nextLevel,
          },
          hasUnsavedChanges: true,
        };
      })
    );
  };

  const handleSaveUserPermissions = async (userObj) => {
    try {
      setSavingId(userObj.id);
      const res = await fetch(`/api/admin-portal/users/${userObj.id}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          permissions: userObj.permissions,
          role: userObj.role,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `Permissions saved for ${userObj.email}` });
        setUsers((prev) =>
          prev.map((u) => (u.id === userObj.id ? { ...u, hasUnsavedChanges: false } : u))
        );
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleStatus = async (userObj) => {
    try {
      const nextStatus = !userObj.is_active;
      const res = await fetch(`/api/admin-portal/users/${userObj.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active: nextStatus }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userObj.id ? { ...u, is_active: nextStatus } : u))
        );
        setMessage({
          type: 'success',
          text: `User ${userObj.email} ${nextStatus ? 'activated' : 'deactivated'}`,
        });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleDeleteUser = async (userObj) => {
    if (!window.confirm(`Are you sure you want to permanently revoke access for ${userObj.email}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin-portal/users/${userObj.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userObj.id));
        setMessage({ type: 'success', text: `Revoked access for ${userObj.email}` });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin-portal/users/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(inviteForm),
      });

      const data = await res.json();
      if (res.ok) {
        setShowInviteModal(false);
        setInviteForm({
          email: '',
          name: '',
          role: 'member',
          initialPassword: '',
          permissions: PAGE_MODULES.reduce((acc, m) => ({ ...acc, [m.key]: 'view' }), {}),
        });
        setMessage({ type: 'success', text: `User ${data.user?.email} added to authorized list!` });
        fetchUsers();
      } else {
        alert(data.error || 'Failed to add user');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.name && u.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-purple-400" />
            User Access & Permissions Control
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Super Admin Governance: Whitelist verified email addresses and select which page is accessible in{' '}
            <strong className="text-blue-400">Edit Mode</strong> vs <strong className="text-amber-400">View Mode</strong>.
          </p>
        </div>

        <button
          onClick={() => setShowInviteModal(true)}
          className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-lg shadow-purple-600/20 transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          Whitelist New Email
        </button>
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border border-red-500/30 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {message.text}
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between gap-4 glass-panel p-3 rounded-xl border border-slate-800">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search authorized user email or name..."
            className="w-full pl-9 pr-4 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="text-xs text-slate-400 flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span> Edit (Full Access)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> View-Only
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-700 inline-block"></span> No Access (Locked)
          </span>
        </div>
      </div>

      {/* Users Matrix Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4 font-bold">User / Email</th>
                <th className="py-3 px-3 font-bold">Role</th>
                {PAGE_MODULES.map((m) => (
                  <th key={m.key} className="py-3 px-2 font-bold text-center min-w-[95px]">
                    <span title={m.sub}>{m.label.split(' (')[0]}</span>
                  </th>
                ))}
                <th className="py-3 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredUsers.map((u) => {
                const isSuper = u.role === 'super_admin';
                return (
                  <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                    {/* User Info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-300 font-bold text-xs shrink-0">
                          {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                            {u.name || 'User'}
                            {!u.is_active && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                                Deactivated
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isSuper
                            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>

                    {/* Page Permission Toggles */}
                    {PAGE_MODULES.map((m) => {
                      if (isSuper) {
                        return (
                          <td key={m.key} className="py-3.5 px-2 text-center">
                            <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                              Full Edit
                            </span>
                          </td>
                        );
                      }

                      const current = u.permissions?.[m.key] || 'none';

                      return (
                        <td key={m.key} className="py-3.5 px-2 text-center">
                          <div className="inline-flex rounded-lg bg-slate-900 border border-slate-800 p-0.5">
                            <button
                              type="button"
                              onClick={() => handlePermissionToggle(u.id, m.key, 'none')}
                              title="No Access (Hidden)"
                              className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
                                current === 'none' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              Off
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePermissionToggle(u.id, m.key, 'view')}
                              title="View-Only Access (Read Only)"
                              className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
                                current === 'view' ? 'bg-amber-600 text-white' : 'text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              View
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePermissionToggle(u.id, m.key, 'edit')}
                              title="Edit Mode (Full Modifications)"
                              className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
                                current === 'edit' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              Edit
                            </button>
                          </div>
                        </td>
                      );
                    })}

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {u.hasUnsavedChanges && !isSuper && (
                          <button
                            onClick={() => handleSaveUserPermissions(u)}
                            disabled={savingId === u.id}
                            className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition-all shadow"
                          >
                            {savingId === u.id ? 'Saving...' : 'Save'}
                          </button>
                        )}

                        {u.email !== 'ashishpsd91@gmail.com' && (
                          <>
                            <button
                              onClick={() => handleToggleStatus(u)}
                              title={u.is_active ? 'Deactivate Account' : 'Activate Account'}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                u.is_active
                                  ? 'bg-slate-800 text-slate-400 hover:text-amber-400 border-slate-700'
                                  : 'bg-red-500/10 text-red-400 hover:text-emerald-400 border-red-500/30'
                              }`}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u)}
                              title="Revoke All Access"
                              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-red-400 border border-slate-700 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Whitelist New Email Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-purple-400" />
                Whitelist New User Email
              </h3>
              <button onClick={() => setShowInviteModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. anurag@pandanest.in or aman@gmail.com"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Anurag Sharma"
                    value={inviteForm.name}
                    onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Portal Role</label>
                  <select
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="member">Staff / Partner (Granular)</option>
                    <option value="super_admin">Super Admin (Unrestricted)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                  Optional Password (or user can use Email OTP)
                </label>
                <input
                  type="password"
                  placeholder="Leave blank to use OTP login"
                  value={inviteForm.initialPassword}
                  onChange={(e) => setInviteForm({ ...inviteForm, initialPassword: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Initial Permissions Assignment */}
              {inviteForm.role !== 'super_admin' && (
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-2">
                    Default Page Access Level
                  </label>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {PAGE_MODULES.map((m) => (
                      <div
                        key={m.key}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs"
                      >
                        <span className="text-slate-300 font-medium">{m.label}</span>
                        <select
                          value={inviteForm.permissions[m.key]}
                          onChange={(e) =>
                            setInviteForm({
                              ...inviteForm,
                              permissions: {
                                ...inviteForm.permissions,
                                [m.key]: e.target.value,
                              },
                            })
                          }
                          className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white focus:outline-none"
                        >
                          <option value="none">Off (No Access)</option>
                          <option value="view">View Only</option>
                          <option value="edit">Edit Mode</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/20"
                >
                  Confirm & Whitelist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
