import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  FileText,
  Search,
  Filter,
  Eye,
  Calendar,
  User,
  Shield,
  Layers,
  RefreshCw,
  X,
  ArrowRight,
} from 'lucide-react';

export default function AuditLogsPage() {
  const { token } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [moduleFilter, setModuleFilter] = useState('');
  const [emailFilter, setEmailFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedDiff, setSelectedDiff] = useState(null);

  useEffect(() => {
    fetchLogs();
  }, [moduleFilter, emailFilter]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (moduleFilter) queryParams.set('module', moduleFilter);
      if (emailFilter) queryParams.set('email', emailFilter);
      if (search) queryParams.set('search', search);

      const res = await fetch(`/api/admin-portal/audit-logs?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Fetch logs error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLogs();
  };

  const getActionBadge = (action) => {
    if (action.includes('CREATE') || action.includes('ADD') || action.includes('INVITE')) {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    }
    if (action.includes('DELETE') || action.includes('REVOKE')) {
      return 'bg-red-500/10 text-red-400 border-red-500/30';
    }
    if (action.includes('UPDATE') || action.includes('TOGGLE')) {
      return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    }
    return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-blue-400" />
            Audit Trail Explorer
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Enterprise Activity Log: Permanent immutable audit record tracking{' '}
            <strong className="text-slate-200">which email edited what</strong>, timestamp, and field deltas.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-2 self-start sm:self-auto border border-slate-700"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Audit Trail
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search keywords, reason, record ID..."
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </form>

        <div className="flex items-center gap-2">
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="">All Modules</option>
            <option value="MAIN_LEDGER">Main Page (Cashbook)</option>
            <option value="PARTNER_KHARCHA">Partner Kharcha (Galla)</option>
            <option value="VENDOR_PAGE">Vendor Khata</option>
            <option value="SALARY_RENT">Salary & Rent</option>
            <option value="PLATFORM_PROFIT">Platform P&L</option>
            <option value="INVESTMENT">Investment Tracker</option>
            <option value="USER_ACCESS">User Access & Permissions</option>
            <option value="AUTH">Authentication / Login</option>
          </select>

          <input
            type="text"
            value={emailFilter}
            onChange={(e) => setEmailFilter(e.target.value)}
            placeholder="Filter by user email..."
            className="px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4 font-bold">Timestamp</th>
                <th className="py-3 px-4 font-bold">Actor (Email)</th>
                <th className="py-3 px-3 font-bold">Module</th>
                <th className="py-3 px-3 font-bold">Action</th>
                <th className="py-3 px-4 font-bold">Description</th>
                <th className="py-3 px-3 font-bold text-right">Changes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No audit records found matching criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const hasDiff = log.old_values || log.new_values;
                  return (
                    <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-300 shrink-0">
                            {log.user_email?.charAt(0).toUpperCase()}
                          </div>
                          <div className="truncate">
                            <div className="font-semibold text-slate-200">{log.user_name || 'Admin'}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{log.user_email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-mono">
                          {log.module}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${getActionBadge(
                            log.action
                          )}`}
                        >
                          {log.action}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-300 max-w-xs truncate" title={log.description}>
                        {log.description}
                      </td>

                      <td className="py-3 px-3 text-right">
                        {hasDiff ? (
                          <button
                            onClick={() => setSelectedDiff(log)}
                            className="px-2.5 py-1 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-[10px] font-semibold transition-colors"
                          >
                            Inspect Diff
                          </button>
                        ) : (
                          <span className="text-slate-600 text-[10px]">None</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Diff Inspector Modal */}
      {selectedDiff && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-400" />
                  Mutation Delta Details (Audit Log #{selectedDiff.id})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">
                  By {selectedDiff.user_email} • {selectedDiff.module} ({selectedDiff.action})
                </p>
              </div>
              <button onClick={() => setSelectedDiff(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Previous State */}
              <div className="bg-slate-950 p-4 rounded-xl border border-red-500/30">
                <div className="text-[11px] font-bold uppercase tracking-wider text-red-400 mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-400"></span> Previous Value (Before)
                </div>
                <pre className="text-[11px] font-mono text-red-300/80 bg-red-950/20 p-3 rounded-lg overflow-x-auto max-h-64 whitespace-pre-wrap">
                  {selectedDiff.old_values ? JSON.stringify(selectedDiff.old_values, null, 2) : 'None (Created as new record)'}
                </pre>
              </div>

              {/* Updated State */}
              <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/30">
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span> New Value (After)
                </div>
                <pre className="text-[11px] font-mono text-emerald-300/80 bg-emerald-950/20 p-3 rounded-lg overflow-x-auto max-h-64 whitespace-pre-wrap">
                  {selectedDiff.new_values ? JSON.stringify(selectedDiff.new_values, null, 2) : 'None (Deleted record)'}
                </pre>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedDiff(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
