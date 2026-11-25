import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import AccessBanner from '../components/AccessBanner';
import {
  PieChart,
  Plus,
  Trash2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  X,
  UserCheck,
  TrendingUp,
  Edit2,
} from 'lucide-react';

const MONTHS = [
  { code: '01', name: 'Jan' },
  { code: '02', name: 'Feb' },
  { code: '03', name: 'Mar' },
  { code: '04', name: 'Apr' },
  { code: '05', name: 'May' },
  { code: '06', name: 'Jun' },
  { code: '07', name: 'Jul' },
  { code: '08', name: 'Aug' },
  { code: '09', name: 'Sep' },
  { code: '10', name: 'Oct' },
  { code: '11', name: 'Nov' },
  { code: '12', name: 'Dec' },
];

export default function InvestmentPage() {
  const { token, canEdit, isSuperAdmin } = useAuth();
  const hasEdit = isSuperAdmin() || canEdit('investment');

  const [year, setYear] = useState(() => new Date().getFullYear());
  const [investors, setInvestors] = useState([]);
  const [allRecords, setAllRecords] = useState([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  // Add Investor Modal
  const [showAddInvestorModal, setShowAddInvestorModal] = useState(false);
  const [partnerName, setPartnerName] = useState('');
  const [partnerPhone, setPartnerPhone] = useState('');
  const [partnerEmail, setPartnerEmail] = useState('');

  // Record Contribution Modal (Add & Edit)
  const [showContributionModal, setShowContributionModal] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [selectedInvestorId, setSelectedInvestorId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('01');
  const [amount, setAmount] = useState('');
  const [investDate, setInvestDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchInvestments();
  }, []);

  const fetchInvestments = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin-portal/accounting/investments', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setInvestors(data.investors || []);
        setAllRecords(data.allRecords || []);
        setGrandTotal(data.grandTotalInvested || 0);
        if (data.investors?.length > 0 && !selectedInvestorId) {
          setSelectedInvestorId(String(data.investors[0].id));
        }
      }
    } catch (err) {
      console.error('Fetch investments error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvestor = async (e) => {
    e.preventDefault();
    if (!partnerName.trim()) return;

    try {
      const res = await fetch('/api/admin-portal/accounting/investors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          partner_name: partnerName.trim(),
          phone: partnerPhone,
          email: partnerEmail,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setShowAddInvestorModal(false);
        setPartnerName('');
        setPartnerPhone('');
        setPartnerEmail('');
        setMessage({ type: 'success', text: `Added investor '${data.investor?.partner_name}'` });
        fetchInvestments();
      } else {
        alert(data.error || 'Failed to add investor');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteInvestor = async (investorId, pName) => {
    if (!hasEdit) return;
    if (!window.confirm(`Delete partner/investor "${pName}"? This will remove all their recorded contributions.`)) return;

    try {
      const res = await fetch(`/api/admin-portal/accounting/investors/${investorId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `Investor '${pName}' removed.` });
        fetchInvestments();
      } else {
        alert(data.error || 'Failed to delete investor');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCellClick = (inv, mCode) => {
    if (!hasEdit) return;
    const monthKey = `${year}-${mCode}`;
    const existing = allRecords.find((r) => r.investor_id === inv.id && r.month_year === monthKey);

    setSelectedInvestorId(String(inv.id));
    setSelectedMonth(mCode);

    if (existing) {
      setEditingRecordId(existing.id);
      setAmount(String(existing.amount));
      setInvestDate(existing.investment_date || `${year}-${mCode}-01`);
      setNotes(existing.notes || '');
    } else {
      setEditingRecordId(null);
      setAmount('');
      setInvestDate(`${year}-${mCode}-01`);
      setNotes('');
    }

    setShowContributionModal(true);
  };

  const handleSaveContribution = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    const monthKey = `${year}-${selectedMonth}`;

    try {
      if (editingRecordId) {
        // Update existing record
        const res = await fetch(`/api/admin-portal/accounting/investments/${editingRecordId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            amount: Number(amount),
            investment_date: investDate,
            notes,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          setShowContributionModal(false);
          setMessage({ type: 'success', text: `Updated investment to ₹${amount} for ${monthKey}` });
          fetchInvestments();
        } else {
          alert(data.error || 'Failed to update investment');
        }
      } else {
        // Create new record
        const res = await fetch('/api/admin-portal/accounting/investments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            investor_id: selectedInvestorId,
            month_year: monthKey,
            amount: Number(amount),
            investment_date: investDate,
            notes,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          setShowContributionModal(false);
          setMessage({ type: 'success', text: `Logged investment of ₹${amount} for ${monthKey}` });
          fetchInvestments();
        } else {
          alert(data.error || 'Failed to record investment');
        }
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteRecord = async (recordId) => {
    if (!hasEdit) return;
    if (!window.confirm('Delete this investment entry?')) return;

    try {
      const res = await fetch(`/api/admin-portal/accounting/investments/${recordId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setShowContributionModal(false);
        setMessage({ type: 'success', text: 'Investment entry removed.' });
        fetchInvestments();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <AccessBanner pageKey="investment" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <PieChart className="w-5 h-5 text-purple-400" />
            Investment Tracker • Partner Capital Fund
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Tracking month-wise capital contributions for <strong className="text-purple-300">Vishal</strong>,{' '}
            <strong className="text-purple-300">Bhai</strong>, and <strong className="text-purple-300">Divesh</strong>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
            <Calendar className="w-4 h-4 text-purple-400" />
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y} className="bg-slate-900">
                  Year {y}
                </option>
              ))}
            </select>
          </div>

          {hasEdit && (
            <>
              <button
                onClick={() => {
                  setEditingRecordId(null);
                  setAmount('');
                  setNotes('');
                  setShowContributionModal(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-lg shadow-purple-600/20 flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4" />
                Record Contribution
              </button>
              <button
                onClick={() => setShowAddInvestorModal(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-all"
              >
                <UserCheck className="w-4 h-4 text-purple-400" />
                Add Partner
              </button>
            </>
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

      {/* KPI Highlight Card */}
      <div className="glass-panel p-5 rounded-2xl border border-purple-500/30 bg-purple-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase font-bold text-purple-400 tracking-wider">
            Total Capital Injected (Cumulative)
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            Total funds contributed across all partners (Vishal, Bhai, Divesh, etc.)
          </div>
        </div>
        <div className="text-3xl font-extrabold font-mono text-purple-300">
          ₹{grandTotal.toLocaleString('en-IN')}
        </div>
      </div>

      {/* Month-Wise Matrix Table Matching Handwritten Part-6 */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-white">Investment Timeline Matrix ({year})</h3>
            <span className="text-xs text-slate-400">Click any month cell to view, add, or edit capital injection numbers.</span>
          </div>
          <span className="text-xs text-purple-400 font-mono font-semibold">Interactive Grid</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4 font-bold min-w-[150px]">Partner / Investor</th>
                {MONTHS.map((m) => (
                  <th key={m.code} className="py-3 px-3 font-bold text-right min-w-[85px]">
                    {m.name}
                  </th>
                ))}
                <th className="py-3 px-4 font-bold text-right min-w-[120px] bg-slate-950/40">
                  Total Invested
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {investors.map((inv) => {
                const partnerRecords = allRecords.filter((r) => r.investor_id === inv.id);

                return (
                  <tr key={inv.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-3.5 px-4 font-sans font-bold text-slate-200">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-[10px] text-purple-300 font-bold">
                            {inv.partner_name.charAt(0)}
                          </div>
                          <span>{inv.partner_name}</span>
                        </div>
                        {hasEdit && (
                          <button
                            onClick={() => handleDeleteInvestor(inv.id, inv.partner_name)}
                            className="p-1 rounded text-slate-600 hover:text-red-400"
                            title={`Delete ${inv.partner_name}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>

                    {MONTHS.map((m) => {
                      const monthKey = `${year}-${m.code}`;
                      const monthRecords = partnerRecords.filter((r) => r.month_year === monthKey);
                      const monthTotal = monthRecords.reduce((s, r) => s + Number(r.amount), 0);

                      return (
                        <td
                          key={m.code}
                          onClick={() => handleCellClick(inv, m.code)}
                          className={`py-3.5 px-3 text-right cursor-pointer select-none transition-colors ${
                            hasEdit ? 'hover:bg-purple-900/30' : ''
                          }`}
                          title={hasEdit ? `Click to edit ${inv.partner_name} for ${m.name} ${year}` : ''}
                        >
                          {monthTotal > 0 ? (
                            <span className="text-purple-300 font-bold px-1.5 py-0.5 rounded bg-purple-950/40 border border-purple-500/20">
                              ₹{monthTotal.toLocaleString('en-IN')}
                            </span>
                          ) : (
                            <span className="text-slate-700 group-hover:text-slate-500">-</span>
                          )}
                        </td>
                      );
                    })}

                    <td className="py-3.5 px-4 text-right font-bold text-purple-200 bg-slate-950/40 font-mono">
                      ₹{Number(inv.totalInvested || 0).toLocaleString('en-IN')}
                    </td>
                  </tr>
                );
              })}

              {/* Month Total Row */}
              <tr className="bg-slate-900/80 font-bold border-t-2 border-slate-800 text-slate-300">
                <td className="py-3 px-4 font-sans uppercase text-[11px] text-slate-400">Monthly Sum:</td>
                {MONTHS.map((m) => {
                  const monthKey = `${year}-${m.code}`;
                  const monthSum = allRecords
                    .filter((r) => r.month_year === monthKey)
                    .reduce((s, r) => s + Number(r.amount), 0);

                  return (
                    <td key={m.code} className="py-3 px-3 text-right text-purple-400">
                      {monthSum > 0 ? `₹${monthSum.toLocaleString('en-IN')}` : '-'}
                    </td>
                  );
                })}
                <td className="py-3 px-4 text-right text-purple-300 bg-slate-950/60 font-extrabold text-sm">
                  ₹{grandTotal.toLocaleString('en-IN')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Partner Modal */}
      {showAddInvestorModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-purple-400" />
                Add Partner / Investor (Vishal, Bhai, Divesh)
              </h3>
              <button onClick={() => setShowAddInvestorModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateInvestor} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Partner Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vishal, Bhai, Divesh"
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="Optional"
                  value={partnerPhone}
                  onChange={(e) => setPartnerPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  placeholder="Optional"
                  value={partnerEmail}
                  onChange={(e) => setPartnerEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddInvestorModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/20"
                >
                  Add Partner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record / Edit Contribution Modal */}
      {showContributionModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <PieChart className="w-4 h-4 text-purple-400" />
                {editingRecordId ? 'Edit Capital Investment' : 'Record Capital Investment'}
              </h3>
              <button onClick={() => setShowContributionModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveContribution} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Partner *</label>
                <select
                  value={selectedInvestorId}
                  onChange={(e) => setSelectedInvestorId(e.target.value)}
                  disabled={Boolean(editingRecordId)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none disabled:opacity-60"
                >
                  {investors.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.partner_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Month ({year})</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    disabled={Boolean(editingRecordId)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none disabled:opacity-60"
                  >
                    {MONTHS.map((m) => (
                      <option key={m.code} value={m.code}>
                        {m.name} ({year}-{m.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Transaction Date</label>
                  <input
                    type="date"
                    value={investDate}
                    onChange={(e) => setInvestDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 100000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Notes / Bank Ref</label>
                <input
                  type="text"
                  placeholder="e.g. Bank transfer to Acube account"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-800">
                {editingRecordId ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteRecord(editingRecordId)}
                    className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                ) : (
                  <div></div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowContributionModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/20"
                  >
                    {editingRecordId ? 'Update Contribution' : 'Save Contribution'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
