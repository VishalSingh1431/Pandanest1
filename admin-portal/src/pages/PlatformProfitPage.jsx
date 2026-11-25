import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import AccessBanner from '../components/AccessBanner';
import {
  TrendingUp,
  Calendar,
  Plus,
  ArrowDown,
  Building,
  Users,
  Coins,
  CheckCircle2,
  AlertCircle,
  X,
  Edit2,
  Trash2,
  PieChart,
  DownloadCloud,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

export default function PlatformProfitPage() {
  const { token, canEdit, isSuperAdmin } = useAuth();
  const hasEdit = isSuperAdmin() || canEdit('platform_profit');

  const [monthYear, setMonthYear] = useState(() => new Date().toISOString().slice(0, 7)); // 'YYYY-MM'
  const [data, setData] = useState({ platforms: [], calculations: {} });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  // Add Platform Modal ("हम और platform add kar sake")
  const [showAddPlatformModal, setShowAddPlatformModal] = useState(false);
  const [newPlatformName, setNewPlatformName] = useState('');
  const [platformType, setPlatformType] = useState('Flipkart');
  const [firmCode, setFirmCode] = useState('general');

  // Edit Platform Metrics Modal
  const [editingPlatform, setEditingPlatform] = useState(null);
  const [grossSales, setGrossSales] = useState('');
  const [returnsAmt, setReturnsAmt] = useState('');
  const [cogsAmt, setCogsAmt] = useState('');
  const [feesAmt, setFeesAmt] = useState('');
  const [netProfitInput, setNetProfitInput] = useState('');
  const [pnlNotes, setPnlNotes] = useState('');

  // Other Kharcha Edit Modal
  const [showOtherKharchaModal, setShowOtherKharchaModal] = useState(false);
  const [otherKharchaInput, setOtherKharchaInput] = useState('');

  // Auto-Pull Sales Modal & State
  const [showAutoPullModal, setShowAutoPullModal] = useState(false);
  const [autoPullData, setAutoPullData] = useState(null);
  const [autoPulling, setAutoPulling] = useState(false);

  useEffect(() => {
    fetchPnL();
  }, [monthYear]);

  const fetchPnL = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin-portal/accounting/pnl?month_year=${monthYear}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const resData = await res.json();
      if (res.ok) {
        setData(resData);
        setOtherKharchaInput(String(resData.calculations?.otherKharcha || 0));
      }
    } catch (err) {
      console.error('Fetch PnL error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlatform = async (e) => {
    e.preventDefault();
    if (!newPlatformName.trim()) return;

    try {
      const res = await fetch('/api/admin-portal/accounting/platforms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newPlatformName.trim(),
          platform_type: platformType,
          firm_code: firmCode,
        }),
      });

      const resData = await res.json();
      if (res.ok) {
        setShowAddPlatformModal(false);
        setNewPlatformName('');
        setMessage({ type: 'success', text: `Added platform '${resData.platform?.name}'` });
        fetchPnL();
      } else {
        alert(resData.error || 'Failed to add platform');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeletePlatform = async (platformId, platformName) => {
    if (!hasEdit) return;
    if (!window.confirm(`Delete platform "${platformName}"? This will remove it and its monthly performance history.`)) return;

    try {
      const res = await fetch(`/api/admin-portal/accounting/platforms/${platformId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const resData = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `Platform '${platformName}' removed.` });
        fetchPnL();
      } else {
        alert(resData.error || 'Failed to delete platform');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleOpenPlatformModal = (platform) => {
    if (!hasEdit) return;
    setEditingPlatform(platform);
    const rec = platform.record || {};
    setGrossSales(rec.gross_sales || '');
    setReturnsAmt(rec.returns_amount || '');
    setCogsAmt(rec.cogs_amount || '');
    setFeesAmt(rec.platform_fees || '');
    setNetProfitInput(rec.net_profit !== undefined ? String(rec.net_profit) : '');
    setPnlNotes(rec.notes || '');
  };

  const handleSavePlatformRecord = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin-portal/accounting/platform-pnl-record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          platform_id: editingPlatform.id,
          month_year: monthYear,
          gross_sales: Number(grossSales || 0),
          returns_amount: Number(returnsAmt || 0),
          cogs_amount: Number(cogsAmt || 0),
          platform_fees: Number(feesAmt || 0),
          net_profit: netProfitInput !== '' ? Number(netProfitInput) : undefined,
          notes: pnlNotes,
        }),
      });

      const resData = await res.json();
      if (res.ok) {
        setEditingPlatform(null);
        setMessage({ type: 'success', text: `Saved performance numbers for ${editingPlatform.name}` });
        fetchPnL();
      } else {
        alert(resData.error || 'Failed to save');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSaveOtherKharcha = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin-portal/accounting/pnl-summary-other', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          month_year: monthYear,
          other_kharcha: Number(otherKharchaInput || 0),
        }),
      });

      if (res.ok) {
        setShowOtherKharchaModal(false);
        setMessage({ type: 'success', text: 'Other operational kharcha updated.' });
        fetchPnL();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleFetchAutoPullSales = async () => {
    try {
      setAutoPulling(true);
      const res = await fetch(`/api/admin-portal/accounting/pnl/auto-pull-sales?month_year=${monthYear}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const resData = await res.json();
      if (res.ok) {
        setAutoPullData(resData);
        setShowAutoPullModal(true);
      } else {
        alert(resData.error || 'Failed to pull sales from Page 1');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setAutoPulling(false);
    }
  };

  const handleApplyPulledSales = async () => {
    if (!autoPullData?.platformBreakdown) return;

    try {
      // Apply pulled gross sales to matching platforms
      const breakdown = autoPullData.platformBreakdown;
      let appliedCount = 0;

      for (const platform of data.platforms) {
        // Try exact match or partial match on name / platform_type + firm_code
        const pKey = platform.name;
        const matchedAmt = breakdown[pKey] || breakdown[platform.platform_type] || 0;

        if (matchedAmt > 0) {
          const rec = platform.record || {};
          await fetch('/api/admin-portal/accounting/platform-pnl-record', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              platform_id: platform.id,
              month_year: monthYear,
              gross_sales: matchedAmt,
              returns_amount: Number(rec.returns_amount || 0),
              cogs_amount: Number(rec.cogs_amount || 0),
              platform_fees: Number(rec.platform_fees || 0),
              notes: rec.notes || `Auto-pulled ₹${matchedAmt} from Page 1 cashbook`,
            }),
          });
          appliedCount++;
        }
      }

      setShowAutoPullModal(false);
      setMessage({ type: 'success', text: `Successfully updated gross sales for ${appliedCount} platforms from Page 1 Cashbook.` });
      fetchPnL();
    } catch (err) {
      alert(err.message);
    }
  };

  const calc = data.calculations || {};
  const grossProfit = Number(calc.totalGrossProfit || 0);
  const salaryKharcha = Number(calc.salaryKharcha || 0);
  const rentKharcha = Number(calc.rentKharcha || 0);
  const otherKharcha = Number(calc.otherKharcha || 0);
  const totalKharcha = Number(calc.totalExpenses || 0);
  const netProfit = Number(calc.netProfit || 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <AccessBanner pageKey="platform_profit" />

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            Profit of All Platforms • Multi-Channel P&L Engine
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            "This is connected with Salary + Rent page" • Automatically deducts salary & rent from gross profit to compute{' '}
            <strong className="text-emerald-300">True Net Profit</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <input
              type="month"
              value={monthYear}
              onChange={(e) => setMonthYear(e.target.value)}
              className="bg-transparent text-white text-xs focus:outline-none cursor-pointer"
            />
          </div>

          {hasEdit && (
            <>
              <button
                onClick={handleFetchAutoPullSales}
                disabled={autoPulling}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg shadow-blue-600/20 flex items-center gap-1.5 transition-all"
                title="Scan Page 1 Cashbook marketplace inflows to auto-fill gross sales"
              >
                {autoPulling ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <DownloadCloud className="w-4 h-4" />
                )}
                Auto-Pull Sales from Page 1
              </button>

              <button
                onClick={() => setShowAddPlatformModal(true)}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4" />
                Add Platform (हम और platform add kar sake)
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

      {/* P&L Financial Formula Flow Diagram Matching Handwritten Arrow Flow */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Gross Profit Box */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-emerald-500/40">
            <div className="text-[11px] font-bold uppercase text-emerald-400 tracking-wider">
              1. Gross Profit / Total Platform Profit
            </div>
            <div className="text-2xl font-extrabold font-mono text-emerald-300 mt-1">
              ₹{grossProfit.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              Sum of f-A, f-Treo, f-Tri, m-A, m-Tre, m-Tri, Amazon, Myntra
            </div>
          </div>

          {/* 2. Total Kharcha Box */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-red-500/40">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold uppercase text-red-400 tracking-wider">
                2. खर्चा (Total Operating Kharcha)
              </div>
              {hasEdit && (
                <button
                  onClick={() => setShowOtherKharchaModal(true)}
                  className="text-[10px] text-red-300 underline"
                >
                  Edit Other
                </button>
              )}
            </div>
            <div className="text-2xl font-extrabold font-mono text-red-300 mt-1">
              - ₹{totalKharcha.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-slate-400 mt-1 space-x-2">
              <span>Salary: ₹{salaryKharcha.toLocaleString('en-IN')}</span> •
              <span>Rent: ₹{rentKharcha.toLocaleString('en-IN')}</span> •
              <span>Other: ₹{otherKharcha.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* 3. Final NET PROFIT Box */}
          <div
            className={`p-4 rounded-xl border ${
              netProfit >= 0
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                : 'bg-red-950/40 border-red-500/50 text-red-300'
            }`}
          >
            <div className="text-[11px] font-bold uppercase tracking-wider">
              3. NET PROFIT (Total Profit After Kharcha)
            </div>
            <div className="text-3xl font-extrabold font-mono mt-1">
              ₹{netProfit.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] opacity-80 mt-1">
              Gross Profit (₹{grossProfit.toLocaleString('en-IN')}) - Kharcha (₹{totalKharcha.toLocaleString('en-IN')})
            </div>
          </div>
        </div>

        {/* Informative Note Badge */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Salary & Rent dynamically linked from <strong className="text-slate-200">सबका Salary + Rent (Page 4)</strong> for month {monthYear}.
          </span>
          <span className="font-mono text-slate-300 text-[11px]">
            Formula: Net Profit = Gross Profit - (Salary + Rent + Other Kharcha)
          </span>
        </div>
      </div>

      {/* Platform Performance Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {data.platforms.map((platform) => {
          const rec = platform.record || {};
          const profit = Number(rec.net_profit || 0);

          return (
            <div
              key={platform.id}
              className="glass-panel rounded-2xl border border-slate-800 p-4 flex flex-col justify-between shadow-lg hover:border-slate-700 transition-all"
            >
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div>
                    <h4 className="font-bold text-base text-white">{platform.name}</h4>
                    <span className="text-[10px] text-slate-400 uppercase font-mono">
                      {platform.platform_type} • {platform.firm_code}
                    </span>
                  </div>

                  {hasEdit && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenPlatformModal(platform)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-emerald-600/30 text-slate-400 hover:text-emerald-300 transition-colors"
                        title="Update platform profit numbers"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeletePlatform(platform.id, platform.name)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                        title="Delete platform"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="py-3 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Gross Sales:</span>
                    <span className="font-mono text-slate-200">₹{Number(rec.gross_sales || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Returns / RTO:</span>
                    <span className="font-mono text-red-400">₹{Number(rec.returns_amount || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>COGS & Fees:</span>
                    <span className="font-mono text-slate-400">
                      ₹{(Number(rec.cogs_amount || 0) + Number(rec.platform_fees || 0)).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-semibold">Net Profit:</span>
                <span
                  className={`font-mono font-bold text-sm ${
                    profit >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  ₹{profit.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Auto-Pull Sales Modal */}
      {showAutoPullModal && autoPullData && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                Auto-Pulled Sales from Page 1 ({monthYear})
              </h3>
              <button onClick={() => setShowAutoPullModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <p className="text-slate-300">
                Found <strong className="text-white">{autoPullData.entriesCount}</strong> cashbook inflow transactions on Page 1 totaling{' '}
                <strong className="text-emerald-400 font-mono text-sm">₹{Number(autoPullData.totalMarketplaceInflow || 0).toLocaleString('en-IN')}</strong> for month {monthYear}.
              </p>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 max-h-56 overflow-y-auto">
                <div className="font-bold uppercase text-[10px] text-slate-400 border-b border-slate-800 pb-1">
                  Identified Platform Inflow Totals:
                </div>
                {Object.entries(autoPullData.platformBreakdown || {}).map(([key, val]) => (
                  <div key={key} className="flex justify-between py-1 border-b border-slate-900 last:border-0 font-mono">
                    <span className="text-slate-300 font-sans">{key}</span>
                    <span className="text-emerald-300 font-bold">₹{Number(val).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-300 text-[11px]">
                Clicking <strong>"Apply Sales to Platforms"</strong> will update matching platform gross sales fields automatically.
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAutoPullModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyPulledSales}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-600/20"
                >
                  Apply Sales to Platforms
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Platform Modal */}
      {showAddPlatformModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Add Platform (हम और platform add kar sake)
              </h3>
              <button onClick={() => setShowAddPlatformModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePlatform} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Platform Identifier *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. JioMart, Blinkit, f - New, Amazon 2"
                  value={newPlatformName}
                  onChange={(e) => setNewPlatformName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Marketplace Type</label>
                  <select
                    value={platformType}
                    onChange={(e) => setPlatformType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                  >
                    <option value="Flipkart">Flipkart</option>
                    <option value="Meesho">Meesho</option>
                    <option value="Amazon">Amazon</option>
                    <option value="Myntra">Myntra</option>
                    <option value="QuickCommerce">Quick Commerce</option>
                    <option value="Direct">Direct Store</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Firm Code</label>
                  <select
                    value={firmCode}
                    onChange={(e) => setFirmCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                  >
                    <option value="acube">Acube</option>
                    <option value="treo">Treo</option>
                    <option value="tritoy">Tritoy</option>
                    <option value="general">General / Shared</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddPlatformModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20"
                >
                  Create Platform Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Platform PnL Numbers Modal */}
      {editingPlatform && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                Monthly Profit: {editingPlatform.name} ({monthYear})
              </h3>
              <button onClick={() => setEditingPlatform(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePlatformRecord} className="space-y-3.5 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Gross Sales (₹)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0"
                    value={grossSales}
                    onChange={(e) => setGrossSales(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Returns / RTO (₹)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0"
                    value={returnsAmt}
                    onChange={(e) => setReturnsAmt(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">COGS (Product Cost ₹)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0"
                    value={cogsAmt}
                    onChange={(e) => setCogsAmt(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Platform Fees & Ads (₹)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0"
                    value={feesAmt}
                    onChange={(e) => setFeesAmt(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                  Net Platform Profit (₹) * (Override or Auto-Computed)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="Auto-calculated from above if left empty"
                  value={netProfitInput}
                  onChange={(e) => setNetProfitInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-emerald-300 font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Diwali festive sale spike"
                  value={pnlNotes}
                  onChange={(e) => setPnlNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingPlatform(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20"
                >
                  Save Platform Profit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Other Kharcha Modal */}
      {showOtherKharchaModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Other Kharcha ({monthYear})</h3>
              <button onClick={() => setShowOtherKharchaModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveOtherKharcha} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                  Miscellaneous Operating Kharcha (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  value={otherKharchaInput}
                  onChange={(e) => setOtherKharchaInput(e.target.value)}
                  placeholder="e.g. 15000"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-white focus:outline-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Packaging, legal, accounting, tea/snacks, travel, utilities.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowOtherKharchaModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold"
                >
                  Update Kharcha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
