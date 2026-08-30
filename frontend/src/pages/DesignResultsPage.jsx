import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import DesignGrid from '../components/DesignGrid';
import { pageTransition } from '../utils/animations';
import { designAPI, resolveAssetUrl } from '../api/client';
import { Check, ShoppingBag, ArrowRight } from 'lucide-react';
import './DesignResultsPage.css';

export default function DesignResultsPage() {
  const { generatedDesigns, setGeneratedDesigns, designInput, setDesignInput, addToCart, user, siteConfig } = useStore();
  const navigate = useNavigate();
  const pageRef = useRef(null);

  // Quick Order States
  const [selectedDesignId, setSelectedDesignId] = useState('');
  const [selectedSize, setSelectedSize] = useState('500ml');
  const [qty, setQty] = useState(500);
  const [addedToast, setAddedToast] = useState(false);
  const [fetchingDesigns, setFetchingDesigns] = useState(false);

  useEffect(() => {
    if (pageRef.current) pageTransition(pageRef.current);
    
    if (generatedDesigns.length === 0) {
      const loadDefaultDesigns = async () => {
        setFetchingDesigns(true);
        try {
          const res = await designAPI.generate({
            business_name: user?.business_name || 'YOUR BRAND',
            bottle_text: 'Pure Himalayan',
            category: 'hotel',
            bottle_size: '500ml',
            style: 'modern'
          });
          setGeneratedDesigns(res.data.designs);
          setDesignInput({
            business_name: user?.business_name || 'YOUR BRAND',
            bottle_text: 'Pure Himalayan',
            category: 'hotel',
            bottle_size: '500ml',
            style: 'modern'
          });
          if (res.data.designs.length > 0) {
            setSelectedDesignId(res.data.designs[0].id);
          }
        } catch (err) {
          console.error("Failed to load default designs", err);
          navigate('/');
        } finally {
          setFetchingDesigns(false);
        }
      };
      loadDefaultDesigns();
    } else {
      setSelectedDesignId(generatedDesigns[0].id);
    }
  }, [generatedDesigns.length, user, navigate, setGeneratedDesigns, setDesignInput]);

  if (fetchingDesigns) {
    return (
      <div style={{ paddingTop: '150px', textAlign: 'center', minHeight: '80vh' }}>
        <div className="spinner" style={{ margin: '0 auto' }} />
        <p style={{ color: 'var(--text-secondary)', marginTop: '16px' }}>Loading designs library...</p>
      </div>
    );
  }

  if (!generatedDesigns.length) return null;

  const selectedDesignObj = generatedDesigns.find(d => d.id === selectedDesignId) || generatedDesigns[0];

  const sizePrices = {
    '250ml': parseFloat(siteConfig?.price_250ml || 15),
    '500ml': parseFloat(siteConfig?.price_500ml || 20),
    '1000ml': parseFloat(siteConfig?.price_1000ml || 30)
  };

  const basePrice = sizePrices[selectedSize] || 20;

  // Bulk Discount calculation
  const getPricing = (quantity, base) => {
    const d500 = parseFloat(siteConfig?.discount_500 || 5) / 100;
    const d1000 = parseFloat(siteConfig?.discount_1000 || 10) / 100;
    const d2000 = parseFloat(siteConfig?.discount_2000 || 15) / 100;

    let discount = 0;
    if (quantity >= 2000) discount = d2000;
    else if (quantity >= 1000) discount = d1000;
    else if (quantity >= 500) discount = d500;
    
    const unit = base * (1 - discount);
    const total = unit * quantity;
    return { unit, total, discount: discount * 100 };
  };

  const pricing = getPricing(qty, basePrice);

  const handleQuickAdd = () => {
    if (!selectedDesignObj) return;
    
    const productIdMap = {
      '250ml': 1,
      '500ml': 2,
      '1000ml': 3
    };
    
    addToCart({
      design: selectedDesignObj,
      productId: productIdMap[selectedSize] || 2,
      quantity: qty,
      size: selectedSize,
      unitPrice: pricing.unit,
    });
    
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 3000);
  };

  return (
    <div className="page-transition-wrapper" ref={pageRef} style={{ paddingTop: '100px', minHeight: '80vh' }}>
      <div className="container">
        
        {/* Upper Badge & Summary Header */}
        {designInput && (
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>
              Your <span className="gradient-text">Designs</span> Are Ready
            </h2>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
              <span className="badge badge-info">{designInput.business_name}</span>
              <span className="badge badge-success">{designInput.category}</span>
              <span className="badge badge-warning">{designInput.bottle_size}</span>
              <span className="badge" style={{ background: 'rgba(108,92,231,0.15)', color: 'var(--accent-light)' }}>{designInput.style}</span>
            </div>
          </div>
        )}

        {/* NEW: Dynamic Filters Section */}
        <div className="filters-section glass" style={{ padding: '20px', borderRadius: '12px', marginBottom: '30px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '200px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Category Filter</label>
            <select 
              className="input" 
              value={designInput?.category || 'hotel'} 
              onChange={async (e) => {
                const newCat = e.target.value;
                setFetchingDesigns(true);
                try {
                  const payload = { ...designInput, category: newCat };
                  const res = await designAPI.generate(payload);
                  setGeneratedDesigns(res.data.designs);
                  setDesignInput(payload);
                  if (res.data.designs.length > 0) setSelectedDesignId(res.data.designs[0].id);
                } catch(err) { console.error(err); }
                finally { setFetchingDesigns(false); }
              }}
            >
              <option value="hotel">Hotel</option>
              <option value="restaurant">Restaurant</option>
              <option value="cafe">Cafe</option>
              <option value="event">Event</option>
              <option value="gym">Gym / Fitness</option>
              <option value="corporate">Corporate</option>
              <option value="general">General</option>
            </select>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '200px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Style Filter</label>
            <select 
              className="input" 
              value={designInput?.style || 'modern'} 
              onChange={async (e) => {
                const newStyle = e.target.value;
                setFetchingDesigns(true);
                try {
                  const payload = { ...designInput, style: newStyle };
                  const res = await designAPI.generate(payload);
                  setGeneratedDesigns(res.data.designs);
                  setDesignInput(payload);
                  if (res.data.designs.length > 0) setSelectedDesignId(res.data.designs[0].id);
                } catch(err) { console.error(err); }
                finally { setFetchingDesigns(false); }
              }}
            >
              <option value="modern">Modern</option>
              <option value="luxury">Luxury</option>
              <option value="classic">Classic</option>
              <option value="minimal">Minimal</option>
              <option value="eco">Eco-Friendly</option>
            </select>
          </div>
        </div>

        {/* Template Grid */}
        {generatedDesigns.length > 0 ? (
          <DesignGrid designs={generatedDesigns} />
        ) : (
          <div className="empty-state glass" style={{ textAlign: 'center', padding: '48px 24px', marginBottom: '30px' }}>
            <h3>No Designs Found</h3>
            <p style={{ color: 'var(--text-muted)' }}>We couldn't find any designs for this specific category and style combination.</p>
          </div>
        )}

        {/* NEW: Dedicated Quick Order / Add to Cart Section */}
        <section className="quick-order-section">
          <div className="section-divider" style={{ margin: '40px 0' }} />
          
          <div className="quick-order-card glass">
            
            {/* Left Col: Visual Preview */}
            <div className="quick-order-preview-panel">
              <div className="quick-preview-image-wrap">
                {selectedDesignObj?.preview_url ? (
                  <img src={resolveAssetUrl(selectedDesignObj.preview_url)} alt={selectedDesignObj.name} onError={(e) => { e.target.src = " /placeholder.png\; }} />
                ) : (
                  <div style={{ color: 'var(--text-muted)' }}>No preview available</div>
                )}
              </div>
              <div className="quick-preview-meta">
                <h4>{selectedDesignObj?.name || 'Selected Design'}</h4>
                <p>Format: Vector Digital Mockup</p>
              </div>
            </div>

            {/* Right Col: Controls */}
            <div className="quick-order-controls">
              <div>
                <h3>⚡ Fast Add to Cart</h3>
                <p className="section-desc">Select your design, size, and quantity to add to cart instantly without opening the editor.</p>
              </div>

              {/* Design Selector */}
              <div className="control-group">
                <label>1. Choose Design Template</label>
                <select 
                  className="quick-select" 
                  value={selectedDesignId} 
                  onChange={(e) => setSelectedDesignId(e.target.value)}
                >
                  {generatedDesigns.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              {/* Size Selector */}
              <div className="control-group">
                <label>2. Choose Bottle Size</label>
                <div className="size-selector-grid">
                  {[
                    { id: '250ml', title: '250ml', price: 'Rs 15' },
                    { id: '500ml', title: '500ml', price: 'Rs 20' },
                    { id: '1000ml', title: '1000ml', price: 'Rs 30' }
                  ].map((s) => (
                    <label key={s.id} className="size-radio-card">
                      <input 
                        type="radio" 
                        name="quick-size" 
                        value={s.id} 
                        checked={selectedSize === s.id}
                        onChange={() => setSelectedSize(s.id)}
                      />
                      <div className="size-card-content">
                        <span className="size-title">{s.title}</span>
                        <span className="size-price">{s.price}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Quantity Slider */}
              <div className="control-group">
                <label>3. Order Quantity ({qty.toLocaleString()} bottles)</label>
                <div className="quantity-input-box">
                  <input 
                    type="number" 
                    className="quantity-num-input" 
                    value={qty}
                    min={100}
                    step={50}
                    onChange={(e) => setQty(Math.max(100, parseInt(e.target.value) || 100))}
                  />
                  <input 
                    type="range" 
                    className="quantity-slider" 
                    min={100} 
                    max={5000} 
                    step={100} 
                    value={qty}
                    onChange={(e) => setQty(parseInt(e.target.value))}
                  />
                </div>
              </div>

              {/* Real-time Pricing Summary */}
              <div className="pricing-breakdown-panel">
                <div className="price-item">
                  <span>Unit Price</span>
                  <p>₹{pricing.unit.toFixed(2)}</p>
                  {pricing.discount > 0 && (
                    <span className="discount-tag">-{pricing.discount}% Bulk Off</span>
                  )}
                </div>
                <div className="price-item" style={{ textAlign: 'right' }}>
                  <span>Estimated Total</span>
                  <p className="highlight-total">₹{Math.round(pricing.total).toLocaleString()}</p>
                </div>
              </div>

              {/* Add to Cart CTA */}
              <button 
                className="btn btn-primary btn-lg" 
                onClick={handleQuickAdd}
                style={{ width: '100%', justifyContent: 'center', gap: '10px' }}
              >
                <ShoppingBag size={18} /> Add Selected to Cart
              </button>
            </div>

          </div>
        </section>

        {/* Footer Navigation */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '30px', paddingBottom: '40px' }}>
          <button className="btn btn-ghost" onClick={() => navigate('/')}>
            {'<'} Generate New Designs
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/cart')} style={{ gap: '6px' }}>
            Go to Cart <ArrowRight size={16} />
          </button>
        </div>

      </div>

      {/* Floating Success Toast Alert */}
      {addedToast && (
        <div className="toast-success-alert">
          <Check size={18} />
          <span>Added to Cart Successfully!</span>
        </div>
      )}

    </div>
  );
}
