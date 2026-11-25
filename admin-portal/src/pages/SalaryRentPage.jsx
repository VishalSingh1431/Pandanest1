import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import AccessBanner from '../components/AccessBanner';
import {
  Users,
  Building,
  Plus,
  Trash2,
  Calendar,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  X,
  CreditCard,
  Edit2,
} from 'lucide-react';

export default function SalaryRentPage() {
  const { token, canEdit, isSuperAdmin } = useAuth();
  const hasEdit = isSuperAdmin() || canEdit('salary_rent');

  const [monthYear, setMonthYear] = useState(() => new Date().toISOString().slice(0, 7)); // 'YYYY-MM'
  const [data, setData] = useState({ staff: [], properties: [], totalSalary: 0, totalRent: 0, totalPayrollAndRent: 0 });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  // Add Worker Modal ("hum larke add kar sake admin pannel se")
  const [showAddWorkerModal, setShowAddWorkerModal] = useState(false);
  const [workerName, setWorkerName] = useState('');
  const [workerRole, setWorkerRole] = useState('');
  const [workerPhone, setWorkerPhone] = useState('');
  const [workerSalary, setWorkerSalary] = useState('');

  // Add Property Modal
  const [showAddPropertyModal, setShowAddPropertyModal] = useState(false);
  const [propName, setPropName] = useState('');
  const [landlordName, setLandlordName] = useState('');
  const [defaultRent, setDefaultRent] = useState('');

  // Edit Salary Slip Modal
  const [editingStaff, setEditingStaff] = useState(null);
  const [salaryAmount, setSalaryAmount] = useState('');
  const [advanceDeduction, setAdvanceDeduction] = useState('');
  const [salaryStatus, setSalaryStatus] = useState('Paid');
  const [salaryNotes, setSalaryNotes] = useState('');

  // Edit Rent Slip Modal
  const [editingProp, setEditingProp] = useState(null);
  const [rentAmount, setRentAmount] = useState('');
  const [elecCharges, setElecCharges] = useState('');
  const [rentStatus, setRentStatus] = useState('Paid');
  const [rentNotes, setRentNotes] = useState('');

  useEffect(() => {
    fetchPayrollRent();
  }, [monthYear]);

  const fetchPayrollRent = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin-portal/accounting/payroll-rent?month_year=${monthYear}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const resData = await res.json();
      if (res.ok) {
        setData(resData);
      }
    } catch (err) {
      console.error('Fetch payroll & rent error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorker = async (e) => {
    e.preventDefault();
    if (!workerName.trim()) return;

    try {
      const res = await fetch('/api/admin-portal/accounting/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: workerName.trim(),
          role: workerRole,
          phone: workerPhone,
          default_salary: Number(workerSalary || 0),
        }),
      });

      const resData = await res.json();
      if (res.ok) {
        setShowAddWorkerModal(false);
        setWorkerName('');
        setWorkerRole('');
        setWorkerPhone('');
        setWorkerSalary('');
        setMessage({ type: 'success', text: `Added staff member '${resData.employee?.name}'.` });
        fetchPayrollRent();
      } else {
        alert(resData.error || 'Failed to add staff');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteStaff = async (staffId, staffName) => {
    if (!hasEdit) return;
    if (!window.confirm(`Delete staff member "${staffName}"? This will remove their record from active payroll.`)) return;

    try {
      const res = await fetch(`/api/admin-portal/accounting/staff/${staffId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const resData = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `Staff member '${staffName}' removed.` });
        fetchPayrollRent();
      } else {
        alert(resData.error || 'Failed to delete staff');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateProperty = async (e) => {
    e.preventDefault();
    if (!propName.trim()) return;

    try {
      const res = await fetch('/api/admin-portal/accounting/properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          property_name: propName.trim(),
          landlord_name: landlordName,
          default_rent: Number(defaultRent || 0),
        }),
      });

      const resData = await res.json();
      if (res.ok) {
        setShowAddPropertyModal(false);
        setPropName('');
        setLandlordName('');
        setDefaultRent('');
        setMessage({ type: 'success', text: `Added rent location '${resData.property?.property_name}'.` });
        fetchPayrollRent();
      } else {
        alert(resData.error || 'Failed to add property');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteProperty = async (propId, propName) => {
    if (!hasEdit) return;
    if (!window.confirm(`Delete rent location "${propName}"? This will remove its rental configuration.`)) return;

    try {
      const res = await fetch(`/api/admin-portal/accounting/properties/${propId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const resData = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `Property '${propName}' removed.` });
        fetchPayrollRent();
      } else {
        alert(resData.error || 'Failed to delete property');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleOpenSalaryModal = (staff) => {
    if (!hasEdit) return;
    setEditingStaff(staff);
    const cur = staff.currentMonthRecord;
    setSalaryAmount(cur ? cur.salary_amount : staff.default_salary || '');
    setAdvanceDeduction(cur ? cur.advance_deduction : '0');
    setSalaryStatus(cur ? cur.payment_status : 'Paid');
    setSalaryNotes(cur ? cur.notes : '');
  };

  const handleSaveSalaryRecord = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin-portal/accounting/salary-record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          employee_id: editingStaff.id,
          month_year: monthYear,
          salary_amount: Number(salaryAmount || 0),
          advance_deduction: Number(advanceDeduction || 0),
          payment_status: salaryStatus,
          notes: salaryNotes,
        }),
      });

      const resData = await res.json();
      if (res.ok) {
        setEditingStaff(null);
        setMessage({ type: 'success', text: `Salary updated for ${editingStaff.name}` });
        fetchPayrollRent();
      } else {
        alert(resData.error || 'Failed to save salary');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleOpenRentModal = (prop) => {
    if (!hasEdit) return;
    setEditingProp(prop);
    const cur = prop.currentMonthRecord;
    setRentAmount(cur ? cur.rent_amount : prop.default_rent || '');
    setElecCharges(cur ? cur.electricity_charges : '0');
    setRentStatus(cur ? cur.payment_status : 'Paid');
    setRentNotes(cur ? cur.notes : '');
  };

  const handleSaveRentRecord = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin-portal/accounting/rent-record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          property_id: editingProp.id,
          month_year: monthYear,
          rent_amount: Number(rentAmount || 0),
          electricity_charges: Number(elecCharges || 0),
          payment_status: rentStatus,
          notes: rentNotes,
        }),
      });

      const resData = await res.json();
      if (res.ok) {
        setEditingProp(null);
        setMessage({ type: 'success', text: `Rent record updated for ${editingProp.property_name}` });
        fetchPayrollRent();
      } else {
        alert(resData.error || 'Failed to save rent');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <AccessBanner pageKey="salary_rent" />

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-400" />
            सबका Salary + Rent (Month-Wise Operational Expenses)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            "hum larke add kar sake admin pannel se" • Month-wise staff payroll & facility rental ledger connected to{' '}
            <strong className="text-teal-300">Platform Profit (P&L)</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Month Selector */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
            <Calendar className="w-4 h-4 text-teal-400" />
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
                onClick={() => setShowAddWorkerModal(true)}
                className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs shadow-lg shadow-teal-600/20 flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4" />
                Add Worker / Staff
              </button>
              <button
                onClick={() => setShowAddPropertyModal(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-all"
              >
                <Building className="w-4 h-4 text-teal-400" />
                Add Property / Rent
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

      {/* Overview Aggregates Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-slate-800">
          <div className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Total Staff Salary ({monthYear})</div>
          <div className="text-2xl font-extrabold font-mono text-teal-300 mt-1">
            ₹{Number(data.totalSalary || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Ashish, Aman, Anurag, Anuj, Prince, etc.</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-800">
          <div className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Total Property Rent ({monthYear})</div>
          <div className="text-2xl font-extrabold font-mono text-blue-400 mt-1">
            ₹{Number(data.totalRent || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Sarawagi, Uncle Sec-84, Bengal 163, etc.</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-teal-500/30 bg-teal-950/20">
          <div className="text-[11px] font-bold uppercase text-teal-400 tracking-wider">Combined Salary + Rent</div>
          <div className="text-2xl font-extrabold font-mono text-teal-200 mt-1">
            ₹{Number(data.totalPayrollAndRent || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-teal-400/80 mt-1">Auto-deducted in Platform Net Profit calculation</div>
        </div>
      </div>

      {/* Two Column Layout: Staff Salary on Left, Property Rent on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SECTION 1: STAFF SALARY */}
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl flex flex-col justify-between">
          <div>
            <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-teal-400" />
                  Staff Salary Ledger ({monthYear})
                </h3>
                <p className="text-[11px] text-slate-400">Ashish, Aman, Anurag, Anuj, Prince</p>
              </div>
            </div>

            <div className="p-4 overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[450px]">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                    <th className="pb-2">Worker / Role</th>
                    <th className="pb-2 text-right">Base Salary</th>
                    <th className="pb-2 text-right">Advance</th>
                    <th className="pb-2 text-right">Net Paid</th>
                    <th className="pb-2 text-center">Status</th>
                    {hasEdit && <th className="pb-2 text-right">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {data.staff.map((s) => {
                    const slip = s.currentMonthRecord;
                    const base = slip ? slip.salary_amount : s.default_salary || 0;
                    const adv = slip ? slip.advance_deduction : 0;
                    const net = slip ? slip.net_paid : base;
                    const status = slip ? slip.payment_status : 'Pending';

                    return (
                      <tr key={s.id} className="hover:bg-slate-800/30">
                        <td className="py-3">
                          <div className="font-semibold text-slate-200">{s.name}</div>
                          <div className="text-[10px] text-slate-500">{s.role || 'Staff'}</div>
                        </td>
                        <td className="py-3 text-right font-mono text-slate-300">
                          ₹{Number(base).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 text-right font-mono text-amber-400">
                          {adv > 0 ? `-₹${Number(adv).toLocaleString('en-IN')}` : '-'}
                        </td>
                        <td className="py-3 text-right font-mono font-bold text-teal-300">
                          ₹{Number(net).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                              status === 'Paid'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {status}
                          </span>
                        </td>
                        {hasEdit && (
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleOpenSalaryModal(s)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-teal-600/30 text-slate-400 hover:text-teal-300"
                                title="Update monthly salary slip"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteStaff(s.id, s.name)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400"
                                title="Delete staff profile"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">Total Monthly Salary:</span>
            <span className="font-mono font-bold text-sm text-teal-300">
              ₹{Number(data.totalSalary || 0).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* SECTION 2: PROPERTY RENT */}
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl flex flex-col justify-between">
          <div>
            <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <Building className="w-4 h-4 text-blue-400" />
                  Property Rent Ledger ({monthYear})
                </h3>
                <p className="text-[11px] text-slate-400">Sarawagi, Uncle Sec-84, Bengal 163</p>
              </div>
            </div>

            <div className="p-4 overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[450px]">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                    <th className="pb-2">Property / Location</th>
                    <th className="pb-2 text-right">Base Rent</th>
                    <th className="pb-2 text-right">Elec / Maint</th>
                    <th className="pb-2 text-right">Total Paid</th>
                    <th className="pb-2 text-center">Status</th>
                    {hasEdit && <th className="pb-2 text-right">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {data.properties.map((p) => {
                    const slip = p.currentMonthRecord;
                    const base = slip ? slip.rent_amount : p.default_rent || 0;
                    const elec = slip ? slip.electricity_charges : 0;
                    const total = slip ? slip.total_paid : base;
                    const status = slip ? slip.payment_status : 'Pending';

                    return (
                      <tr key={p.id} className="hover:bg-slate-800/30">
                        <td className="py-3">
                          <div className="font-semibold text-slate-200">{p.property_name}</div>
                          <div className="text-[10px] text-slate-500">{p.landlord_name || 'Facility'}</div>
                        </td>
                        <td className="py-3 text-right font-mono text-slate-300">
                          ₹{Number(base).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 text-right font-mono text-blue-400">
                          {elec > 0 ? `+₹${Number(elec).toLocaleString('en-IN')}` : '-'}
                        </td>
                        <td className="py-3 text-right font-mono font-bold text-blue-300">
                          ₹{Number(total).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                              status === 'Paid'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {status}
                          </span>
                        </td>
                        {hasEdit && (
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleOpenRentModal(p)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-blue-600/30 text-slate-400 hover:text-blue-300"
                                title="Update monthly rent slip"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteProperty(p.id, p.property_name)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400"
                                title="Delete property"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">Total Monthly Rent:</span>
            <span className="font-mono font-bold text-sm text-blue-300">
              ₹{Number(data.totalRent || 0).toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* Add Worker Modal */}
      {showAddWorkerModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-400" />
                Add Staff / Boy (hum larke add kar sake)
              </h3>
              <button onClick={() => setShowAddWorkerModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateWorker} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Staff Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ashish, Aman, Anurag, Anuj, Prince"
                  value={workerName}
                  onChange={(e) => setWorkerName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Role / Designation</label>
                  <input
                    type="text"
                    placeholder="e.g. Warehouse, Packing, Operations"
                    value={workerRole}
                    onChange={(e) => setWorkerRole(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Default Salary (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 25000"
                    value={workerSalary}
                    onChange={(e) => setWorkerSalary(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. 9876543210"
                  value={workerPhone}
                  onChange={(e) => setWorkerPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddWorkerModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-lg shadow-teal-600/20"
                >
                  Save Worker Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Property Modal */}
      {showAddPropertyModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Building className="w-4 h-4 text-blue-400" />
                Add Rent Location / Facility
              </h3>
              <button onClick={() => setShowAddPropertyModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProperty} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Property Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarawagi, Uncle Sec-84, Bengal 163"
                  value={propName}
                  onChange={(e) => setPropName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Landlord Name</label>
                <input
                  type="text"
                  placeholder="e.g. Uncle Sec 84"
                  value={landlordName}
                  onChange={(e) => setLandlordName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Default Monthly Rent (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 20000"
                  value={defaultRent}
                  onChange={(e) => setDefaultRent(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddPropertyModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20"
                >
                  Save Property
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Salary Modal */}
      {editingStaff && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                Monthly Salary Slip: {editingStaff.name} ({monthYear})
              </h3>
              <button onClick={() => setEditingStaff(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSalaryRecord} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Base Salary (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={salaryAmount}
                    onChange={(e) => setSalaryAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Advance Taken (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={advanceDeduction}
                    onChange={(e) => setAdvanceDeduction(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-semibold">Net Payable:</span>
                <span className="text-base font-mono font-bold text-teal-300">
                  ₹{(Number(salaryAmount || 0) - Number(advanceDeduction || 0)).toLocaleString('en-IN')}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Payment Status</label>
                <select
                  value={salaryStatus}
                  onChange={(e) => setSalaryStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                >
                  <option value="Paid">Paid (Full)</option>
                  <option value="Pending">Pending</option>
                  <option value="Partial">Partial</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Notes / Slip Ref</label>
                <input
                  type="text"
                  placeholder="e.g. Transferred via UPI on 1st"
                  value={salaryNotes}
                  onChange={(e) => setSalaryNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-lg shadow-teal-600/20"
                >
                  Save Salary Slip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Rent Modal */}
      {editingProp && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                Monthly Rent Slip: {editingProp.property_name} ({monthYear})
              </h3>
              <button onClick={() => setEditingProp(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRentRecord} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Base Rent (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={rentAmount}
                    onChange={(e) => setRentAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Electricity / Bill (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={elecCharges}
                    onChange={(e) => setElecCharges(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-semibold">Total Paid:</span>
                <span className="text-base font-mono font-bold text-blue-300">
                  ₹{(Number(rentAmount || 0) + Number(elecCharges || 0)).toLocaleString('en-IN')}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Payment Status</label>
                <select
                  value={rentStatus}
                  onChange={(e) => setRentStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                >
                  <option value="Paid">Paid</option>
                  <option value="Pending">Pending</option>
                  <option value="Partial">Partial</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Paid via cheque / cash"
                  value={rentNotes}
                  onChange={(e) => setRentNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingProp(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20"
                >
                  Save Rent Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
