import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { adminAPI, productAPI, resolveAssetUrl } from '../api/client';
import './AdminPage.css';

export default function AdminPage() {
  const { user, siteConfig, updateSiteConfig } = useStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState('dashboard');
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [users, setUsers] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [allDesigns, setAllDesigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [viewUserDesigns, setViewUserDesigns] = useState(null);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  // Password Settings State
  const [passwordForm, setPasswordForm] = useState({ old_password: '', new_password: '', confirm_password: '' });
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Template Upload State
  const [templateForm, setTemplateForm] = useState({ name: '', category: 'general', style: 'modern', colors: '' });
  const [templateFile, setTemplateFile] = useState(null);
  const [templateUploadLoading, setTemplateUploadLoading] = useState(false);
  const [templateError, setTemplateError] = useState('');

  // Dynamic Site Config State
  const [editConfigs, setEditConfigs] = useState({});
  const [contentSuccess, setContentSuccess] = useState('');
  const [contentError, setContentError] = useState('');
  const [contentLoading, setContentLoading] = useState(false);

  // Generic File Upload State
  const [uploads, setUploads] = useState([]);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  useEffect(() => {
    if (siteConfig) {
      setEditConfigs(siteConfig);
    }
  }, [siteConfig]);

  async function loadData() {
    try {
      const o = await adminAPI.getOrders();
      setOrders(o.data);
    } catch (err) { console.error("Failed to load orders", err); }

    try {
      const p = await productAPI.list();
      setProducts(p.data);
    } catch (err) { console.error("Failed to load products", err); }

    try {
      const i = await adminAPI.getInquiries();
      setInquiries(i.data);
    } catch (err) { console.error("Failed to load inquiries", err); }

    try {
      const u = await adminAPI.getUsers();
      setUsers(u.data);
    } catch (err) { console.error("Failed to load users", err); }

    try {
      const m = await adminAPI.getMetrics();
      setMetrics(m.data);
    } catch (err) { console.error("Failed to load metrics", err); }

    try {
      const d = await adminAPI.getDesigns();
      setAllDesigns(d.data);
    } catch (err) { console.error("Failed to load designs", err); }

    try {
      const t = await adminAPI.getTemplates();
      setTemplates(t.data);
    } catch (err) { console.error("Failed to load templates", err); }

    try {
      const uls = await adminAPI.getUploads();
      setUploads(uls.data);
    } catch (err) { console.error("Failed to load uploads", err); }
  }

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }
    loadData();
  }, [user, navigate]);

  const updateOrderStatus = async (id, status) => {
    try {
      await adminAPI.updateOrder(id, { status });
      loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to update order status");
    }
  };

  const toggleUserSuspension = async (userId, currentSuspension) => {
    try {
      await adminAPI.updateUserStatus(userId, !currentSuspension);
      loadData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to update user status");
    }
  };

  // Change Password Handler
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError("New passwords do not match.");
      return;
    }
    if (passwordForm.new_password.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }
    setPasswordLoading(true);
    try {
      await adminAPI.changePassword({
        old_password: passwordForm.old_password,
        new_password: passwordForm.new_password
      });
      setPasswordSuccess("Password updated successfully!");
      setPasswordForm({ old_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setPasswordError(err.response?.data?.detail || "Failed to update password");
    } finally {
      setPasswordLoading(false);
    }
  };

  // Upload Template Handler
  const handleTemplateCreate = async (e) => {
    e.preventDefault();
    setTemplateError('');
    if (!templateForm.name.trim() || !templateFile) {
      setTemplateError("Please fill name and choose a design template image.");
      return;
    }
    setTemplateUploadLoading(true);
    try {
      // 1. Upload File first
      const formData = new FormData();
      formData.append('file', templateFile);
      const uploadRes = await adminAPI.uploadTemplate(formData);
      const filePath = uploadRes.data.file_path;

      // Parse colors from comma-separated input
      const colorsArray = templateForm.colors
        ? templateForm.colors.split(',').map(c => c.trim().toLowerCase())
        : ['#ffffff', '#000000'];

      // 2. Save template details
      await adminAPI.createTemplate({
        name: templateForm.name,
        category: templateForm.category,
        style: templateForm.style,
        file_path: filePath,
        colors: colorsArray
      });

      // Clear form & reload
      setTemplateForm({ name: '', category: 'general', style: 'modern', colors: '' });
      setTemplateFile(null);
      // Clear file input manually
      document.getElementById('template-file-input').value = '';
      loadData();
    } catch (err) {
      setTemplateError(err.response?.data?.detail || "Failed to upload design template");
    } finally {
      setTemplateUploadLoading(false);
    }
  };

  // Delete Template Handler
  const handleDeleteTemplate = async (id) => {
    if (!window.confirm("Are you sure you want to delete this custom template? It will no longer show up to users.")) return;
    try {
      await adminAPI.deleteTemplate(id);
      loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to delete template");
    }
  };

  // Save Dynamic Content Configurations
  const handleContentSave = async (e) => {
    e.preventDefault();
    setContentSuccess('');
    setContentError('');
    setContentLoading(true);
    try {
      await updateSiteConfig(editConfigs);
      setContentSuccess("Homepage contents updated successfully!");
    } catch (err) {
      setContentError(err.response?.data?.detail || "Failed to update configurations");
    } finally {
      setContentLoading(false);
    }
  };

  // Handle generic file upload
  const handleFileUpload = async (e) => {
    e.preventDefault();
    setUploadError('');
    setUploadSuccess('');
    if (!uploadFile) {
      setUploadError("Please choose a file to upload.");
      return;
    }
    setUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      await adminAPI.uploadFile(formData);
      setUploadSuccess("File uploaded successfully to Design library!");
      setUploadFile(null);
      document.getElementById('generic-file-input').value = '';
      loadData();
    } catch (err) {
      setUploadError(err.response?.data?.detail || "Failed to upload file");
    } finally {
      setUploadLoading(false);
    }
  };

  // Handle deleting uploaded file
  const handleDeleteUpload = async (id) => {
    if (!window.confirm("Are you sure you want to delete this file? This action is permanent.")) return;
    try {
      await adminAPI.deleteUpload(id);
      loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to delete file");
    }
  };

  if (!user || user.role !== 'admin') return null;

  const statusOptions = ['pending', 'confirmed', 'production', 'shipped', 'delivered', 'cancelled'];
  const statusColors = {
    pending: 'badge-warning',
    confirmed: 'badge-info',
    production: 'badge-info',
    shipped: 'badge-success',
    delivered: 'badge-success',
    cancelled: 'badge-error',
    new: 'badge-info',
    contacted: 'badge-warning',
    quoted: 'badge-success',
    closed: 'badge-error'
  };

  return (
    <div className="admin-page container">
      <div className="admin-header">
        <h1>⚙️ Admin Command Center</h1>
        <p className="admin-subtitle">Manage packaging designs, B2B bulk orders, templates, and catalog products</p>
      </div>

      <div className="dashboard-tabs">
        <button className={`tab-btn ${tab === 'dashboard' ? 'active' : ''}`} onClick={() => setTab('dashboard')}>📊 Dashboard</button>
        <button className={`tab-btn ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>👥 Users</button>
        <button className={`tab-btn ${tab === 'orders' ? 'active' : ''}`} onClick={() => setTab('orders')}>📦 Orders ({orders.length})</button>
        <button className={`tab-btn ${tab === 'products' ? 'active' : ''}`} onClick={() => setTab('products')}>📋 Products</button>
        <button className={`tab-btn ${tab === 'templates' ? 'active' : ''}`} onClick={() => setTab('templates')}>🎨 Custom Templates ({templates.length})</button>
        <button className={`tab-btn ${tab === 'uploads' ? 'active' : ''}`} onClick={() => setTab('uploads')}>📁 Design Files ({uploads.length})</button>
        <button className={`tab-btn ${tab === 'content' ? 'active' : ''}`} onClick={() => setTab('content')}>✏️ Site Content</button>
        <button className={`tab-btn ${tab === 'inquiries' ? 'active' : ''}`} onClick={() => setTab('inquiries')}>📩 Inquiries ({inquiries.length})</button>
      </div>

      {tab === 'dashboard' && metrics && (
        <div className="metrics-dashboard">
          <div className="metrics-grid">
            <div className="metric-card glass">
              <span className="metric-title">Total B2B Customers</span>
              <span className="metric-value">{metrics.total_users}</span>
              <span className="metric-subtext">Registered partners</span>
            </div>
            <div className="metric-card glass">
              <span className="metric-title">Active Users Today</span>
              <span className="metric-value">{metrics.active_users_today}</span>
              <span className="metric-subtext">Engaged design sessions</span>
            </div>
            <div className="metric-card glass">
              <span className="metric-title">New Signups Today</span>
              <span className="metric-value">{metrics.new_signups}</span>
              <span className="metric-subtext">Brand onboarding leads</span>
            </div>
            <div className="metric-card glass">
              <span className="metric-title">Designs Generated</span>
              <span className="metric-value">{metrics.total_designs_generated}</span>
              <span className="metric-subtext">Label packaging drafts</span>
            </div>
          </div>

          <div className="metrics-section-title">💰 Bulk Sales Revenue Summary</div>
          <div className="metrics-grid revenue-grid">
            <div className="metric-card revenue-card">
              <span className="metric-title">Daily Revenue</span>
              <span className="metric-value text-primary">₹{(metrics.revenue_daily || 0).toLocaleString()}</span>
              <span className="metric-subtext">Orders placed today</span>
            </div>
            <div className="metric-card revenue-card">
              <span className="metric-title">Monthly Revenue</span>
              <span className="metric-value text-primary">₹{(metrics.revenue_monthly || 0).toLocaleString()}</span>
              <span className="metric-subtext">Last 30 days orders</span>
            </div>
            <div className="metric-card revenue-card">
              <span className="metric-title">Yearly Revenue</span>
              <span className="metric-value text-primary">₹{(metrics.revenue_yearly || 0).toLocaleString()}</span>
              <span className="metric-subtext">Last 12 months bulk volume</span>
            </div>
            <div className="metric-card revenue-card">
              <span className="metric-title">Order Conversion Rate</span>
              <span className="metric-value text-primary">{metrics.conversion_rate}%</span>
              <span className="metric-subtext">Percentage of active buyers</span>
            </div>
          </div>

          <div className="dashboard-charts-layout" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px', marginTop: '20px' }}>
            {/* Template analytics */}
            <div className="chart-card glass">
              <h3>🏆 Most Used Brand Layout Templates</h3>
              <p className="chart-description text-secondary">Analytics showing template usage by B2B clients in the Vector Editor</p>
              <div className="bar-chart-container">
                {metrics.most_used_categories.map((cat) => (
                  <div key={cat.category} className="chart-bar-row">
                    <span className="bar-label">{cat.category}</span>
                    <div className="bar-wrapper">
                      <div className="bar-fill" style={{ width: `${Math.min(100, (cat.count / 45) * 100)}%` }}></div>
                    </div>
                    <span className="bar-value">{cat.count} labels</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Change Admin Password */}
            <div className="settings-card glass" style={{ padding: '24px', borderRadius: '12px' }}>
              <h3>🔑 Change Admin Password</h3>
              <p className="chart-description text-secondary" style={{ marginBottom: '16px' }}>Secure your administration console credentials.</p>
              
              <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Current Password</label>
                  <input 
                    type="password" 
                    className="input" 
                    required 
                    value={passwordForm.old_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, old_password: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>New Password</label>
                  <input 
                    type="password" 
                    className="input" 
                    required 
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Confirm New Password</label>
                  <input 
                    type="password" 
                    className="input" 
                    required 
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                  />
                </div>

                {passwordError && <p className="text-danger" style={{ fontSize: '0.8rem', margin: '4px 0' }}>⚠️ {passwordError}</p>}
                {passwordSuccess && <p className="text-success" style={{ fontSize: '0.8rem', margin: '4px 0' }}>✅ {passwordSuccess}</p>}

                <button type="submit" className="btn btn-primary" style={{ marginTop: '8px', justifyContent: 'center' }} disabled={passwordLoading}>
                  {passwordLoading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="admin-table-wrap glass">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Business Name</th>
                <th>Phone</th>
                <th>Signup Date</th>
                <th>Last Active</th>
                <th>Designs Created</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.filter(u => u.role !== 'admin').map((u) => {
                const userDesignsCount = allDesigns.filter(d => d.user_id === u.id).length;
                return (
                  <tr key={u.id}>
                    <td><strong>{u.email}</strong></td>
                    <td>{u.business_name || '—'}</td>
                    <td>{u.phone || '—'}</td>
                    <td>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td>{u.role === 'admin' ? 'Just now' : 'Recently'}</td>
                    <td>
                      <span className="badge badge-info">{userDesignsCount} designs</span>
                    </td>
                    <td>
                      {u.is_suspended ? (
                        <span className="badge badge-error">Suspended</span>
                      ) : (
                        <span className="badge badge-success">Active</span>
                      )}
                    </td>
                    <td className="user-action-cell">
                      <button 
                        className="btn btn-secondary btn-sm mr-2"
                        onClick={() => setViewUserDesigns(u)}
                        disabled={userDesignsCount === 0}
                      >
                        👁️ View Designs
                      </button>
                      {u.role !== 'admin' && (
                        <button 
                          className={`btn btn-sm ${u.is_suspended ? 'btn-success' : 'btn-error'}`}
                          onClick={() => toggleUserSuspension(u.id, u.is_suspended)}
                        >
                          {u.is_suspended ? 'Unsuspend' : 'Suspend'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {users.length === 0 && <p className="empty-state">No users registered yet</p>}
        </div>
      )}

      {tab === 'orders' && (
        <div className="admin-orders-panel">
          {orders.length === 0 ? (
            <div className="empty-state glass" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📦</div>
              <h3>No Orders Yet</h3>
              <p style={{ color: 'var(--text-muted)' }}>Orders placed by customers will appear here with full details.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {orders.map((o) => {
                const customer = users.find((u) => u.id === o.user_id);
                const isExpanded = expandedOrderId === o.id;
                return (
                  <div key={o.id} className="glass" style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                    {/* Order Header Row */}
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', cursor: 'pointer', flexWrap: 'wrap' }}
                      onClick={() => setExpandedOrderId(isExpanded ? null : o.id)}
                    >
                      <div style={{ minWidth: '90px' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2px' }}>ORDER ID</div>
                        <strong style={{ fontSize: '1.05rem', color: 'var(--accent)' }}>#{o.id}</strong>
                      </div>
                      <div style={{ flex: 1, minWidth: '160px' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2px' }}>CUSTOMER</div>
                        <div style={{ fontWeight: '600' }}>{customer?.business_name || customer?.email || 'Unknown Customer'}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{customer?.email}</div>
                      </div>
                      <div style={{ minWidth: '100px' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>STATUS</div>
                        <span className={`badge ${statusColors[o.status]}`}>{o.status}</span>
                      </div>
                      <div style={{ minWidth: '90px' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2px' }}>TOTAL</div>
                        <strong>₹{o.total_price?.toLocaleString()}</strong>
                      </div>
                      <div style={{ minWidth: '80px' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2px' }}>ITEMS</div>
                        <span>{o.items?.length || 0} item(s)</span>
                      </div>
                      <div style={{ minWidth: '110px' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2px' }}>DATE</div>
                        <span>{new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                      <div style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '1.2rem' }}>
                        {isExpanded ? '▲' : '▼'}
                      </div>
                    </div>

                    {/* Expandable Detail Panel */}
                    {isExpanded && (
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '20px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                          {/* Shipping Info */}
                          <div className="glass" style={{ padding: '14px 18px', borderRadius: '10px' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600', letterSpacing: '0.5px' }}>📍 SHIPPING ADDRESS</div>
                            <p style={{ margin: 0, lineHeight: 1.6 }}>{o.shipping_address || '—'}</p>
                          </div>
                          {/* Customer Contact */}
                          <div className="glass" style={{ padding: '14px 18px', borderRadius: '10px' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600', letterSpacing: '0.5px' }}>👤 CUSTOMER DETAILS</div>
                            <p style={{ margin: '0 0 4px' }}><strong>{customer?.business_name || 'N/A'}</strong></p>
                            <p style={{ margin: '0 0 4px', fontSize: '0.87rem' }}>📧 {customer?.email}</p>
                            <p style={{ margin: '0 0 4px', fontSize: '0.87rem' }}>📱 {customer?.phone || 'Not provided'}</p>
                            {o.notes && <p style={{ margin: '6px 0 0', fontSize: '0.83rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Note: {o.notes}</p>}
                          </div>
                        </div>

                        {/* Order Items */}
                        <div style={{ marginBottom: '20px' }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: '600', letterSpacing: '0.5px' }}>📋 ORDER ITEMS</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {(o.items || []).map((item, idx) => (
                              <div key={item.id || idx} className="glass" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', borderRadius: '10px' }}>
                                {item.design_preview_url && (
                                  <img
                                    src={resolveAssetUrl(item.design_preview_url)}
                                    alt="Design Preview"
                                    style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                  />
                                )}
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>Product ID: {item.product_id} — Qty: <strong>{item.quantity} units</strong></div>
                                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Unit Price: ₹{item.unit_price} | Subtotal: <strong>₹{item.subtotal?.toLocaleString()}</strong></div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Status Update */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>🔄 Update Status:</div>
                          <select
                            className="input order-status-select"
                            value={o.status}
                            onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                            style={{ minWidth: '160px' }}
                          >
                            {statusOptions.map((s) => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                          </select>
                          <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Order #{o.id} placed on {new Date(o.created_at).toLocaleString('en-IN')}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}



      {tab === 'products' && (
        <div className="products-grid">
          {products.map((p) => (
            <div key={p.id} className="product-card card glass">
              <h3>{p.name}</h3>
              <span className="badge badge-info">{p.size}</span>
              <span className="product-price">₹{p.base_price}/bottle</span>
              <p>{p.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* NEW: Custom Templates Management */}
      {tab === 'templates' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
          
          {/* Left panel: Upload Form */}
          <div className="glass" style={{ padding: '24px', borderRadius: '12px', height: 'fit-content' }}>
            <h3>📤 Upload Design Template</h3>
            <p className="chart-description text-secondary" style={{ marginBottom: '16px' }}>Upload custom designs for bottle packaging templates to show online.</p>
            
            <form onSubmit={handleTemplateCreate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Template Name</label>
                <input 
                  type="text" 
                  className="input" 
                  required 
                  placeholder="e.g., Spring Flow Luxe"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Category Filter</label>
                <select 
                  className="input"
                  value={templateForm.category}
                  onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
                >
                  <option value="general">General</option>
                  <option value="hotel">Hotels & Hospitality</option>
                  <option value="restaurant">Restaurants & Bistros</option>
                  <option value="cafe">Cafes & Cafeterias</option>
                  <option value="corporate">Corporates & Offices</option>
                  <option value="gym">Gyms & Spas</option>
                  <option value="event">Weddings & Events</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Style Theme</label>
                <select 
                  className="input"
                  value={templateForm.style}
                  onChange={(e) => setTemplateForm({ ...templateForm, style: e.target.value })}
                >
                  <option value="modern">Modern</option>
                  <option value="luxury">Luxury</option>
                  <option value="classic">Classic</option>
                  <option value="minimal">Minimal</option>
                  <option value="eco">Eco-Friendly</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Colors (Comma separated hex)</label>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="#ffffff, #00cec9"
                  value={templateForm.colors}
                  onChange={(e) => setTemplateForm({ ...templateForm, colors: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Design Image (PNG/JPG mockup)</label>
                <input 
                  type="file" 
                  id="template-file-input"
                  accept="image/*"
                  required 
                  onChange={(e) => setTemplateFile(e.target.files[0])}
                  style={{ border: 'none', background: 'none', padding: '4px 0' }}
                />
              </div>

              {templateError && <p className="text-danger" style={{ fontSize: '0.8rem', margin: '4px 0' }}>⚠️ {templateError}</p>}

              <button type="submit" className="btn btn-primary" style={{ marginTop: '8px', justifyContent: 'center' }} disabled={templateUploadLoading}>
                {templateUploadLoading ? 'Uploading Design...' : 'Upload Template'}
              </button>
            </form>
          </div>

          {/* Right panel: Templates Grid */}
          <div className="glass" style={{ padding: '24px', borderRadius: '12px' }}>
            <h3>🎨 Active Template Library ({templates.length})</h3>
            <p className="chart-description text-secondary" style={{ marginBottom: '20px' }}>Custom label templates loaded into the design engine.</p>
            
            <div className="designs-viewer-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
              {templates.map(t => (
                <div key={t.id} className="design-thumb-card glass" style={{ position: 'relative' }}>
                  <div className="thumb-image-wrapper" style={{ height: '110px' }}>
                    <img src={resolveAssetUrl(t.file_path) || '/placeholder.png'} alt={t.name} />
                  </div>
                  <div className="thumb-info" style={{ padding: '12px' }}>
                    <h4 style={{ fontSize: '0.9rem', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</h4>
                    <span className="badge badge-info" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>{t.style.toUpperCase()}</span>
                    <button 
                      className="btn btn-error btn-sm" 
                      style={{ width: '100%', marginTop: '8px', padding: '4px 8px', fontSize: '0.75rem', justifyContent: 'center' }}
                      onClick={() => handleDeleteTemplate(t.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {templates.length === 0 && <p className="empty-state">No custom templates uploaded yet</p>}
          </div>

        </div>
      )}

      {/* Dynamic File Library (PDF, Zip, Image, etc.) Upload Manager */}
      {tab === 'uploads' && (
        <div className="glass" style={{ padding: '32px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
            <div>
              <h3>📁 Asset & Design Library</h3>
              <p className="text-secondary" style={{ fontSize: '0.88rem' }}>Upload any print file, design format, PDF mockups, ZIP source assets, or graphics. Easily manage and copy URL links to share with customers.</p>
            </div>
          </div>

          <form onSubmit={handleFileUpload} className="glass" style={{ padding: '24px', borderRadius: '12px', border: '1px dashed var(--border)', marginBottom: '32px' }}>
            <h4 style={{ color: 'var(--primary)', marginBottom: '16px', fontWeight: 'bold' }}>📤 Upload New File</h4>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '240px' }}>
                <input 
                  type="file" 
                  id="generic-file-input"
                  className="input" 
                  style={{ padding: '8px 12px' }}
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px' }} disabled={uploadLoading}>
                {uploadLoading ? 'Uploading...' : '🚀 Start Upload'}
              </button>
            </div>
            {uploadError && <p className="text-danger" style={{ marginTop: '12px', fontSize: '0.88rem' }}>⚠️ {uploadError}</p>}
            {uploadSuccess && <p className="text-success" style={{ marginTop: '12px', fontSize: '0.88rem' }}>✅ {uploadSuccess}</p>}
          </form>

          <div>
            <h4 style={{ marginBottom: '16px', fontWeight: 'bold' }}>🗃️ Uploaded Design Library ({uploads.length} files)</h4>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Filename</th>
                    <th>Type</th>
                    <th>Date Uploaded</th>
                    <th>Download Link</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {uploads.map((up) => {
                    const relativeUrl = up.file_path;
                    const fullUrl = `${window.location.origin}${resolveAssetUrl(relativeUrl)}`;
                    return (
                      <tr key={up.id}>
                        <td><strong>{up.filename}</strong></td>
                        <td>
                          <span className="badge badge-info" style={{ textTransform: 'uppercase', fontSize: '0.75rem' }}>
                            {up.file_type || 'RAW'}
                          </span>
                        </td>
                        <td>{new Date(up.created_at).toLocaleDateString()} at {new Date(up.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input 
                              type="text" 
                              className="input" 
                              value={fullUrl} 
                              readOnly 
                              style={{ width: '220px', fontSize: '0.78rem', height: '28px', padding: '0 8px' }} 
                              onClick={(e) => e.target.select()}
                            />
                            <button 
                              className="btn btn-secondary btn-sm"
                              style={{ height: '28px', padding: '0 10px', fontSize: '0.75rem', justifyContent: 'center' }}
                              onClick={() => {
                                navigator.clipboard.writeText(fullUrl);
                                alert("File URL copied to clipboard!");
                              }}
                            >
                              📋 Copy Link
                            </button>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <a 
                            href={resolveAssetUrl(relativeUrl)} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="btn btn-secondary btn-sm mr-2"
                            style={{ display: 'inline-flex', padding: '6px 12px', fontSize: '0.75rem', textDecoration: 'none' }}
                          >
                            📥 Download
                          </a>
                          <button 
                            className="btn btn-error btn-sm"
                            style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                            onClick={() => handleDeleteUpload(up.id)}
                          >
                            🗑️ Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {uploads.length === 0 && <p className="empty-state">No uploaded design files found</p>}
            </div>
          </div>
        </div>
      )}

      {/* Site Content Manager Tab */}
      {tab === 'content' && (
        <div className="glass" style={{ padding: '32px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
            <div>
              <h3>✏️ Dynamic Homepage Content Manager</h3>
              <p className="text-secondary" style={{ fontSize: '0.88rem' }}>Modify headlines, subtitles, and call-to-actions shown to visitors dynamically. Use brackets (e.g. `[highlighted]`) to render words in gradient.</p>
            </div>
          </div>

          <form onSubmit={handleContentSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* HERO SECTION CONFIG */}
            <div style={{ padding: '20px', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)' }}>
              <h4 style={{ color: 'var(--primary)', marginBottom: '16px', fontWeight: 'bold' }}>🚀 Hero Section Settings</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Hero Title</label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="e.g. Design Your [Brand's] Perfect Water Bottle"
                    value={editConfigs.hero_title || ''}
                    onChange={(e) => setEditConfigs({ ...editConfigs, hero_title: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Hero CTA Button Text</label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="e.g. Generate Designs"
                    value={editConfigs.hero_cta_text || ''}
                    onChange={(e) => setEditConfigs({ ...editConfigs, hero_cta_text: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '16px' }}>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Hero Subtitle</label>
                <textarea 
                  className="input" 
                  rows="3"
                  placeholder="Hero description paragraph text..."
                  value={editConfigs.hero_subtitle || ''}
                  onChange={(e) => setEditConfigs({ ...editConfigs, hero_subtitle: e.target.value })}
                  style={{ resize: 'vertical' }}
                />
              </div>
            </div>

            {/* TRUSTED BANNER SECTION */}
            <div style={{ padding: '20px', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)' }}>
              <h4 style={{ color: 'var(--primary)', marginBottom: '16px', fontWeight: 'bold' }}>🤝 Trusted Banner Settings</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Trusted Label Text</label>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="e.g. Trusted by leading businesses across India"
                  value={editConfigs.trusted_label || ''}
                  onChange={(e) => setEditConfigs({ ...editConfigs, trusted_label: e.target.value })}
                />
              </div>
            </div>

            {/* HOW IT WORKS CONFIG */}
            <div style={{ padding: '20px', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)' }}>
              <h4 style={{ color: 'var(--primary)', marginBottom: '16px', fontWeight: 'bold' }}>📈 "How It Works" Section</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Section Title</label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="e.g. How It [Works]"
                    value={editConfigs.how_it_works_title || ''}
                    onChange={(e) => setEditConfigs({ ...editConfigs, how_it_works_title: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Section Subtitle</label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="e.g. Four simple steps to get your branded bottles"
                    value={editConfigs.how_it_works_subtitle || ''}
                    onChange={(e) => setEditConfigs({ ...editConfigs, how_it_works_subtitle: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* WHY VISTAAR CONFIG */}
            <div style={{ padding: '20px', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)' }}>
              <h4 style={{ color: 'var(--primary)', marginBottom: '16px', fontWeight: 'bold' }}>⭐ "Why VistaarWater?" Section</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Section Title</label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="e.g. Why [VistaarWater]?"
                    value={editConfigs.features_title || ''}
                    onChange={(e) => setEditConfigs({ ...editConfigs, features_title: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Section Subtitle</label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="e.g. Everything you need for professional branded water bottles"
                    value={editConfigs.features_subtitle || ''}
                    onChange={(e) => setEditConfigs({ ...editConfigs, features_subtitle: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* CALL TO ACTION CONFIG */}
            <div style={{ padding: '20px', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)' }}>
              <h4 style={{ color: 'var(--primary)', marginBottom: '16px', fontWeight: 'bold' }}>📢 Call-to-Action (Footer Banner) Section</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Banner Title</label>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="e.g. Ready to [Brand] Your Bottles?"
                  value={editConfigs.cta_title || ''}
                  onChange={(e) => setEditConfigs({ ...editConfigs, cta_title: e.target.value })}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '16px' }}>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Banner Subtitle</label>
                <textarea 
                  className="input" 
                  rows="2"
                  placeholder="e.g. Join 500+ businesses who trust VistaarWater for their custom water bottles"
                  value={editConfigs.cta_subtitle || ''}
                  onChange={(e) => setEditConfigs({ ...editConfigs, cta_subtitle: e.target.value })}
                  style={{ resize: 'vertical' }}
                />
              </div>
            </div>

            {/* PRICING & DISCOUNTS CONFIG */}
            <div style={{ padding: '20px', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)' }}>
              <h4 style={{ color: 'var(--primary)', marginBottom: '16px', fontWeight: 'bold' }}>💰 Dynamic Pricing & Bulk Discount Rules</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>250ml Price (Rs)</label>
                  <input 
                    type="number" 
                    className="input" 
                    placeholder="e.g. 15"
                    value={editConfigs.price_250ml || ''}
                    onChange={(e) => setEditConfigs({ ...editConfigs, price_250ml: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>500ml Price (Rs)</label>
                  <input 
                    type="number" 
                    className="input" 
                    placeholder="e.g. 20"
                    value={editConfigs.price_500ml || ''}
                    onChange={(e) => setEditConfigs({ ...editConfigs, price_500ml: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>1000ml Price (Rs)</label>
                  <input 
                    type="number" 
                    className="input" 
                    placeholder="e.g. 30"
                    value={editConfigs.price_1000ml || ''}
                    onChange={(e) => setEditConfigs({ ...editConfigs, price_1000ml: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginTop: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Discount for qty ≥ 500 (%)</label>
                  <input 
                    type="number" 
                    className="input" 
                    placeholder="e.g. 5"
                    value={editConfigs.discount_500 || ''}
                    onChange={(e) => setEditConfigs({ ...editConfigs, discount_500: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Discount for qty ≥ 1000 (%)</label>
                  <input 
                    type="number" 
                    className="input" 
                    placeholder="e.g. 10"
                    value={editConfigs.discount_1000 || ''}
                    onChange={(e) => setEditConfigs({ ...editConfigs, discount_1000: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Discount for qty ≥ 2000 (%)</label>
                  <input 
                    type="number" 
                    className="input" 
                    placeholder="e.g. 15"
                    value={editConfigs.discount_2000 || ''}
                    onChange={(e) => setEditConfigs({ ...editConfigs, discount_2000: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {contentError && <p className="text-danger">⚠️ {contentError}</p>}
            {contentSuccess && <p className="text-success">✅ {contentSuccess}</p>}

            <button type="submit" className="btn btn-primary" style={{ height: '48px', fontSize: '1rem', justifyContent: 'center' }} disabled={contentLoading}>
              {contentLoading ? 'Saving Configurations...' : '💾 Save Content Changes'}
            </button>
          </form>
        </div>
      )}

      {tab === 'inquiries' && (
        <div className="admin-table-wrap glass">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Contact Name</th>
                <th>Business Name</th>
                <th>Email</th>
                <th>Target Qty</th>
                <th>Size</th>
                <th>Status</th>
                <th>Lead Date</th>
              </tr>
            </thead>
            <tbody>
              {inquiries.map((i) => (
                <tr key={i.id}>
                  <td>{i.name}</td>
                  <td>{i.business_name || '—'}</td>
                  <td>{i.email}</td>
                  <td>{i.quantity ? `${i.quantity.toLocaleString()} bottles` : '—'}</td>
                  <td>{i.bottle_size || '—'}</td>
                  <td><span className={`badge ${statusColors[i.status]}`}>{i.status}</span></td>
                  <td>{new Date(i.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {inquiries.length === 0 && <p className="empty-state">No inquiries received yet</p>}
        </div>
      )}

      {/* Customized designs modal inspector */}
      {viewUserDesigns && (
        <div className="modal-overlay" onClick={() => setViewUserDesigns(null)}>
          <div className="modal-content glass" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🎨 Customized Packaging Designs for {viewUserDesigns.business_name || viewUserDesigns.email}</h2>
              <button className="modal-close" onClick={() => setViewUserDesigns(null)}>×</button>
            </div>
            <div className="designs-viewer-grid">
              {allDesigns
                .filter(d => d.user_id === viewUserDesigns.id)
                .map(d => (
                  <div key={d.id} className="design-thumb-card glass">
                    <div className="thumb-image-wrapper">
                      <img src={resolveAssetUrl(d.preview_url) || '/placeholder.png'} alt={d.name} />
                    </div>
                    <div className="thumb-info">
                      <h4>{d.name || 'Untitled Label'}</h4>
                      <span>Saved: {new Date(d.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
