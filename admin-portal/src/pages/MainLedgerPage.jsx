import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import AccessBanner from '../components/AccessBanner';
import {
  Calendar,
  Plus,
  Trash2,
  Edit2,
  Mail,
  Send,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  Building,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Coins,
} from 'lucide-react';

export default function MainLedgerPage() {
  const { token, canEdit, isSuperAdmin } = useAuth();
  const hasEdit = isSuperAdmin() || canEdit('main_ledger');

  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [firms, setFirms] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eodSending, setEodSending] = useState(false);
  const [message, setMessage] = useState(null);

  // Add Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalFirm, setModalFirm] = useState('acube');
  const [modalFlow, setModalFlow] = useState('in'); // 'in' | 'out'
  const [formCategory, setFormCategory] = useState('Flipkart (f)');
  const [formParty, setFormParty] = useState('');
  const [formReason, setFormReason] = useState('');
  const [formAmount, setFormAmount] = useState('');

  // Edit Modal State
  const [editingEntry, setEditingEntry] = useState(null);
  const [editFlow, setEditFlow] = useState('in');
  const [editCategory, setEditCategory] = useState('');
  const [editParty, setEditParty] = useState('');
  const [editReason, setEditReason] = useState('');
  const [editAmount, setEditAmount] = useState('');

  useEffect(() => {
    fetchLedgerData();
  }, [date]);

  const fetchLedgerData = async () => {
    try {
      setLoading(true);
      const [firmsRes, entriesRes] = await Promise.all([
        fetch('/api/admin-portal/accounting/firms', { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/admin-portal/accounting/ledger-entries?date=${date}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const firmsData = await firmsRes.json();
      const entriesData = await entriesRes.json();

      if (firmsRes.ok) setFirms(firmsData.firms || []);
      if (entriesRes.ok) setEntries(entriesData.entries || []);
    } catch (err) {
      console.error('Fetch ledger error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = (firmCode, flowType) => {
    if (!hasEdit) return;
    setModalFirm(firmCode);
    setModalFlow(flowType);
    setFormCategory(flowType === 'in' ? 'Flipkart (f)' : 'Vendor');
    setFormParty('');
    setFormReason('');
    setFormAmount('');
    setModalOpen(true);
  };

  const handleOpenEditModal = (entry) => {
    if (!hasEdit) return;
    setEditingEntry(entry);
    setEditFlow(entry.flow_type);
    setEditCategory(entry.category || '');
    setEditParty(entry.party_name || '');
    setEditReason(entry.reason || '');
    setEditAmount(String(entry.amount || ''));
  };

  const handleSaveEntry = async (e) => {
    e.preventDefault();
    if (!formAmount || Number(formAmount) <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    try {
      const res = await fetch('/api/admin-portal/accounting/ledger-entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firm_code: modalFirm,
          flow_type: modalFlow,
          entry_date: date,
          category: formCategory,
          party_name: formParty,
          reason: formReason,
          amount: Number(formAmount),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setEntries([data.entry, ...entries]);
        setModalOpen(false);
        setMessage({ type: 'success', text: `Transaction of ₹${formAmount} recorded.` });
      } else {
        alert(data.error || 'Failed to save transaction');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdateEntry = async (e) => {
    e.preventDefault();
    if (!editAmount || Number(editAmount) <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    try {
      const res = await fetch(`/api/admin-portal/accounting/ledger-entries/${editingEntry.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firm_code: editingEntry.firm_code,
          flow_type: editFlow,
          entry_date: date,
          category: editCategory,
          party_name: editParty,
          reason: editReason,
          amount: Number(editAmount),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setEntries(entries.map((e) => (e.id === editingEntry.id ? data.entry : e)));
        setEditingEntry(null);
        setMessage({ type: 'success', text: `Transaction #${editingEntry.id} updated successfully.` });
      } else {
        alert(data.error || 'Failed to update transaction');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteEntry = async (id) => {
    if (!hasEdit) return;
    if (!window.confirm('Delete this transaction?')) return;

    try {
      const res = await fetch(`/api/admin-portal/accounting/ledger-entries/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setEntries(entries.filter((e) => e.id !== id));
        setMessage({ type: 'success', text: 'Transaction removed.' });
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleTriggerEODReports = async () => {
    if (!hasEdit) return;
    try {
      setEodSending(true);
      const res = await fetch('/api/admin-portal/accounting/send-eod-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ date }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({
          type: 'success',
          text: `EOD Reports dispatched! Email + SMS delivered for date ${date}.`,
        });
      } else {
        alert(data.error || 'Failed to send reports');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setEodSending(false);
    }
  };

  // Helper to compute category subtotal
  const getCategorySubtotal = (inEntries, key) => {
    return inEntries
      .filter((e) => {
        const cat = (e.category || '').toLowerCase();
        if (key === 'f') return cat.includes('flipkart') || cat === 'f' || cat.includes('(f)');
        if (key === 'm') return cat.includes('meesho') || cat === 'm' || cat.includes('(m)');
        if (key === 'A') return cat.includes('amazon') || cat === 'a' || cat.includes('(a)');
        if (key === 'koi_aur') {
          return !cat.includes('flipkart') && !cat.includes('meesho') && !cat.includes('amazon') && cat !== 'f' && cat !== 'm' && cat !== 'a';
        }
        return false;
      })
      .reduce((sum, e) => sum + Number(e.amount), 0);
  };

  // Aggregations
  const overallIn = entries.filter((e) => e.flow_type === 'in').reduce((s, e) => s + Number(e.amount), 0);
  const overallOut = entries.filter((e) => e.flow_type === 'out').reduce((s, e) => s + Number(e.amount), 0);
  const overallNet = overallIn - overallOut;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <AccessBanner pageKey="main_ledger" />

      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Building className="w-5 h-5 text-blue-400" />
            Main Page • Multi-Firm Cashbook & Daily Ledger
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Tracking In/Out financial flows across <strong className="text-blue-300">Acube</strong>,{' '}
            <strong className="text-blue-300">Treo</strong>, <strong className="text-blue-300">Tritoy</strong> &{' '}
            <strong className="text-blue-300">Cash</strong> with automated partner notifications.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Date Picker */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
            <Calendar className="w-4 h-4 text-blue-400" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent text-white text-xs focus:outline-none cursor-pointer"
            />
          </div>

          {/* EOD Trigger Button */}
          {hasEdit && (
            <button
              onClick={handleTriggerEODReports}
              disabled={eodSending}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg shadow-blue-600/20 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {eodSending ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Mail className="w-3.5 h-3.5" />
              )}
              Send EOD Email/SMS Reports
            </button>
          )}
        </div>
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

      {/* 4 Multi-Firm Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {firms.map((firm) => {
          const firmEntries = entries.filter((e) => e.firm_code === firm.code);
          const inEntries = firmEntries.filter((e) => e.flow_type === 'in');
          const outEntries = firmEntries.filter((e) => e.flow_type === 'out');

          const inTotal = inEntries.reduce((s, e) => s + Number(e.amount), 0);
          const outTotal = outEntries.reduce((s, e) => s + Number(e.amount), 0);
          const firmBalance = inTotal - outTotal;

          // Subtotals for f, m, A, koi aur (Handwritten Layout)
          const fTotal = getCategorySubtotal(inEntries, 'f');
          const mTotal = getCategorySubtotal(inEntries, 'm');
          const aTotal = getCategorySubtotal(inEntries, 'A');
          const koiAurTotal = getCategorySubtotal(inEntries, 'koi_aur');

          return (
            <div
              key={firm.code}
              className="glass-panel rounded-2xl border border-slate-800 flex flex-col justify-between overflow-hidden shadow-lg"
            >
              {/* Firm Header */}
              <div className="p-4 bg-slate-900/90 border-b border-slate-800">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-white tracking-tight">{firm.name}</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono uppercase">
                    {firm.code}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                  <Mail className="w-3 h-3 text-blue-400" />
                  <span>Email: {firm.assigned_name || 'Admin'}</span>
                </div>
              </div>

              {/* In vs Out Sections */}
              <div className="p-3 space-y-4 flex-1">
                {/* INFLOW SECTION */}
                <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/80">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <ArrowDownLeft className="w-3.5 h-3.5" /> In (Inflows)
                    </span>
                    {hasEdit && (
                      <button
                        onClick={() => handleOpenAddModal(firm.code, 'in')}
                        className="p-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 transition-colors"
                        title="Add Inflow"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Explicit Category Subtotals Matching Handwritten Image 1 */}
                  <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px] font-mono bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold">f =</span>
                      <span className="text-emerald-300 font-bold">₹{fTotal.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold">m =</span>
                      <span className="text-emerald-300 font-bold">₹{mTotal.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold">A =</span>
                      <span className="text-emerald-300 font-bold">₹{aTotal.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold">koi aur =</span>
                      <span className="text-emerald-300 font-bold">₹{koiAurTotal.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Individual Transaction Entries List */}
                  <div className="mt-2 space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {inEntries.length === 0 ? (
                      <p className="text-[11px] text-slate-600 italic py-1 text-center">No transactions</p>
                    ) : (
                      inEntries.map((e) => (
                        <div
                          key={e.id}
                          className="flex items-center justify-between p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs"
                        >
                          <div className="truncate mr-2">
                            <span className="text-emerald-400 font-semibold text-[11px] mr-1">[{e.category || 'In'}]</span>
                            <span className="text-slate-300 text-[11px] truncate">{e.reason || e.party_name || '-'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="font-mono font-bold text-emerald-300 text-xs">
                              ₹{Number(e.amount).toLocaleString('en-IN')}
                            </span>
                            {hasEdit && (
                              <>
                                <button
                                  onClick={() => handleOpenEditModal(e)}
                                  className="text-slate-500 hover:text-blue-400"
                                  title="Edit entry"
                                >
                                  <Edit2 className="w-2.5 h-2.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteEntry(e.id)}
                                  className="text-slate-500 hover:text-red-400"
                                  title="Delete entry"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="mt-1.5 pt-1 border-t border-slate-800 text-right text-[11px] font-mono text-emerald-400 font-bold">
                    Total In = ₹{inTotal.toLocaleString('en-IN')}
                  </div>
                </div>

                {/* OUTFLOW SECTION */}
                <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/80">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 text-[11px] font-bold text-red-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <ArrowUpRight className="w-3.5 h-3.5" /> Out (Outflows)
                    </span>
                    {hasEdit && (
                      <button
                        onClick={() => handleOpenAddModal(firm.code, 'out')}
                        className="p-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 transition-colors"
                        title="Add Outflow"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {outEntries.length === 0 ? (
                      <p className="text-[11px] text-slate-600 italic py-2 text-center">No outflows logged</p>
                    ) : (
                      outEntries.map((e) => {
                        const isGallaSync = e.reason && e.reason.includes('[GALLA');
                        return (
                          <div
                            key={e.id}
                            className={`flex items-center justify-between p-1.5 rounded-lg border text-xs ${
                              isGallaSync
                                ? 'bg-amber-950/20 border-amber-500/30'
                                : 'bg-slate-950/60 border-slate-800/80'
                            }`}
                          >
                            <div className="truncate mr-2">
                              {isGallaSync && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold mr-1">
                                  GALLA
                                </span>
                              )}
                              <span className="text-red-400 font-semibold text-[11px] mr-1">
                                [{e.party_name || e.category || 'Out'}]
                              </span>
                              <span className="text-slate-300 text-[11px] truncate">
                                {e.reason ? e.reason.replace(/\[GALLA #[0-9]+\]\s*/, '') : '-'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="font-mono font-bold text-red-300 text-xs">
                                ₹{Number(e.amount).toLocaleString('en-IN')}
                              </span>
                              {hasEdit && (
                                <>
                                  <button
                                    onClick={() => handleOpenEditModal(e)}
                                    className="text-slate-500 hover:text-blue-400"
                                    title="Edit entry"
                                  >
                                    <Edit2 className="w-2.5 h-2.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteEntry(e.id)}
                                    className="text-slate-500 hover:text-red-400"
                                    title="Delete entry"
                                  >
                                    <Trash2 className="w-2.5 h-2.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div className="mt-1.5 pt-1 border-t border-slate-800 text-right text-[11px] font-mono text-red-400 font-bold">
                    Total Out = ₹{outTotal.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Firm Footer: Balance */}
              <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Net Balance:</span>
                <span
                  className={`font-mono font-bold text-sm ${
                    firmBalance >= 0 ? 'text-blue-400' : 'text-red-400'
                  }`}
                >
                  ₹{firmBalance.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Grand Consolidated Total Banner */}
      <div className="glass-panel p-5 rounded-2xl border border-blue-500/30 bg-gradient-to-r from-blue-950/40 via-slate-900/60 to-purple-950/40 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase font-bold tracking-widest text-blue-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
              Overall Consolidated EOD Summary (Total = Overall)
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Automated trigger dispatched via <strong className="text-slate-200">Email & SMS</strong> to management partners.
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-[11px] text-slate-400">Total Inflows</div>
              <div className="text-base font-bold font-mono text-emerald-400">
                ₹{overallIn.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="text-right">
              <div className="text-[11px] text-slate-400">Total Outflows</div>
              <div className="text-base font-bold font-mono text-red-400">
                ₹{overallOut.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="text-right pl-4 border-l border-slate-800">
              <div className="text-[11px] text-slate-400">Net Daily Liquidity</div>
              <div className="text-xl font-extrabold font-mono text-blue-400">
                ₹{overallNet.toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Transaction Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                {modalFlow === 'in' ? (
                  <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                ) : (
                  <ArrowUpRight className="w-4 h-4 text-red-400" />
                )}
                Add {modalFlow === 'in' ? 'Inflow' : 'Outflow'} for {modalFirm.toUpperCase()}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEntry} className="space-y-4 mt-4">
              {modalFlow === 'in' ? (
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Channel / Source</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                  >
                    <option value="Flipkart (f)">Flipkart (f)</option>
                    <option value="Meesho (m)">Meesho (m)</option>
                    <option value="Amazon (A)">Amazon (A)</option>
                    <option value="Koi Aur (Other)">Koi Aur (Others)</option>
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Expense Category</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                    >
                      <option value="Vendor">Vendor Payout</option>
                      <option value="Partner Draw">Partner Withdrawal</option>
                      <option value="Salary">Salary</option>
                      <option value="Rent">Rent</option>
                      <option value="Operational">Operational Expense</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Party / Partner Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Nikhil, Ashish, Aman"
                      value={formParty}
                      onChange={(e) => setFormParty(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Reason / Description</label>
                <input
                  type="text"
                  placeholder="e.g. Daily sales settlement, Raw material bill, Personal expense"
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 25000"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 rounded-xl text-white text-xs font-semibold shadow-lg ${
                    modalFlow === 'in' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'
                  }`}
                >
                  Record Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Transaction Modal */}
      {editingEntry && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-400" />
                Edit Transaction #{editingEntry.id} ({editingEntry.firm_code.toUpperCase()})
              </h3>
              <button onClick={() => setEditingEntry(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateEntry} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Flow Type</label>
                  <select
                    value={editFlow}
                    onChange={(e) => setEditFlow(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                  >
                    <option value="in">In (Inflow)</option>
                    <option value="out">Out (Outflow)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Category / Tag</label>
                  <input
                    type="text"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Party / Partner Name</label>
                <input
                  type="text"
                  value={editParty}
                  onChange={(e) => setEditParty(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Reason / Description</label>
                <input
                  type="text"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingEntry(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20"
                >
                  Update Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
