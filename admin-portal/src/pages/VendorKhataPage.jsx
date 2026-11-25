import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import AccessBanner from '../components/AccessBanner';
import {
  Building2,
  Plus,
  Trash2,
  Calendar,
  CreditCard,
  ShoppingBag,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  Search,
  Edit2,
  Printer,
  Copy,
  Phone,
  MapPin,
} from 'lucide-react';

export default function VendorKhataPage() {
  const { token, canEdit, isSuperAdmin } = useAuth();
  const hasEdit = isSuperAdmin() || canEdit('vendor_page');

  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState(null);

  // New Vendor Modal
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
  const [vendorName, setVendorName] = useState('');
  const [vendorPhone, setVendorPhone] = useState('');
  const [vendorAddress, setVendorAddress] = useState('');
  const [vendorNotes, setVendorNotes] = useState('');

  // Edit Vendor Modal
  const [editingVendor, setEditingVendor] = useState(null);
  const [editVendorName, setEditVendorName] = useState('');
  const [editVendorPhone, setEditVendorPhone] = useState('');
  const [editVendorAddress, setEditVendorAddress] = useState('');
  const [editVendorNotes, setEditVendorNotes] = useState('');

  // Add Transaction Modal (Purchase vs Payment)
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [activeVendor, setActiveVendor] = useState(null);
  const [recordType, setRecordType] = useState('purchase'); // 'purchase' (khareeda) | 'payment' (diya)
  const [recordDate, setRecordDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [billNo, setBillNo] = useState('');
  const [amount, setAmount] = useState('');
  const [recordNotes, setRecordNotes] = useState('');

  // Edit Transaction Modal
  const [editingRecord, setEditingRecord] = useState(null);
  const [editRecordType, setEditRecordType] = useState('purchase');
  const [editRecordDate, setEditRecordDate] = useState('');
  const [editBillNo, setEditBillNo] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editRecordNotes, setEditRecordNotes] = useState('');

  // Statement / Print Modal
  const [statementVendor, setStatementVendor] = useState(null);
  const [copiedMsg, setCopiedMsg] = useState(false);

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin-portal/accounting/vendors', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setVendors(data.vendors || []);
      }
    } catch (err) {
      console.error('Fetch vendors error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVendor = async (e) => {
    e.preventDefault();
    if (!vendorName.trim()) return;

    try {
      const res = await fetch('/api/admin-portal/accounting/vendors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: vendorName.trim(),
          phone: vendorPhone,
          address: vendorAddress,
          notes: vendorNotes,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setShowAddVendorModal(false);
        setVendorName('');
        setVendorPhone('');
        setVendorAddress('');
        setVendorNotes('');
        setMessage({ type: 'success', text: `Vendor '${data.vendor?.name}' created successfully.` });
        fetchVendors();
      } else {
        alert(data.error || 'Failed to create vendor');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleOpenEditVendor = (v) => {
    if (!hasEdit) return;
    setEditingVendor(v);
    setEditVendorName(v.name || '');
    setEditVendorPhone(v.phone || '');
    setEditVendorAddress(v.address || '');
    setEditVendorNotes(v.notes || '');
  };

  const handleUpdateVendor = async (e) => {
    e.preventDefault();
    if (!editVendorName.trim()) return;

    try {
      const res = await fetch(`/api/admin-portal/accounting/vendors/${editingVendor.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editVendorName.trim(),
          phone: editVendorPhone,
          address: editVendorAddress,
          notes: editVendorNotes,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setEditingVendor(null);
        setMessage({ type: 'success', text: `Vendor details updated.` });
        fetchVendors();
      } else {
        alert(data.error || 'Failed to update vendor');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteVendor = async (vendorId, vName) => {
    if (!hasEdit) return;
    if (!window.confirm(`Are you sure you want to delete vendor "${vName}" and all associated ledger records?`)) return;

    try {
      const res = await fetch(`/api/admin-portal/accounting/vendors/${vendorId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `Vendor '${vName}' deleted.` });
        fetchVendors();
      } else {
        alert(data.error || 'Failed to delete vendor');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSaveTransaction = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    try {
      const res = await fetch(`/api/admin-portal/accounting/vendors/${activeVendor.id}/records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          record_type: recordType,
          record_date: recordDate,
          bill_no: billNo,
          amount: Number(amount),
          notes: recordNotes,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setShowRecordModal(false);
        setBillNo('');
        setAmount('');
        setRecordNotes('');
        setMessage({
          type: 'success',
          text: `Logged ${recordType.toUpperCase()} ₹${amount} for ${activeVendor.name}.`,
        });
        fetchVendors();
      } else {
        alert(data.error || 'Failed to record transaction');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleOpenEditRecord = (rec) => {
    if (!hasEdit) return;
    setEditingRecord(rec);
    setEditRecordType(rec.record_type);
    setEditRecordDate(rec.record_date);
    setEditBillNo(rec.bill_no || '');
    setEditAmount(String(rec.amount));
    setEditRecordNotes(rec.notes || '');
  };

  const handleUpdateRecord = async (e) => {
    e.preventDefault();
    if (!editAmount || Number(editAmount) <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    try {
      const res = await fetch(`/api/admin-portal/accounting/vendors/records/${editingRecord.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          record_type: editRecordType,
          record_date: editRecordDate,
          bill_no: editBillNo,
          amount: Number(editAmount),
          notes: editRecordNotes,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setEditingRecord(null);
        setMessage({ type: 'success', text: 'Transaction entry updated successfully.' });
        fetchVendors();
      } else {
        alert(data.error || 'Failed to update transaction');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteRecord = async (recordId) => {
    if (!hasEdit) return;
    if (!window.confirm('Delete this vendor transaction entry?')) return;

    try {
      const res = await fetch(`/api/admin-portal/accounting/vendors/records/${recordId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Vendor transaction deleted.' });
        fetchVendors();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCopyWhatsAppStatement = (v) => {
    const text = `*PANDANEST - VENDOR STATEMENT*\n` +
      `Vendor: *${v.name}*\n` +
      `Phone: ${v.phone || 'N/A'}\n` +
      `Total Purchased (खरीदा): ₹${Number(v.totalPurchased || 0).toLocaleString('en-IN')}\n` +
      `Total Payment Diya: ₹${Number(v.totalPaid || 0).toLocaleString('en-IN')}\n` +
      `*Outstanding Due (कितना रहता है): ₹${Number(v.balancePending || 0).toLocaleString('en-IN')}*\n` +
      `Date: ${new Date().toLocaleDateString('en-IN')}\n` +
      `Portal: admin.pandanest.in`;

    navigator.clipboard.writeText(text);
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 3000);
  };

  const filteredVendors = vendors.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <AccessBanner pageKey="vendor_page" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-400" />
            Vendor Page (Khata Ledger & Outstanding Balance)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            "hum vendor add kar sake" • Track <strong className="text-emerald-400">खरीदा (Purchases)</strong>,{' '}
            <strong className="text-blue-400">Payment</strong>, and calculate{' '}
            <strong className="text-amber-400">"कितना रहता है" (Outstanding Balance)</strong> for each vendor.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vendor name..."
              className="pl-9 pr-4 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
            />
          </div>

          {hasEdit && (
            <button
              onClick={() => setShowAddVendorModal(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all shrink-0"
            >
              <Plus className="w-4 h-4" />
              Add New Vendor
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

      {/* Vendors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVendors.map((vendor) => {
          const purchases = (vendor.records || []).filter((r) => r.record_type === 'purchase');
          const payments = (vendor.records || []).filter((r) => r.record_type === 'payment');
          const pending = Number(vendor.balancePending || 0);

          return (
            <div
              key={vendor.id}
              className="glass-panel rounded-2xl border border-slate-800 flex flex-col justify-between overflow-hidden shadow-xl"
            >
              {/* Card Header */}
              <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-white tracking-tight">{vendor.name}</h3>
                    {hasEdit && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditVendor(vendor)}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                          title="Edit vendor profile"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteVendor(vendor.id, vendor.name)}
                          className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-red-400"
                          title="Delete vendor"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {vendor.phone ? `Phone: ${vendor.phone}` : vendor.notes || 'Vendor Account'}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setStatementVendor(vendor)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs"
                    title="Print / View Statement"
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </button>

                  {hasEdit && (
                    <>
                      <button
                        onClick={() => {
                          setActiveVendor(vendor);
                          setRecordType('purchase');
                          setShowRecordModal(true);
                        }}
                        className="px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-bold transition-colors"
                        title="Add Purchase (खरीदा)"
                      >
                        + खरीदा
                      </button>
                      <button
                        onClick={() => {
                          setActiveVendor(vendor);
                          setRecordType('payment');
                          setShowRecordModal(true);
                        }}
                        className="px-2 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-[10px] font-bold transition-colors"
                        title="Add Payment (Diya)"
                      >
                        + Payment
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* In/Out Khata Details */}
              <div className="p-4 space-y-4 flex-1">
                {/* 2 Column Table: खरीदा vs Payment */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {/* Purchases Column */}
                  <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 pb-1 border-b border-slate-800 flex items-center justify-between">
                      <span>खरीदा (Purchased)</span>
                      <ShoppingBag className="w-3.5 h-3.5" />
                    </div>
                    <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {purchases.length === 0 ? (
                        <p className="text-[10px] text-slate-600 italic py-2 text-center">No purchases</p>
                      ) : (
                        purchases.map((r) => (
                          <div key={r.id} className="flex items-center justify-between text-[11px] hover:bg-slate-900/50 p-0.5 rounded">
                            <span className="text-slate-400 truncate mr-1" title={r.bill_no || r.record_date}>
                              {r.bill_no || r.record_date}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="font-mono font-bold text-emerald-300">
                                ₹{Number(r.amount).toLocaleString('en-IN')}
                              </span>
                              {hasEdit && (
                                <div className="flex items-center">
                                  <button
                                    onClick={() => handleOpenEditRecord(r)}
                                    className="p-0.5 text-slate-500 hover:text-amber-300"
                                    title="Edit purchase"
                                  >
                                    <Edit2 className="w-2.5 h-2.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteRecord(r.id)}
                                    className="p-0.5 text-slate-500 hover:text-red-400"
                                    title="Delete purchase"
                                  >
                                    <Trash2 className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="mt-2 pt-1 border-t border-slate-800/80 text-right text-xs font-mono font-bold text-emerald-400">
                      Total: ₹{Number(vendor.totalPurchased || 0).toLocaleString('en-IN')}
                    </div>
                  </div>

                  {/* Payment Column */}
                  <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-blue-400 pb-1 border-b border-slate-800 flex items-center justify-between">
                      <span>Payment (Diya)</span>
                      <CreditCard className="w-3.5 h-3.5" />
                    </div>
                    <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {payments.length === 0 ? (
                        <p className="text-[10px] text-slate-600 italic py-2 text-center">No payments</p>
                      ) : (
                        payments.map((r) => (
                          <div key={r.id} className="flex items-center justify-between text-[11px] hover:bg-slate-900/50 p-0.5 rounded">
                            <span className="text-slate-400 truncate mr-1" title={r.record_date}>
                              {r.record_date}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="font-mono font-bold text-blue-300">
                                ₹{Number(r.amount).toLocaleString('en-IN')}
                              </span>
                              {hasEdit && (
                                <div className="flex items-center">
                                  <button
                                    onClick={() => handleOpenEditRecord(r)}
                                    className="p-0.5 text-slate-500 hover:text-amber-300"
                                    title="Edit payment"
                                  >
                                    <Edit2 className="w-2.5 h-2.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteRecord(r.id)}
                                    className="p-0.5 text-slate-500 hover:text-red-400"
                                    title="Delete payment"
                                  >
                                    <Trash2 className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="mt-2 pt-1 border-t border-slate-800/80 text-right text-xs font-mono font-bold text-blue-400">
                      Total: ₹{Number(vendor.totalPaid || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer: कितना रहता हैं */}
              <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-slate-400 font-semibold uppercase">कितना रहता हैं (Outstanding):</div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    ₹{vendor.totalPurchased || 0} - ₹{vendor.totalPaid || 0}
                  </div>
                </div>
                <div
                  className={`text-base font-extrabold font-mono px-3 py-1 rounded-xl border ${
                    pending > 0
                      ? 'bg-red-500/10 text-red-400 border-red-500/30'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  }`}
                >
                  ₹{pending.toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add New Vendor Modal */}
      {showAddVendorModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-400" />
                Add New Vendor (hum vendor add kar sake)
              </h3>
              <button onClick={() => setShowAddVendorModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateVendor} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Vendor Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nikhil, Mittal Uncle, Subham, V.K."
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. 9876543210"
                  value={vendorPhone}
                  onChange={(e) => setVendorPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Address / Location</label>
                <input
                  type="text"
                  placeholder="e.g. Factory Delhi / Warehouse Sec 84"
                  value={vendorAddress}
                  onChange={(e) => setVendorAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Notes / Supply Category</label>
                <input
                  type="text"
                  placeholder="e.g. Raw materials, Packaging, Toys stock"
                  value={vendorNotes}
                  onChange={(e) => setVendorNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddVendorModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20"
                >
                  Create Vendor Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Vendor Profile Modal */}
      {editingVendor && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-indigo-400" />
                Edit Vendor Profile: {editingVendor.name}
              </h3>
              <button onClick={() => setEditingVendor(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateVendor} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Vendor Name *</label>
                <input
                  type="text"
                  required
                  value={editVendorName}
                  onChange={(e) => setEditVendorName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={editVendorPhone}
                  onChange={(e) => setEditVendorPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Address / Location</label>
                <input
                  type="text"
                  value={editVendorAddress}
                  onChange={(e) => setEditVendorAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Notes / Supply Category</label>
                <input
                  type="text"
                  value={editVendorNotes}
                  onChange={(e) => setEditVendorNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingVendor(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Transaction Modal (Purchase vs Payment) */}
      {showRecordModal && activeVendor && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                {recordType === 'purchase' ? (
                  <ShoppingBag className="w-4 h-4 text-emerald-400" />
                ) : (
                  <CreditCard className="w-4 h-4 text-blue-400" />
                )}
                {recordType === 'purchase' ? 'Log Purchase (खरीदा)' : 'Log Payment (Diya)'} • {activeVendor.name}
              </h3>
              <button onClick={() => setShowRecordModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="space-y-4 mt-4">
              <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setRecordType('purchase')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    recordType === 'purchase' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  खरीदा (Purchase / Bill)
                </button>
                <button
                  type="button"
                  onClick={() => setRecordType('payment')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    recordType === 'payment' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Payment (Diya)
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Date</label>
                  <input
                    type="date"
                    value={recordDate}
                    onChange={(e) => setRecordDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Bill / Invoice No</label>
                  <input
                    type="text"
                    placeholder="e.g. INV-1049"
                    value={billNo}
                    onChange={(e) => setBillNo(e.target.value)}
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
                  placeholder="e.g. 50000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Notes / Description</label>
                <input
                  type="text"
                  placeholder="e.g. 100 pcs cartoon plush toys, NEFT payment"
                  value={recordNotes}
                  onChange={(e) => setRecordNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRecordModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 rounded-xl text-white text-xs font-semibold shadow-lg ${
                    recordType === 'purchase' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-blue-600 hover:bg-blue-500'
                  }`}
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Transaction Modal */}
      {editingRecord && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-amber-400" />
                Edit Transaction Record
              </h3>
              <button onClick={() => setEditingRecord(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateRecord} className="space-y-4 mt-4">
              <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditRecordType('purchase')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    editRecordType === 'purchase' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  खरीदा (Purchase)
                </button>
                <button
                  type="button"
                  onClick={() => setEditRecordType('payment')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    editRecordType === 'payment' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Payment (Diya)
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Date</label>
                  <input
                    type="date"
                    value={editRecordDate}
                    onChange={(e) => setEditRecordDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Bill / Invoice No</label>
                  <input
                    type="text"
                    value={editBillNo}
                    onChange={(e) => setEditBillNo(e.target.value)}
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
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm font-mono text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Notes / Description</label>
                <input
                  type="text"
                  value={editRecordNotes}
                  onChange={(e) => setEditRecordNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg shadow-amber-600/20"
                >
                  Update Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print / Statement Modal */}
      {statementVendor && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            {/* Action Bar */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-bold">Vendor Khata Statement</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyWhatsAppStatement(statementVendor)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copiedMsg ? 'Copied!' : 'Copy for WhatsApp'}
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print / PDF
                </button>
                <button onClick={() => setStatementVendor(null)} className="p-1.5 text-slate-400 hover:text-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Statement Document */}
            <div className="mt-6 space-y-6">
              {/* Company & Vendor Header */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-950">PANDANEST</h1>
                  <p className="text-xs text-slate-500 font-mono">admin.pandanest.in</p>
                  <p className="text-xs text-slate-500">Sector 84, Gurugram, Haryana</p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500 font-semibold uppercase">Statement Date:</div>
                  <div className="text-sm font-bold">{new Date().toLocaleDateString('en-IN')}</div>
                  <div className="text-xs text-slate-500 mt-1">Status: Active Khata</div>
                </div>
              </div>

              {/* Vendor Info Box */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="font-semibold text-slate-500 uppercase text-[10px]">Vendor Name</div>
                  <div className="text-base font-bold text-slate-900">{statementVendor.name}</div>
                  {statementVendor.notes && <div className="text-slate-600 mt-0.5">{statementVendor.notes}</div>}
                </div>
                <div>
                  <div className="font-semibold text-slate-500 uppercase text-[10px]">Contact & Location</div>
                  <div className="text-slate-900 font-medium">{statementVendor.phone || 'Phone not set'}</div>
                  <div className="text-slate-600">{statementVendor.address || 'Address not set'}</div>
                </div>
              </div>

              {/* Summary KPIs */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                  <div className="text-[10px] font-bold uppercase text-emerald-800">Total Purchases (खरीदा)</div>
                  <div className="text-lg font-black font-mono text-emerald-700 mt-1">
                    ₹{Number(statementVendor.totalPurchased || 0).toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl">
                  <div className="text-[10px] font-bold uppercase text-blue-800">Total Payments (Diya)</div>
                  <div className="text-lg font-black font-mono text-blue-700 mt-1">
                    ₹{Number(statementVendor.totalPaid || 0).toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="bg-red-50 border border-red-200 p-3 rounded-xl">
                  <div className="text-[10px] font-bold uppercase text-red-800">कितना रहता है (Outstanding)</div>
                  <div className="text-lg font-black font-mono text-red-700 mt-1">
                    ₹{Number(statementVendor.balancePending || 0).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Ledger Items Table */}
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-700 mb-2">Transaction History</h4>
                <table className="w-full text-xs text-left border-collapse border border-slate-200">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-2 border border-slate-200">Date</th>
                      <th className="p-2 border border-slate-200">Type</th>
                      <th className="p-2 border border-slate-200">Bill No / Ref</th>
                      <th className="p-2 border border-slate-200">Description</th>
                      <th className="p-2 border border-slate-200 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(statementVendor.records || []).map((r) => (
                      <tr key={r.id} className="border-b border-slate-200 font-mono">
                        <td className="p-2 border border-slate-200 font-sans">{r.record_date}</td>
                        <td className="p-2 border border-slate-200">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                              r.record_type === 'purchase'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {r.record_type === 'purchase' ? 'खरीदा' : 'Payment'}
                          </span>
                        </td>
                        <td className="p-2 border border-slate-200 text-slate-600">{r.bill_no || '-'}</td>
                        <td className="p-2 border border-slate-200 text-slate-600 font-sans">{r.notes || '-'}</td>
                        <td
                          className={`p-2 border border-slate-200 text-right font-bold ${
                            r.record_type === 'purchase' ? 'text-emerald-700' : 'text-blue-700'
                          }`}
                        >
                          ₹{Number(r.amount).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer Note */}
              <div className="text-[11px] text-slate-400 pt-4 border-t border-slate-200 text-center">
                Computer-generated financial ledger statement for Panda Nest operations.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
