import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { orderAPI } from '../api/client';
import './CheckoutPage.css';

export default function CheckoutPage() {
  const { cart, clearCart, user } = useStore();
  const navigate = useNavigate();
  const [step, setStep] = useState('address'); // address | payment | success
  const [address, setAddress] = useState({ line1: '', city: '', state: '', pincode: '', phone: '' });
  const [orderId, setOrderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const total = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);

  const handlePlaceOrder = async () => {
    if (!address.line1 || !address.city || !address.state || !address.pincode || !address.phone) {
      setError("Please fill out all address fields.");
      return;
    }
    setError('');
    setLoading(true);
    try {
      const payload = {
        items: cart.map((item) => ({
          product_id: item.productId || 2,
          design_json: item.design?.canvas_json || JSON.stringify(item.design || {}),
          design_preview_url: item.design?.preview_url || '',
          quantity: item.quantity,
        })),
        shipping_address: `${address.line1}, ${address.city}, ${address.state} - ${address.pincode}. Phone: ${address.phone}`,
        billing_address: `${address.line1}, ${address.city}, ${address.state} - ${address.pincode}. Phone: ${address.phone}`,
        payment_method: 'upi',
        notes: `Order placed by ${user.business_name || user.email}`,
      };
      
      const res = await orderAPI.create(payload);
      setOrderId(res.data.id.toString());
      setStep('success');
      clearCart();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || err.message || "Failed to place order.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <Navigate to="/login" replace />;

  if (step === 'success') {
    return (
      <div className="checkout-page container">
        <div className="success-card glass">
          <div className="success-icon">🎉</div>
          <h2>Order Placed Successfully!</h2>
          <p>Thank you for your order. We'll start production right away.</p>
          <p className="order-id">Order #{orderId}</p>
          <div className="success-actions">
            <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>View Dashboard</button>
            <button className="btn btn-ghost" onClick={() => navigate('/')}>Design More</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page container">
      <h1>📦 Checkout</h1>
      <div className="checkout-layout">
        <div className="checkout-form">
          {step === 'address' && (
            <div className="checkout-section card">
              <h3>Shipping Address</h3>
              <div className="input-group">
                <label>Address Line</label>
                <input className="input" placeholder="Street, Building" value={address.line1}
                  onChange={(e) => setAddress({ ...address, line1: e.target.value })} />
              </div>
              <div className="input-row-2">
                <div className="input-group">
                  <label>City</label>
                  <input className="input" placeholder="Mumbai" value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })} />
                </div>
                <div className="input-group">
                  <label>State</label>
                  <input className="input" placeholder="Maharashtra" value={address.state}
                    onChange={(e) => setAddress({ ...address, state: e.target.value })} />
                </div>
              </div>
              <div className="input-row-2">
                <div className="input-group">
                  <label>PIN Code</label>
                  <input className="input" placeholder="400001" value={address.pincode}
                    onChange={(e) => setAddress({ ...address, pincode: e.target.value })} />
                </div>
                <div className="input-group">
                  <label>Phone</label>
                  <input className="input" placeholder="+91 98765 43210" value={address.phone}
                    onChange={(e) => setAddress({ ...address, phone: e.target.value })} />
                </div>
              </div>
              <button className="btn btn-primary" onClick={() => setStep('payment')}>Continue to Payment →</button>
            </div>
          )}
          {step === 'payment' && (
            <div className="checkout-section card">
              <h3>💳 Payment Method</h3>
              <div className="payment-options">
                {['UPI', 'Credit/Debit Card', 'Net Banking', 'Cash on Delivery'].map((m) => (
                  <label key={m} className="payment-option">
                    <input type="radio" name="payment" defaultChecked={m === 'UPI'} /> {m}
                  </label>
                ))}
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                * Orders are confirmed upon submission and sent to our team immediately.
              </p>
              {error && (
                <p style={{ color: 'var(--error, #e74c3c)', fontSize: '0.9rem', background: 'rgba(231,76,60,0.1)', padding: '10px 14px', borderRadius: '8px', borderLeft: '3px solid var(--error, #e74c3c)' }}>
                  ⚠️ {error}
                </p>
              )}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn btn-ghost" onClick={() => setStep('address')} disabled={loading}>← Back</button>
                <button className="btn btn-primary" onClick={handlePlaceOrder} disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
                  {loading ? '⏳ Placing Order...' : `Place Order — ₹${total.toLocaleString()}`}
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="checkout-summary glass">
          <h3>Order Summary</h3>
          {cart.map((item) => (
            <div key={item.cartId} className="summary-item">
              <span>{item.design?.name || 'Design'} × {item.quantity}</span>
              <span>₹{(item.unitPrice * item.quantity).toLocaleString()}</span>
            </div>
          ))}
          <div className="summary-row total"><span>Total</span><span>₹{total.toLocaleString()}</span></div>
        </div>
      </div>
    </div>
  );
}
