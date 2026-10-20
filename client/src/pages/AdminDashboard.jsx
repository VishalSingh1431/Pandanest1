import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Package,
  Users,
  ShoppingBag,
  Plus,
  Trash2,
  Edit,
  Upload,
  Calendar,
  Gift,
  Phone,
  LogOut,
  QrCode,
  CheckCircle,
  Clock,
  Sparkles,
  Printer,
  Download,
  AlertCircle,
  ShieldCheck,
  Crown,
  UserPlus,
  UserCheck,
  ShieldAlert,
  ArrowUpCircle,
  ArrowDownCircle,
  Key
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function AdminDashboard({ onLogout }) {
  const { token, admin, logout, isSuperAdmin } = useAuth();
  const effectiveIsSuperAdmin = isSuperAdmin || admin?.role === 'super_admin' || ['acubebeauty@gmail.com', 'vishalsingh05072003@gmail.com', 'vishalsingh05072003'].some(e => (admin?.email || '').toLowerCase().trim() === e || (admin?.email || '').toLowerCase().startsWith('vishalsingh05072003'));

  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory', 'leads', 'orders', 'users', 'qr'
  const [toys, setToys] = useState([]);
  const [leads, setLeads] = useState([]);
  const [orders, setOrders] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [userStats, setUserStats] = useState({ totalSuperAdmins: 1, totalAdmins: 0, totalDemotedUsers: 0, totalCustomers: 0 });
  const [stats, setStats] = useState({ totalOrders: 0, totalRevenue: 0, totalToys: 0, totalLeads: 0, pendingOrders: 0 });
  const [loading, setLoading] = useState(false);
  const [upcomingBdaysCount, setUpcomingBdaysCount] = useState(0);

  // Toy Modal state
  const [isToyModalOpen, setIsToyModalOpen] = useState(false);
  const [editingToy, setEditingToy] = useState(null);
  const [toyForm, setToyForm] = useState({
    name: '',
    category: 'RC & Vehicles',
    price: '',
    original_price: '',
    age_group: '3-5 yrs',
    description: '',
    stock: 15,
    featured: false,
    image_url_manual: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Promote User Modal state
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
  const [promoteForm, setPromoteForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'admin'
  });
  const [promoteLoading, setPromoteLoading] = useState(false);
  const [promoteError, setPromoteError] = useState('');
  const [promoteSuccess, setPromoteSuccess] = useState('');

  // Admin In-Store QR code
  const [adminQrUrl, setAdminQrUrl] = useState('');

  useEffect(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://pandanest.in';
    QRCode.toDataURL(`${origin}?page=welcome`, { width: 300, margin: 2 })
      .then(url => setAdminQrUrl(url))
      .catch(console.error);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch toys
      const resToys = await fetch('/api/toys');
      if (resToys.ok) {
        const dataToys = await resToys.json();
        setToys(dataToys);
      }

      // Fetch leads
      const resLeads = await fetch('/api/leads', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resLeads.ok) {
        const dataLeads = await resLeads.json();
        setLeads(dataLeads.leads || []);
        setUpcomingBdaysCount(dataLeads.upcomingBirthdaysCount || 0);
      }

      // Fetch orders
      const resOrders = await fetch('/api/orders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resOrders.ok) {
        const dataOrders = await resOrders.json();
        setOrders(dataOrders);
      }

      // Fetch stats
      const resStats = await fetch('/api/orders/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resStats.ok) {
        const dataStats = await resStats.json();
        setStats(dataStats);
      }

      // Fetch users (if super_admin)
      if (effectiveIsSuperAdmin) {
        const resUsers = await fetch('/api/users', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (resUsers.ok) {
          const dataUsers = await resUsers.json();
          setTeamMembers(dataUsers.team || []);
          setUserStats(dataUsers.stats || {});
        }
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token, admin?.role]);

  // Toy Modal Handlers
  const handleOpenToyModal = (toy = null) => {
    setFormError('');
    if (toy) {
      setEditingToy(toy);
      setToyForm({
        name: toy.name,
        category: toy.category,
        price: toy.price,
        original_price: toy.original_price || '',
        age_group: toy.age_group,
        description: toy.description || '',
        stock: toy.stock !== undefined ? toy.stock : 15,
        featured: toy.featured || false,
        image_url_manual: toy.image_url || ''
      });
      setImagePreview(toy.image_url || '');
    } else {
      setEditingToy(null);
      setToyForm({
        name: '',
        category: 'RC & Vehicles',
        price: '',
        original_price: '',
        age_group: '3-5 yrs',
        description: '',
        stock: 15,
        featured: false,
        image_url_manual: ''
      });
      setImagePreview('');
    }
    setSelectedFile(null);
    setIsToyModalOpen(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleToySubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!toyForm.name || !toyForm.category || !toyForm.price || !toyForm.age_group) {
      setFormError('Name, Category, Price, and Age Group are required.');
      return;
    }

    setFormLoading(true);

    try {
      const formData = new FormData();
      formData.append('name', toyForm.name);
      formData.append('category', toyForm.category);
      formData.append('price', toyForm.price);
      if (toyForm.original_price) formData.append('original_price', toyForm.original_price);
      formData.append('age_group', toyForm.age_group);
      formData.append('description', toyForm.description);
      formData.append('stock', toyForm.stock);
      formData.append('featured', toyForm.featured);

      if (selectedFile) {
        formData.append('image', selectedFile);
      } else if (toyForm.image_url_manual) {
        formData.append('image_url_manual', toyForm.image_url_manual);
      }

      const url = editingToy ? `/api/toys/${editingToy.id}` : '/api/toys';
      const method = editingToy ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save toy.');
      }

      setIsToyModalOpen(false);
      fetchData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteToy = async (id) => {
    if (!window.confirm('Are you sure you want to delete this toy from catalog?')) return;
    try {
      const res = await fetch(`/api/toys/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error('Delete toy error:', err);
    }
  };

  const handleDeleteLead = async (id) => {
    if (!window.confirm('Delete this customer lead?')) return;
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error('Delete lead error:', err);
    }
  };

  const handleUpdateOrderStatus = async (orderId, status) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error('Order status update error:', err);
    }
  };

  // User & Promotion Handlers (Super Admin Only)
  const handleOpenPromoteModal = (prefill = null) => {
    setPromoteError('');
    setPromoteSuccess('');
    if (prefill) {
      setPromoteForm({
        name: prefill.child_name ? `Parent of ${prefill.child_name}` : (prefill.name || ''),
        email: prefill.email || '',
        password: '',
        phone: prefill.phone || '',
        role: 'admin'
      });
    } else {
      setPromoteForm({
        name: '',
        email: '',
        password: '',
        phone: '',
        role: 'admin'
      });
    }
    setIsPromoteModalOpen(true);
  };

  const handlePromoteSubmit = async (e) => {
    e.preventDefault();
    setPromoteError('');
    setPromoteSuccess('');

    if (!promoteForm.name || !promoteForm.email || !promoteForm.password) {
      setPromoteError('Name, email, and password are required.');
      return;
    }

    setPromoteLoading(true);

    try {
      const res = await fetch('/api/users/promote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(promoteForm)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to promote user.');
      }

      setPromoteSuccess(data.message);
      fetchData();
      setTimeout(() => {
        setIsPromoteModalOpen(false);
      }, 1400);
    } catch (err) {
      setPromoteError(err.message);
    } finally {
      setPromoteLoading(false);
    }
  };

  const handleChangeRole = async (userId, targetRole) => {
    const roleName = targetRole === 'super_admin' ? 'Super Admin' : targetRole === 'admin' ? 'Admin' : 'User';
    if (!window.confirm(`Are you sure you want to change this account's role to ${roleName}?`)) return;

    try {
      const res = await fetch(`/api/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ role: targetRole })
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to update role');
        return;
      }
      fetchData();
    } catch (err) {
      console.error('Role update error:', err);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this admin account?')) return;
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to delete user');
        return;
      }
      fetchData();
    } catch (err) {
      console.error('Delete user error:', err);
    }
  };

  return (
    <div style={{ minHeight: '90vh', background: '#f8fafc', paddingBottom: '60px' }}>
      {/* Top Admin Header Bar */}
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '16px 0' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
              <span className="badge badge-green">Pandanest HQ</span>
              {effectiveIsSuperAdmin ? (
                <span className="badge badge-amber" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Crown size={12} color="#b45309" /> Super Admin
                </span>
              ) : (
                <span className="badge badge-blue" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={12} color="#0284c7" /> Store Admin
                </span>
              )}
            </div>
            <h1 style={{ fontSize: '1.6rem', color: '#0f172a' }}>Admin Dashboard</h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#0f172a' }}>
                {admin?.name || 'Administrator'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{admin?.email}</div>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                logout();
                if (onLogout) onLogout();
              }}
            >
              <LogOut size={15} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      <div className="container" style={{ marginTop: '24px' }}>
        {/* Metric Cards Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
          <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>Total Toys</span>
              <Package size={20} />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a' }}>{toys.length}</div>
          </div>

          <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8b5cf6', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>QR Customer Leads</span>
              <Users size={20} />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a' }}>{leads.length}</div>
          </div>

          <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f59e0b', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>Upcoming Birthdays</span>
              <Gift size={20} />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#d97706' }}>{upcomingBdaysCount}</div>
          </div>

          <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>Total Orders</span>
              <ShoppingBag size={20} />
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a' }}>{orders.length}</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e2e8f0', paddingBottom: '2px', marginBottom: '24px', overflowX: 'auto' }}>
          <button
            onClick={() => setActiveTab('inventory')}
            style={{
              padding: '10px 18px',
              fontWeight: '700',
              fontSize: '0.95rem',
              borderBottom: activeTab === 'inventory' ? '3px solid #10b981' : 'none',
              color: activeTab === 'inventory' ? '#10b981' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Package size={17} /> Toy Inventory ({toys.length})
          </button>

          <button
            onClick={() => setActiveTab('leads')}
            style={{
              padding: '10px 18px',
              fontWeight: '700',
              fontSize: '0.95rem',
              borderBottom: activeTab === 'leads' ? '3px solid #10b981' : 'none',
              color: activeTab === 'leads' ? '#10b981' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Users size={17} /> Customer QR Leads ({leads.length})
            {upcomingBdaysCount > 0 && (
              <span className="badge badge-pink" style={{ fontSize: '0.7rem' }}>
                {upcomingBdaysCount} B-Days 🎉
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            style={{
              padding: '10px 18px',
              fontWeight: '700',
              fontSize: '0.95rem',
              borderBottom: activeTab === 'orders' ? '3px solid #10b981' : 'none',
              color: activeTab === 'orders' ? '#10b981' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <ShoppingBag size={17} /> Orders ({orders.length})
          </button>

          {/* Super Admin Exclusive User Handling Tab */}
          {effectiveIsSuperAdmin && (
            <button
              onClick={() => setActiveTab('users')}
              style={{
                padding: '10px 18px',
                fontWeight: '700',
                fontSize: '0.95rem',
                borderBottom: activeTab === 'users' ? '3px solid #f59e0b' : 'none',
                color: activeTab === 'users' ? '#d97706' : '#64748b',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Crown size={17} color="#d97706" /> User & Role Handling ({teamMembers.length})
            </button>
          )}

          <button
            onClick={() => setActiveTab('qr')}
            style={{
              padding: '10px 18px',
              fontWeight: '700',
              fontSize: '0.95rem',
              borderBottom: activeTab === 'qr' ? '3px solid #10b981' : 'none',
              color: activeTab === 'qr' ? '#10b981' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <QrCode size={17} /> In-Store QR Standee
          </button>
        </div>

        {/* Tab 1: Toy Inventory Manager */}
        {activeTab === 'inventory' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.3rem', color: '#0f172a' }}>Toy Catalog Inventory</h2>
              <button className="btn btn-primary btn-sm" onClick={() => handleOpenToyModal()}>
                <Plus size={16} />
                <span>Add New Toy (Upload to Cloudinary)</span>
              </button>
            </div>

            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: '700' }}>
                      <th style={{ padding: '12px 16px' }}>Toy Preview</th>
                      <th style={{ padding: '12px 16px' }}>Name</th>
                      <th style={{ padding: '12px 16px' }}>Category</th>
                      <th style={{ padding: '12px 16px' }}>Age Group</th>
                      <th style={{ padding: '12px 16px' }}>Price</th>
                      <th style={{ padding: '12px 16px' }}>Stock</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {toys.map((toy) => (
                      <tr key={toy.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <img
                            src={toy.image_url}
                            alt={toy.name}
                            style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '10px' }}
                            onError={(e) => {
                              e.currentTarget.src = 'https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=800&auto=format&fit=crop&q=80';
                            }}
                          />
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: '700', color: '#0f172a' }}>{toy.name}</div>
                          {toy.featured && <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>Featured</span>}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span className="badge badge-green">{toy.category}</span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>{toy.age_group}</td>
                        <td style={{ padding: '12px 16px', fontWeight: '700', color: '#047857' }}>
                          ₹{Number(toy.price).toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontWeight: '600', color: toy.stock > 5 ? '#10b981' : '#ef4444' }}>
                            {toy.stock} units
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <button
                            onClick={() => handleOpenToyModal(toy)}
                            style={{ color: '#0284c7', marginRight: '10px' }}
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteToy(toy.id)}
                            style={{ color: '#ef4444' }}
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Customer Leads from QR */}
        {activeTab === 'leads' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', color: '#0f172a' }}>QR Scan Customer Registrations</h2>
                <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
                  Parents and children who registered via the in-store QR code standee.
                </p>
              </div>
            </div>

            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: '700' }}>
                      <th style={{ padding: '12px 16px' }}>Child Name</th>
                      <th style={{ padding: '12px 16px' }}>Mobile Number</th>
                      <th style={{ padding: '12px 16px' }}>Child DOB & Age</th>
                      <th style={{ padding: '12px 16px' }}>Panda Points</th>
                      <th style={{ padding: '12px 16px' }}>Birthday Alert</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                          No customer leads captured yet. Scan the store QR code to submit one!
                        </td>
                      </tr>
                    ) : (
                      leads.map((lead) => (
                        <tr key={lead.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 16px', fontWeight: '700', color: '#ec4899' }}>
                            {lead.child_name}
                            {lead.parent_name && <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: '400' }}>Parent: {lead.parent_name}</span>}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <a
                              href={`tel:${lead.phone}`}
                              style={{ color: '#0284c7', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Phone size={13} /> {lead.phone}
                            </a>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div>{lead.dob ? new Date(lead.dob).toLocaleDateString() : 'N/A'}</div>
                            {lead.child_age !== null && (
                              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>({lead.child_age} years old)</span>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span className="badge badge-amber" style={{ fontWeight: '700' }}>
                              🪙 {lead.panda_points || 100} pts
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            {lead.is_upcoming_birthday ? (
                              <span className="badge badge-amber" style={{ animation: 'pulseGlow 2s infinite' }}>
                                🎉 Birthday in {lead.days_until_birthday} days!
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                in {lead.days_until_birthday} days
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <button
                              onClick={() => handleDeleteLead(lead.id)}
                              style={{ color: '#ef4444' }}
                              title="Delete Lead"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Orders Management */}
        {activeTab === 'orders' && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.3rem', color: '#0f172a' }}>Customer Orders</h2>
              <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
                Track delivery statuses and addresses for toys purchased online.
              </p>
            </div>

            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: '700' }}>
                      <th style={{ padding: '12px 16px' }}>Order #</th>
                      <th style={{ padding: '12px 16px' }}>Customer</th>
                      <th style={{ padding: '12px 16px' }}>Delivery Address</th>
                      <th style={{ padding: '12px 16px' }}>Items</th>
                      <th style={{ padding: '12px 16px' }}>Total & Mode</th>
                      <th style={{ padding: '12px 16px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                          No orders placed yet. Add toys to cart and checkout to create one!
                        </td>
                      </tr>
                    ) : (
                      orders.map((order) => {
                        let parsedItems = [];
                        try {
                          parsedItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
                        } catch {
                          parsedItems = [];
                        }

                        return (
                          <tr key={order.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '12px 16px', fontWeight: '700', color: '#10b981' }}>
                              {order.order_number}
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ fontWeight: '600', color: '#0f172a' }}>{order.customer_name}</div>
                              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{order.phone}</div>
                            </td>
                            <td style={{ padding: '12px 16px', maxWidth: '240px' }}>
                              <div style={{ fontSize: '0.85rem', color: '#334155' }}>{order.address}</div>
                              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{order.city} - {order.pincode}</div>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ fontSize: '0.85rem', color: '#0f172a' }}>
                                {parsedItems.map(i => `${i.name} (x${i.quantity})`).join(', ')}
                              </div>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ fontWeight: '800', color: '#047857' }}>
                                ₹{Number(order.total_amount).toLocaleString('en-IN')}
                              </div>
                              <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>
                                {order.payment_method}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <select
                                value={order.status}
                                onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '8px',
                                  fontSize: '0.8rem',
                                  fontWeight: '600',
                                  border: '1px solid #cbd5e1',
                                  background:
                                    order.status === 'Delivered' ? '#ecfdf5' :
                                    order.status === 'Pending' ? '#fffbeb' : '#f1f5f9',
                                  color:
                                    order.status === 'Delivered' ? '#059669' :
                                    order.status === 'Pending' ? '#b45309' : '#334155'
                                }}
                              >
                                <option value="Pending">Pending</option>
                                <option value="Confirmed">Confirmed</option>
                                <option value="Dispatched">Dispatched</option>
                                <option value="Delivered">Delivered</option>
                                <option value="Cancelled">Cancelled</option>
                              </select>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: User & Role Handling (Super Admin Exclusive) */}
        {activeTab === 'users' && effectiveIsSuperAdmin && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Crown size={20} color="#d97706" />
                  <h2 style={{ fontSize: '1.4rem', color: '#0f172a' }}>User & Role Handling (Hierarchy)</h2>
                </div>
                <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
                  Three hierarchy tiers: <strong>Super Admin</strong>, <strong>Admin</strong>, and <strong>User</strong>. Promote or demote team members as Super Admin.
                </p>
              </div>

              <button className="btn btn-primary btn-sm" onClick={() => handleOpenPromoteModal()}>
                <UserPlus size={16} />
                <span>Promote / Add New Admin</span>
              </button>
            </div>

            {/* Hierarchy Explainer Banner */}
            <div
              style={{
                background: 'linear-gradient(135deg, #fef3c7 0%, #ffffff 100%)',
                border: '1.5px solid #fde68a',
                borderRadius: '16px',
                padding: '16px 20px',
                marginBottom: '20px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '14px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>👑</span>
                <div>
                  <div style={{ fontWeight: '800', color: '#92400e', fontSize: '0.9rem' }}>Tier 1: Super Admin</div>
                  <p style={{ fontSize: '0.8rem', color: '#78350f' }}>Full control over system, inventory, orders, leads, and promotes/demotes admins.</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>🛡️</span>
                <div>
                  <div style={{ fontWeight: '800', color: '#0369a1', fontSize: '0.9rem' }}>Tier 2: Admin</div>
                  <p style={{ fontSize: '0.8rem', color: '#0c4a6e' }}>Manages toy inventory, uploads photos via Cloudinary, and manages orders/leads.</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>👤</span>
                <div>
                  <div style={{ fontWeight: '800', color: '#334155', fontSize: '0.9rem' }}>Tier 3: User</div>
                  <p style={{ fontSize: '0.8rem', color: '#475569' }}>Standard storefront customer/member. Can be promoted to Admin anytime by Super Admin.</p>
                </div>
              </div>
            </div>

            {/* Team Table */}
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: '700' }}>
                      <th style={{ padding: '12px 16px' }}>Team Member</th>
                      <th style={{ padding: '12px 16px' }}>Email & Phone</th>
                      <th style={{ padding: '12px 16px' }}>Current Role Hierarchy</th>
                      <th style={{ padding: '12px 16px' }}>Date Added</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Role Actions (Promote / Demote)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamMembers.map((member) => {
                      const isSelf = String(member.id) === String(admin?.id);
                      return (
                        <tr key={member.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {member.name || 'Admin'}
                              {isSelf && (
                                <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>You</span>
                              )}
                            </div>
                          </td>

                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ color: '#0f172a', fontWeight: '500' }}>{member.email}</div>
                            {member.phone && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{member.phone}</div>}
                          </td>

                          <td style={{ padding: '12px 16px' }}>
                            {member.role === 'super_admin' ? (
                              <span className="badge badge-amber" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}>
                                <Crown size={13} color="#b45309" /> Super Admin
                              </span>
                            ) : member.role === 'admin' ? (
                              <span className="badge badge-blue" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}>
                                <ShieldCheck size={13} color="#0284c7" /> Admin
                              </span>
                            ) : (
                              <span className="badge" style={{ background: '#f1f5f9', color: '#64748b', fontSize: '0.8rem' }}>
                                👤 User (Revoked)
                              </span>
                            )}
                          </td>

                          <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.85rem' }}>
                            {member.created_at ? new Date(member.created_at).toLocaleDateString() : 'Active'}
                          </td>

                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                              {/* If Admin: can promote to Super Admin OR demote to User */}
                              {member.role === 'admin' && (
                                <>
                                  <button
                                    onClick={() => handleChangeRole(member.id, 'super_admin')}
                                    style={{
                                      background: '#fef3c7',
                                      color: '#b45309',
                                      border: '1px solid #fde68a',
                                      borderRadius: '8px',
                                      padding: '4px 8px',
                                      fontSize: '0.75rem',
                                      fontWeight: '700',
                                      cursor: 'pointer'
                                    }}
                                    title="Promote to Super Admin"
                                  >
                                    Promote to Super Admin 👑
                                  </button>

                                  <button
                                    onClick={() => handleChangeRole(member.id, 'user')}
                                    style={{
                                      background: '#f1f5f9',
                                      color: '#475569',
                                      border: '1px solid #cbd5e1',
                                      borderRadius: '8px',
                                      padding: '4px 8px',
                                      fontSize: '0.75rem',
                                      fontWeight: '700',
                                      cursor: 'pointer'
                                    }}
                                    title="Demote to User (Revokes admin access)"
                                  >
                                    Demote to User 👤
                                  </button>
                                </>
                              )}

                              {/* If Super Admin (not self): can demote to Admin */}
                              {member.role === 'super_admin' && !isSelf && (
                                <button
                                  onClick={() => handleChangeRole(member.id, 'admin')}
                                  style={{
                                    background: '#e0f2fe',
                                    color: '#0369a1',
                                    border: '1px solid #bae6fd',
                                    borderRadius: '8px',
                                    padding: '4px 8px',
                                    fontSize: '0.75rem',
                                    fontWeight: '700',
                                    cursor: 'pointer'
                                  }}
                                  title="Demote to Admin"
                                >
                                  Demote to Admin 🛡️
                                </button>
                              )}

                              {/* If User (demoted): can promote back to Admin */}
                              {member.role === 'user' && (
                                <button
                                  onClick={() => handleChangeRole(member.id, 'admin')}
                                  style={{
                                    background: '#ecfdf5',
                                    color: '#047857',
                                    border: '1px solid #a7f3d0',
                                    borderRadius: '8px',
                                    padding: '4px 8px',
                                    fontSize: '0.75rem',
                                    fontWeight: '700',
                                    cursor: 'pointer'
                                  }}
                                  title="Promote to Admin"
                                >
                                  Restore Admin 🛡️
                                </button>
                              )}

                              {!isSelf && (
                                <button
                                  onClick={() => handleDeleteUser(member.id)}
                                  style={{ color: '#ef4444', padding: '4px' }}
                                  title="Delete Account"
                                >
                                  <Trash2 size={15} />
                                </button>
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
          </div>
        )}

        {/* Tab 5: In-Store QR Standee Generator */}
        {activeTab === 'qr' && (
          <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.5rem', color: '#0f172a' }}>Printable In-Store Standee</h2>
              <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                Download or print this high-resolution poster for your shop counter.
              </p>
            </div>

            <div
              style={{
                background: 'linear-gradient(180deg, #ecfdf5 0%, #ffffff 100%)',
                border: '2px solid #10b981',
                borderRadius: '24px',
                padding: '36px 24px',
                boxShadow: 'var(--shadow-xl)',
                marginBottom: '24px'
              }}
            >
              <img
                src="/logo.jpeg"
                alt="Panda Nest Logo"
                style={{
                  height: '84px',
                  width: 'auto',
                  marginBottom: '12px',
                  borderRadius: '14px',
                  background: 'white',
                  padding: '4px 10px',
                  boxShadow: '0 6px 16px rgba(0,0,0,0.06)'
                }}
              />
              <h3 style={{ fontSize: '1.8rem', color: '#047857', marginBottom: '6px' }}>Panda Nest Toy Haven</h3>
              <p style={{ fontSize: '1rem', color: '#64748b', marginBottom: '20px' }}>
                Scan with any phone camera to unlock 100 Panda Points, birthday rewards & browse all toys!
              </p>

              <div
                style={{
                  background: 'white',
                  padding: '16px',
                  borderRadius: '20px',
                  display: 'inline-block',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.08)'
                }}
              >
                {adminQrUrl ? (
                  <img src={adminQrUrl} alt="Store QR" style={{ width: '240px', height: '240px', display: 'block' }} />
                ) : (
                  <div>Generating...</div>
                )}
              </div>

              <div style={{ marginTop: '16px', fontSize: '1rem', fontWeight: '800', color: '#10b981' }}>
                pandanest.in
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                className="btn btn-primary"
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = adminQrUrl;
                  a.download = 'pandanest-store-qr.png';
                  a.click();
                }}
              >
                <Download size={16} /> Download Standee PNG
              </button>
              <button className="btn btn-secondary" onClick={() => window.print()}>
                <Printer size={16} /> Print Standee
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Toy Modal */}
      {isToyModalOpen && (
        <div className="modal-overlay" onClick={() => setIsToyModalOpen(false)}>
          <div
            className="modal-card"
            style={{ maxWidth: '640px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.4rem', color: '#0f172a' }}>
                {editingToy ? 'Edit Toy Details' : 'Add New Toy to Catalog'}
              </h2>
              <button className="modal-close" onClick={() => setIsToyModalOpen(false)} style={{ position: 'static' }}>
                ✕
              </button>
            </div>

            {formError && (
              <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '16px' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleToySubmit}>
              <div className="form-group">
                <label className="form-label">Toy Title *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. Nitro Monster Drift Truck 4WD"
                  value={toyForm.name}
                  onChange={(e) => setToyForm({ ...toyForm, name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select
                    className="form-input"
                    value={toyForm.category}
                    onChange={(e) => setToyForm({ ...toyForm, category: e.target.value })}
                  >
                    <option value="RC & Vehicles">RC & Vehicles</option>
                    <option value="Plush & Soft Toys">Plush & Soft Toys</option>
                    <option value="Dolls & Playsets">Dolls & Playsets</option>
                    <option value="Building Blocks & Sets">Building Blocks & Sets</option>
                    <option value="Outdoor & Action">Outdoor & Action</option>
                    <option value="Board Games & Fun">Board Games & Fun</option>
                    <option value="Musical & Sensory Toys">Musical & Sensory Toys</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Age Group *</label>
                  <select
                    className="form-input"
                    value={toyForm.age_group}
                    onChange={(e) => setToyForm({ ...toyForm, age_group: e.target.value })}
                  >
                    <option value="0-3 yrs">0-3 yrs</option>
                    <option value="3-5 yrs">3-5 yrs</option>
                    <option value="5-8 yrs">5-8 yrs</option>
                    <option value="8-12 yrs">8-12 yrs</option>
                    <option value="12+ yrs">12+ yrs</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Price (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="form-input"
                    placeholder="999"
                    value={toyForm.price}
                    onChange={(e) => setToyForm({ ...toyForm, price: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Original Price (₹)</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    placeholder="1499"
                    value={toyForm.original_price}
                    onChange={(e) => setToyForm({ ...toyForm, original_price: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Stock Quantity</label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={toyForm.stock}
                    onChange={(e) => setToyForm({ ...toyForm, stock: e.target.value })}
                  />
                </div>
              </div>

              {/* Image Upload with Cloudinary & Live Preview */}
              <div className="form-group">
                <label className="form-label">Toy Photo (Cloudinary Upload)</label>
                <div
                  style={{
                    border: '2px dashed #cbd5e1',
                    borderRadius: '14px',
                    padding: '16px',
                    textAlign: 'center',
                    background: '#f8fafc',
                    cursor: 'pointer'
                  }}
                  onClick={() => document.getElementById('toyFileInput').click()}
                >
                  <input
                    id="toyFileInput"
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                  {imagePreview ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <img
                        src={imagePreview}
                        alt="Preview"
                        style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '12px' }}
                      />
                      <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: '600' }}>
                        Click to change photo
                      </span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                      <Upload size={28} color="#94a3b8" />
                      <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#334155' }}>
                        Choose toy photo to upload
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        Auto-uploaded to Cloudinary storage
                      </span>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Or paste image URL directly:</span>
                  <input
                    type="url"
                    className="form-input"
                    style={{ marginTop: '4px', fontSize: '0.85rem' }}
                    placeholder="https://images.unsplash.com/..."
                    value={toyForm.image_url_manual}
                    onChange={(e) => {
                      setToyForm({ ...toyForm, image_url_manual: e.target.value });
                      if (!selectedFile) setImagePreview(e.target.value);
                    }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  rows={3}
                  className="form-input"
                  placeholder="Tell parents what makes this toy so much fun..."
                  value={toyForm.description}
                  onChange={(e) => setToyForm({ ...toyForm, description: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="featuredCheck"
                  checked={toyForm.featured}
                  onChange={(e) => setToyForm({ ...toyForm, featured: e.target.checked })}
                />
                <label htmlFor="featuredCheck" style={{ fontSize: '0.9rem', fontWeight: '600', color: '#0f172a', cursor: 'pointer' }}>
                  Feature this toy on storefront highlights ⭐
                </label>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setIsToyModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="btn btn-primary"
                  style={{ flex: 2 }}
                >
                  {formLoading ? 'Saving Toy...' : editingToy ? 'Update Toy' : 'Add to Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Super Admin Promotion Modal (Promote User to Admin/Super Admin) */}
      {isPromoteModalOpen && (
        <div className="modal-overlay" onClick={() => setIsPromoteModalOpen(false)}>
          <div
            className="modal-card"
            style={{ maxWidth: '520px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ background: '#fef3c7', color: '#b45309', padding: '6px', borderRadius: '10px' }}>
                  <Crown size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.35rem', color: '#0f172a' }}>
                    Promote User via Super Admin
                  </h2>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Grant Administrator or Super Admin privileges</span>
                </div>
              </div>
              <button className="modal-close" onClick={() => setIsPromoteModalOpen(false)} style={{ position: 'static' }}>
                ✕
              </button>
            </div>

            {promoteError && (
              <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '16px' }}>
                {promoteError}
              </div>
            )}

            {promoteSuccess && (
              <div style={{ background: '#ecfdf5', color: '#047857', padding: '10px 14px', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={16} />
                <span>{promoteSuccess}</span>
              </div>
            )}

            <form onSubmit={handlePromoteSubmit}>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. Pooja Sharma / Rahul"
                  value={promoteForm.name}
                  onChange={(e) => setPromoteForm({ ...promoteForm, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Login Email Address *</label>
                <input
                  type="email"
                  required
                  className="form-input"
                  placeholder="e.g. pooja@pandanest.in"
                  value={promoteForm.email}
                  onChange={(e) => setPromoteForm({ ...promoteForm, email: e.target.value })}
                />
                <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  This email will be used by the user to log into the Admin Portal.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Set Login Password *</label>
                <input
                  type="password"
                  required
                  className="form-input"
                  placeholder="••••••••"
                  value={promoteForm.password}
                  onChange={(e) => setPromoteForm({ ...promoteForm, password: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mobile / WhatsApp Number</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="e.g. 7380405227"
                  value={promoteForm.phone}
                  onChange={(e) => setPromoteForm({ ...promoteForm, phone: e.target.value })}
                />
              </div>

              {/* Target Role Hierarchy Selection */}
              <div className="form-group">
                <label className="form-label">Select Role Hierarchy</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <label
                    style={{
                      border: promoteForm.role === 'admin' ? '2px solid #0284c7' : '1.5px solid #e2e8f0',
                      background: promoteForm.role === 'admin' ? '#f0f9ff' : '#ffffff',
                      borderRadius: '12px',
                      padding: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="radio"
                        name="promote_role"
                        value="admin"
                        checked={promoteForm.role === 'admin'}
                        onChange={() => setPromoteForm({ ...promoteForm, role: 'admin' })}
                      />
                      <ShieldCheck size={16} color="#0284c7" />
                      <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>Admin</strong>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', paddingLeft: '20px' }}>
                      Can manage toys, leads & orders
                    </span>
                  </label>

                  <label
                    style={{
                      border: promoteForm.role === 'super_admin' ? '2px solid #f59e0b' : '1.5px solid #e2e8f0',
                      background: promoteForm.role === 'super_admin' ? '#fefce8' : '#ffffff',
                      borderRadius: '12px',
                      padding: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="radio"
                        name="promote_role"
                        value="super_admin"
                        checked={promoteForm.role === 'super_admin'}
                        onChange={() => setPromoteForm({ ...promoteForm, role: 'super_admin' })}
                      />
                      <Crown size={16} color="#d97706" />
                      <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>Super Admin</strong>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', paddingLeft: '20px' }}>
                      Full control + user handling
                    </span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '22px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setIsPromoteModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={promoteLoading}
                  className="btn btn-primary"
                  style={{ flex: 2 }}
                >
                  {promoteLoading ? 'Promoting...' : `Promote to ${promoteForm.role === 'super_admin' ? 'Super Admin 👑' : 'Admin 🛡️'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
