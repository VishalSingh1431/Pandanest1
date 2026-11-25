import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import AccessBanner from '../components/AccessBanner';
import {
  Wallet,
  Calendar,
  Plus,
  Trash2,
  Edit2,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  X,
  CreditCard,
  Coins,
  RefreshCw,
} from 'lucide-react';

const DEFAULT_PARTNERS = ['Ashish', 'Aman', 'Anurag', 'Unknown'];

export default function PartnerKharchaPage() {
  const { token, canEdit, isSuperAdmin } = useAuth();
  const hasEdit = isSuperAdmin() || canEdit('partner_kharcha');

  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [partnerList, setPartnerList] = useState(DEFAULT_PARTNERS);
  const [message, setMessage] = useState(null);

  // Add Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState('Ashish');
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState('');
  const [newPartnerName, setNewPartnerName] = useState('');
  const [showAddPartnerInput, setShowAddPartnerInput] = useState(false);

  // Edit Modal State
  const [editingExpense, setEditingExpense] = useState(null);
  const [editPartner, setEditPartner] = useState('');
  const [editReason, setEditReason] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');

  useEffect(() => {
    fetchExpenses();
  }, [date]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin-portal/accounting/galla?date=${date}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setExpenses(data.expenses || []);

        // Also dynamically add any partner names from records if not already in list
        const loggedPartners = (data.expenses || []).map((e) => e.partner_name);
        const combined = Array.from(new Set([...DEFAULT_PARTNERS, ...loggedPartners]));
        setPartnerList(combined);
      }
    } catch (err) {
      console.error('Fetch galla error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogExpense = async (e) => {
    e.preventDefault();
    if (!reason.trim() || !amount || Number(amount) <= 0) {
      alert('Please enter a valid reason and amount.');
      return;
    }

    try {
      const res = await fetch('/api/admin-portal/accounting/galla', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          partner_name: selectedPartner,
          entry_date: date,
          reason: reason.trim(),
          amount: Number(amount),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setExpenses([data.expense, ...expenses]);
        setModalOpen(false);
        setReason('');
        setAmount('');
        setMessage({ type: 'success', text: `Logged ₹${amount} for ${selectedPartner} (Auto-synced to Cash Outflows on Page 1).` });
      } else {
        alert(data.error || 'Failed to record expense');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleOpenEditModal = (expense) => {
    if (!hasEdit) return;
    setEditingExpense(expense);
    setEditPartner(expense.partner_name);
    setEditReason(expense.reason);
    setEditAmount(String(expense.amount));
    setEditDate(expense.entry_date || date);
  };

  const handleUpdateExpense = async (e) => {
    e.preventDefault();
    if (!editReason.trim() || !editAmount || Number(editAmount) <= 0) {
      alert('Please enter a valid reason and amount.');
      return;
    }

    try {
      const res = await fetch(`/api/admin-portal/accounting/galla/${editingExpense.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          partner_name: editPartner,
          entry_date: editDate,
          reason: editReason.trim(),
          amount: Number(editAmount),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setExpenses(expenses.map((item) => (item.id === editingExpense.id ? data.expense : item)));
        setEditingExpense(null);
        setMessage({ type: 'success', text: 'Expense updated and synced with Cash Outflows.' });
      } else {
        alert(data.error || 'Failed to update expense');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!hasEdit) return;
    if (!window.confirm('Delete this partner expense entry? (Will also remove synced Cash Outflow on Page 1)')) return;

    try {
      const res = await fetch(`/api/admin-portal/accounting/galla/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setExpenses(expenses.filter((e) => e.id !== id));
        setMessage({ type: 'success', text: 'Expense entry deleted and synced Cash entry removed.' });
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddNewPartner = (e) => {
    e.preventDefault();
    if (!newPartnerName.trim()) return;
    const clean = newPartnerName.trim();
    if (!partnerList.includes(clean)) {
      setPartnerList([...partnerList, clean]);
      setSelectedPartner(clean);
    }
    setNewPartnerName('');
    setShowAddPartnerInput(false);
  };

  const totalGallaExpense = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <AccessBanner pageKey="partner_kharcha" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-400" />
            Partner Kharcha • गल्ला (Daily Petty Cash Counter)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Tracking daily counter withdrawals and personal petty expenses for{' '}
            <strong className="text-amber-300">Ashish</strong>, <strong className="text-amber-300">Aman</strong>,{' '}
            <strong className="text-amber-300">Anurag</strong> & others directly from the till.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
            <Calendar className="w-4 h-4 text-amber-400" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent text-white text-xs focus:outline-none cursor-pointer"
            />
          </div>

          {hasEdit && (
            <button
              onClick={() => {
                setModalOpen(true);
                setReason('');
                setAmount('');
              }}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow-lg shadow-amber-600/20 flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              Log Partner Expense
            </button>
          )}
        </div>
      </div>

      {/* Live Auto-Sync to Page 1 Badge */}
      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <Coins className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>Live Auto-Sync Active:</strong> Every counter expense logged in Galla automatically creates a synchronized Cash Outflow entry on{' '}
            <strong className="underline text-amber-200">Page 1 (Main Cashbook)</strong> tagged{' '}
            <code className="bg-amber-950/80 px-1.5 py-0.5 rounded text-amber-300 border border-amber-500/30 font-mono text-[11px]">[GALLA]</code>.
          </span>
        </div>
        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
          Auto Dual-Entry
        </span>
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

      {/* Daily Summary Metric Card */}
      <div className="glass-panel p-4 rounded-2xl border border-amber-500/30 bg-amber-950/20 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase font-bold text-amber-400 tracking-wider">Total Galla Kharcha Today</div>
          <div className="text-xs text-slate-400 mt-0.5">Sum of all partner counter withdrawals for {date}</div>
        </div>
        <div className="text-2xl font-extrabold font-mono text-amber-300">
          ₹{totalGallaExpense.toLocaleString('en-IN')}
        </div>
      </div>

      {/* Partner Columns Table Grid matching handwritten Part-2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {partnerList.map((partner) => {
          const partnerExpenses = expenses.filter(
            (e) => e.partner_name.toLowerCase() === partner.toLowerCase()
          );
          const partnerTotal = partnerExpenses.reduce((s, e) => s + Number(e.amount), 0);

          return (
            <div
              key={partner}
              className="glass-panel rounded-2xl border border-slate-800 flex flex-col justify-between overflow-hidden shadow-lg"
            >
              {/* Partner Card Header */}
              <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-white">{partner}</h3>
                  <span className="text-[10px] text-slate-400">Personal / Counter</span>
                </div>
                {hasEdit && (
                  <button
                    onClick={() => {
                      setSelectedPartner(partner);
                      setModalOpen(true);
                    }}
                    className="p-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300"
                    title={`Add expense for ${partner}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Transactions Table: Reason | Money */}
              <div className="p-3 flex-1">
                <div className="grid grid-cols-12 text-[10px] uppercase font-bold text-slate-400 pb-1.5 border-b border-slate-800">
                  <span className="col-span-7">Reason</span>
                  <span className="col-span-5 text-right">Money</span>
                </div>

                <div className="mt-2 space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {partnerExpenses.length === 0 ? (
                    <p className="text-[11px] text-slate-600 italic py-4 text-center">No expenses logged</p>
                  ) : (
                    partnerExpenses.map((e) => (
                      <div
                        key={e.id}
                        className="grid grid-cols-12 items-center p-2 rounded-lg bg-slate-950/60 border border-slate-800 text-xs"
                      >
                        <div className="col-span-6 truncate text-slate-300 text-[11px]" title={e.reason}>
                          {e.reason}
                        </div>
                        <div className="col-span-6 text-right font-mono font-bold text-amber-300 text-xs flex items-center justify-end gap-1.5">
                          <span>₹{Number(e.amount).toLocaleString('en-IN')}</span>
                          {hasEdit && (
                            <div className="flex items-center gap-1 shrink-0 ml-1">
                              <button
                                onClick={() => handleOpenEditModal(e)}
                                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-amber-300"
                                title="Edit expense entry"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteExpense(e.id)}
                                className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-red-400"
                                title="Delete expense entry"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Card Footer: Partner Total */}
              <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Total:</span>
                <span className="font-mono font-bold text-sm text-amber-400">
                  ₹{partnerTotal.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Log Expense Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-400" />
                Log Partner Counter Kharcha
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLogExpense} className="space-y-4 mt-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold uppercase text-slate-300">Partner</label>
                  <button
                    type="button"
                    onClick={() => setShowAddPartnerInput(!showAddPartnerInput)}
                    className="text-xs text-amber-400 hover:underline"
                  >
                    + Add New Partner
                  </button>
                </div>

                {showAddPartnerInput ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter new partner name..."
                      value={newPartnerName}
                      onChange={(e) => setNewPartnerName(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddNewPartner}
                      className="px-3 py-1 bg-amber-600 rounded-xl text-xs text-white font-semibold"
                    >
                      Add
                    </button>
                  </div>
                ) : (
                  <select
                    value={selectedPartner}
                    onChange={(e) => setSelectedPartner(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                  >
                    {partnerList.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Reason / Purpose *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lunch kharcha, Fuel, Cash advance, Home grocery"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Money / Amount (₹) *</label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 500"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
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
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg shadow-amber-600/20"
                >
                  Save & Sync to Cash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Expense Modal */}
      {editingExpense && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-amber-400" />
                Edit Galla Counter Expense
              </h3>
              <button onClick={() => setEditingExpense(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateExpense} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Partner</label>
                  <select
                    value={editPartner}
                    onChange={(e) => setEditPartner(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                  >
                    {partnerList.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Date</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Reason / Purpose *</label>
                <input
                  type="text"
                  required
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Money / Amount (₹) *</label>
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
                  onClick={() => setEditingExpense(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg shadow-amber-600/20"
                >
                  Update & Resync
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
