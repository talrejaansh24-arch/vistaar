import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { orderAPI, designAPI, productAPI, resolveAssetUrl } from '../api/client';
import { Trash2, PenTool, ExternalLink, Calendar, Mail, Phone, Briefcase, Plus, ShoppingCart, Award } from 'lucide-react';
import './DashboardPage.css';

export default function DashboardPage() {
  const { user, setCurrentDesign, savedDesigns, fetchSavedDesigns, deleteSavedDesign } = useStore();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [tab, setTab] = useState('orders');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [ordersRes, productsRes] = await Promise.all([
        orderAPI.list(),
        productAPI.list()
      ]);
      setOrders(ordersRes.data);
      setProducts(productsRes.data);
      await fetchSavedDesigns();
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadData();
  }, [user]);

  if (!user) return null;

  const handleCustomize = (d) => {
    setCurrentDesign(d);
    navigate('/editor');
  };

  const handleDeleteDesign = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this saved design?")) return;
    try {
      await deleteSavedDesign(id);
    } catch (err) {
      console.error(err);
      alert("Failed to delete design");
    }
  };

  const getProductDetails = (productId) => {
    return products.find(p => p.id === productId) || { name: 'Custom Water Bottle', size: '500ml' };
  };

  const statusColors = {
    pending: 'status-pending',
    confirmed: 'status-confirmed',
    production: 'status-production',
    shipped: 'status-shipped',
    delivered: 'status-delivered',
    cancelled: 'status-cancelled'
  };

  return (
    <div className="dashboard-page-container">
      <div className="dashboard-glow-effect" />
      <div className="container dashboard-main-content">
        
        {/* Profile / Hero Banner */}
        <div className="dashboard-hero-banner glass">
          <div className="banner-profile-info">
            <div className="profile-avatar">
              {(user.business_name || user.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="profile-text">
              <span className="profile-role-badge">B2B Partner</span>
              <h2>{user.business_name || 'My Business'}</h2>
              <div className="profile-meta-grid">
                <span className="meta-item"><Mail size={14} /> {user.email}</span>
                {user.phone && <span className="meta-item"><Phone size={14} /> {user.phone}</span>}
                <span className="meta-item"><Calendar size={14} /> Registered Partner</span>
              </div>
            </div>
          </div>
          
          <div className="dashboard-actions">
            <button className="btn btn-primary action-btn-glow" onClick={() => { setCurrentDesign(null); navigate('/'); }}>
              <Plus size={16} /> New Design
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/cart')}>
              <ShoppingCart size={16} /> View Cart
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="dashboard-stats-row">
          <div className="stat-box-card glass">
            <div className="stat-icon-wrap" style={{ background: 'rgba(0, 184, 148, 0.15)', color: 'var(--primary)' }}>
              <Briefcase size={22} />
            </div>
            <div className="stat-content">
              <h3>{orders.length}</h3>
              <p>Total Orders Placed</p>
            </div>
          </div>
          
          <div className="stat-box-card glass">
            <div className="stat-icon-wrap" style={{ background: 'rgba(9, 132, 227, 0.15)', color: '#0984e3' }}>
              <PenTool size={22} />
            </div>
            <div className="stat-content">
              <h3>{savedDesigns.length}</h3>
              <p>Saved Designs Library</p>
            </div>
          </div>

          <div className="stat-box-card glass">
            <div className="stat-icon-wrap" style={{ background: 'rgba(253, 150, 68, 0.15)', color: '#fd9644' }}>
              <Award size={22} />
            </div>
            <div className="stat-content">
              <h3>Active</h3>
              <p>Partnership Status</p>
            </div>
          </div>
        </div>

        {/* Tabs Control */}
        <div className="dashboard-tab-panel">
          <div className="tabs-header">
            <button 
              className={`tab-link-btn ${tab === 'orders' ? 'active-tab' : ''}`} 
              onClick={() => setTab('orders')}
            >
              📦 Order History ({orders.length})
            </button>
            <button 
              className={`tab-link-btn ${tab === 'designs' ? 'active-tab' : ''}`} 
              onClick={() => setTab('designs')}
            >
              🎨 My Saved Designs ({savedDesigns.length})
            </button>
          </div>

          {loading ? (
            <div className="tab-loading-spinner">
              <div className="spinner" />
              <p>Loading your dashboard details...</p>
            </div>
          ) : (
            <div className="tab-content-area">
              {tab === 'orders' && (
                <div className="orders-timeline">
                  {orders.length === 0 ? (
                    <div className="empty-dashboard-state glass">
                      <div className="empty-icon">📦</div>
                      <h3>No Orders Yet</h3>
                      <p>Generate some design mockups and proceed to customize and place your first B2B order!</p>
                      <button className="btn btn-primary btn-sm" onClick={() => navigate('/')}>Start Designing</button>
                    </div>
                  ) : (
                    <div className="orders-list-grid">
                      {orders.map((order) => (
                        <div key={order.id} className="order-profile-card glass">
                          <div className="order-profile-header">
                            <div className="order-number-date">
                              <h4>Order #{order.id}</h4>
                              <span className="order-date-label">
                                {new Date(order.created_at).toLocaleDateString(undefined, {
                                  year: 'numeric', month: 'long', day: 'numeric'
                                })}
                              </span>
                            </div>
                            <span className={`status-badge-pill ${statusColors[order.status] || 'status-pending'}`}>
                              {order.status.toUpperCase()}
                            </span>
                          </div>
                          
                          <div className="order-items-summary">
                            {order.items?.map((item) => {
                              const prod = getProductDetails(item.product_id);
                              return (
                                <div key={item.id} className="order-item-row">
                                  <div className="item-preview-img">
                                    <img src={resolveAssetUrl(item.design_preview_url || prod.image_url)} alt={prod.name} onError={(e) => { e.target.src = " /placeholder.png\; }} />
                                  </div>
                                  <div className="item-row-info">
                                    <h5>{prod.name}</h5>
                                    <p className="item-row-specs">Size: {prod.size} | Qty: {item.quantity} units</p>
                                  </div>
                                  <div className="item-row-price">
                                    <span>₹{item.subtotal.toLocaleString()}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          
                          <div className="order-profile-footer">
                            <div className="shipping-info-cell">
                              <span>Shipping to:</span>
                              <p>{order.shipping_address || 'Address not specified'}</p>
                            </div>
                            <div className="order-total-cell">
                              <span>Total Amount:</span>
                              <p className="grand-total-price">₹{order.total_price.toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {tab === 'designs' && (
                <div className="saved-designs-showcase">
                  {savedDesigns.length === 0 ? (
                    <div className="empty-dashboard-state glass">
                      <div className="empty-icon">🎨</div>
                      <h3>Your Design Library is Empty</h3>
                      <p>Start designing labels for your bottles and save them to edit or order anytime later!</p>
                      <button className="btn btn-primary btn-sm" onClick={() => navigate('/')}>Design Now</button>
                    </div>
                  ) : (
                    <div className="saved-designs-grid-layout">
                      {savedDesigns.map((d) => (
                        <div key={d.id} className="saved-design-show-card glass" onClick={() => handleCustomize(d)}>
                          <div className="saved-preview-wrapper">
                            {d.preview_url && <img src={resolveAssetUrl(d.preview_url)} alt={d.name} onError={(e) => { e.target.src = \/placeholder.png\; }} />}
                            <div className="saved-design-hover-overlay">
                              <button className="action-circle-btn customize-action" title="Customize Design">
                                <PenTool size={16} />
                              </button>
                              <button className="action-circle-btn delete-action" title="Delete Design" onClick={(e) => handleDeleteDesign(d.id, e)}>
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                          <div className="saved-design-details">
                            <h4>{d.name || 'Untitled Custom Design'}</h4>
                            <div className="saved-card-footer">
                              <span className="saved-date-tag">
                                {new Date(d.created_at).toLocaleDateString()}
                              </span>
                              <span className="customize-hint-link">Edit <ExternalLink size={12} /></span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
