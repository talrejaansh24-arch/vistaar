import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { orderAPI, designAPI, resolveAssetUrl } from '../api/client';
import './DashboardPage.css';

export default function DashboardPage() {
  const { user } = useStore();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [designs, setDesigns] = useState([]);
  const [tab, setTab] = useState('orders');

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    orderAPI.list().then(r => setOrders(r.data)).catch(() => {});
    designAPI.list().then(r => setDesigns(r.data)).catch(() => {});
  }, [user]);

  if (!user) return null;

  const statusColors = { pending: 'badge-warning', confirmed: 'badge-info', production: 'badge-info', shipped: 'badge-success', delivered: 'badge-success', cancelled: 'badge-error' };

  return (
    <div className="dashboard-page container">
      <div className="dashboard-header">
        <h1>Welcome, {user.business_name || user.email} 👋</h1>
        <button className="btn btn-primary" onClick={() => navigate('/')}>+ New Design</button>
      </div>

      <div className="dashboard-tabs">
        <button className={`tab ${tab === 'orders' ? 'active' : ''}`} onClick={() => setTab('orders')}>📦 Orders ({orders.length})</button>
        <button className={`tab ${tab === 'designs' ? 'active' : ''}`} onClick={() => setTab('designs')}>🎨 Saved Designs ({designs.length})</button>
      </div>

      {tab === 'orders' && (
        <div className="dashboard-content">
          {orders.length === 0 ? (
            <div className="empty-state card"><p>No orders yet</p></div>
          ) : orders.map((order) => (
            <div key={order.id} className="order-card card">
              <div className="order-header">
                <span className="order-id">Order #{order.id}</span>
                <span className={`badge ${statusColors[order.status] || 'badge-info'}`}>{order.status}</span>
              </div>
              <div className="order-details">
                <span>Items: {order.items?.length || 0}</span>
                <span>Total: ₹{order.total_price.toLocaleString()}</span>
                <span>{new Date(order.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'designs' && (
        <div className="dashboard-content designs-grid">
          {designs.length === 0 ? (
            <div className="empty-state card"><p>No saved designs</p></div>
          ) : designs.map((d) => (
            <div key={d.id} className="saved-design card">
              {d.preview_url && <img src={resolveAssetUrl(d.preview_url)} alt={d.name} />}
              <h4>{d.name}</h4>
              <span className="design-date">{new Date(d.created_at).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
