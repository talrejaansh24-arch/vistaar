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
  const [viewUserDesigns, setViewUserDesigns] = useState(null);

  async function loadData() {
    try {
      const [o, p, i, u, m, d] = await Promise.all([
        adminAPI.getOrders(),
        productAPI.list(),
        adminAPI.getInquiries(),
        adminAPI.getUsers(),
        adminAPI.getMetrics(),
        adminAPI.getDesigns(),
      ]);
      setOrders(o.data);
      setProducts(p.data);
      setInquiries(i.data);
      setUsers(u.data);
      setMetrics(m.data);
      setAllDesigns(d.data);
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
        <p className="admin-subtitle">Manage packaging designs, B2B bulk orders, users, and catalog products</p>
      </div>

      <div className="dashboard-tabs">
        <button className={`tab-btn ${tab === 'dashboard' ? 'active' : ''}`} onClick={() => setTab('dashboard')}>📊 Dashboard</button>
        <button className={`tab-btn ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>👥 Users</button>
        <button className={`tab-btn ${tab === 'orders' ? 'active' : ''}`} onClick={() => setTab('orders')}>📦 Orders ({orders.length})</button>
        <button className={`tab-btn ${tab === 'products' ? 'active' : ''}`} onClick={() => setTab('products')}>📋 Products</button>
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

          <div className="dashboard-charts-layout">
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
