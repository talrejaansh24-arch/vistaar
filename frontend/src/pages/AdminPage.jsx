import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { adminAPI, productAPI, resolveAssetUrl } from '../api/client';
import './AdminPage.css';

export default function AdminPage() {
  const { user } = useStore();
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

  async function loadData() {
    try {
      const [o, p, i, u, m, d, t] = await Promise.all([
        adminAPI.getOrders(),
        productAPI.list(),
        adminAPI.getInquiries(),
        adminAPI.getUsers(),
        adminAPI.getMetrics(),
        adminAPI.getDesigns(),
        adminAPI.getTemplates(),
      ]);
      setOrders(o.data);
      setProducts(p.data);
      setInquiries(i.data);
      setUsers(u.data);
      setMetrics(m.data);
      setAllDesigns(d.data);
      setTemplates(t.data);
    } catch (err) {
      console.error("Failed to load admin dashboard data", err);
    }
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
              {users.map((u) => {
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
        <div className="admin-table-wrap glass">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Total Revenue</th>
                <th>Bottles Order</th>
                <th>Order Date</th>
                <th>Actions & Status Updates</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td><strong>#{o.id}</strong></td>
                  <td>{users.find((u) => u.id === o.user_id)?.email || 'Unknown'}</td>
                  <td><span className={`badge ${statusColors[o.status]}`}>{o.status}</span></td>
                  <td>₹{o.total_price.toLocaleString()}</td>
                  <td>{o.items?.length || 0} items (Bulk Bottles)</td>
                  <td>{new Date(o.created_at).toLocaleDateString()}</td>
                  <td>
                    <select 
                      className="input order-status-select" 
                      value={o.status}
                      onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                    >
                      {statusOptions.map((s) => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.length === 0 && <p className="empty-state">No orders placed yet</p>}
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
