import { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { cardTilt3D, elasticScale } from '../utils/animations';
import './DesignCard.css';

export default function DesignCard({ design }) {
  const navigate = useNavigate();
  const { setCurrentDesign, addToCart, user, savedDesigns, saveDesign, deleteSavedDesign } = useStore();
  const cardRef = useRef(null);
  const customizeBtnRef = useRef(null);
  const quickBtnRef = useRef(null);
  const addCartBtnRef = useRef(null);
  
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (cardRef.current) cardTilt3D(cardRef.current, 6);
    if (customizeBtnRef.current) elasticScale(customizeBtnRef.current);
    if (quickBtnRef.current) elasticScale(quickBtnRef.current);
    if (addCartBtnRef.current) elasticScale(addCartBtnRef.current);
  }, []);

  const isSaved = savedDesigns.some(sd => sd.template_id === design.template_id || sd.preview_url === design.preview_url);
  const savedObj = savedDesigns.find(sd => sd.template_id === design.template_id || sd.preview_url === design.preview_url);

  const handleSaveToggle = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!user) {
      alert("Please login to save designs to your library!");
      navigate('/login');
      return;
    }
    try {
      if (isSaved) {
        await deleteSavedDesign(savedObj.id);
        showToast("Removed from Saved Designs!");
      } else {
        await saveDesign(design);
        showToast("Saved to Your Designs!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const handleCustomize = (e) => {
    e.stopPropagation();
    setCurrentDesign(design);
    navigate('/editor');
  };

  const handleQuickOrder = (e) => {
    e.stopPropagation();
    addToCart({
      design,
      productId: 2,
      quantity: 100,
      size: '500ml',
      unitPrice: 20,
    });
    navigate('/cart');
  };

  const handleAddToCart = (e) => {
    e.stopPropagation();
    addToCart({
      design,
      productId: 2,
      quantity: 100,
      size: '500ml',
      unitPrice: 20,
    });
    showToast("Added 100 bottles to cart!");
  };

  return (
    <div className="design-card card" ref={cardRef} onClick={handleCustomize} style={{ cursor: 'pointer', position: 'relative' }}>
      <div className="design-preview" style={{ background: '#f8fafc', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
        
        {/* CSS Bottle Mockup Wrapper */}
        <div className="css-bottle-mockup" style={{
          position: 'relative',
          width: '85px',
          height: '240px',
          background: 'linear-gradient(to right, #e2e8f0 0%, #ffffff 25%, #e2e8f0 80%, #cbd5e1 100%)',
          borderRadius: '35px 35px 12px 12px / 20px 20px 10px 10px',
          boxShadow: '2px 10px 20px rgba(0,0,0,0.1), inset -6px 0 12px rgba(0,0,0,0.08), inset 6px 0 12px rgba(255,255,255,0.8)',
          marginTop: '20px',
          marginBottom: '10px'
        }}>
          {/* Bottle Neck & Cap */}
          <div style={{
            position: 'absolute',
            top: '-22px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '32px',
            height: '22px',
            background: 'linear-gradient(to right, #94a3b8, #e2e8f0, #94a3b8)',
            borderTopLeftRadius: '4px',
            borderTopRightRadius: '4px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            {/* Cap Ridges */}
            <div style={{ width: '100%', height: '4px', background: 'rgba(0,0,0,0.1)', marginTop: '2px' }}></div>
            <div style={{ width: '100%', height: '4px', background: 'rgba(0,0,0,0.1)', marginTop: '2px' }}></div>
          </div>
          
          {/* Water level effect */}
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '2px',
            right: '2px',
            height: '2px',
            background: 'rgba(255,255,255,0.6)',
            boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
          }}></div>

          {/* The Label Wrap */}
          <div style={{
            position: 'absolute',
            top: '50px',
            left: '0',
            right: '0',
            height: '110px',
            overflow: 'hidden',
            boxShadow: '0 4px 10px rgba(0,0,0,0.15), 0 -2px 6px rgba(0,0,0,0.05)',
            background: '#fff'
          }}>
            <img 
              src={design.preview_url} 
              alt={design.name} 
              style={{ width: '100%', height: '100%', objectFit: 'cover', color: 'transparent', backgroundColor: '#e2e8f0' }}
              onError={(e) => { e.target.style.opacity = 0; }} onLoad={(e) => { e.target.style.opacity = 1; }} 
            />
          </div>
          
          {/* Glass Glare Highlight */}
          <div style={{
            position: 'absolute',
            top: '0',
            bottom: '0',
            left: '15%',
            width: '12%',
            background: 'linear-gradient(to right, rgba(255,255,255,0), rgba(255,255,255,0.6), rgba(255,255,255,0))',
            zIndex: 10,
            pointerEvents: 'none'
          }}></div>
          <div style={{
            position: 'absolute',
            top: '0',
            bottom: '0',
            right: '8%',
            width: '4%',
            background: 'linear-gradient(to right, rgba(255,255,255,0), rgba(255,255,255,0.3), rgba(255,255,255,0))',
            zIndex: 10,
            pointerEvents: 'none'
          }}></div>
        </div>

        {/* Star/Save button */}
        <button 
          className={`save-toggle-btn ${isSaved ? 'active' : ''}`}
          onClick={handleSaveToggle}
          title={isSaved ? "Remove from Saved" : "Save Design"}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            zIndex: 100,
            background: isSaved ? '#f1c40f' : 'rgba(0,0,0,0.5)',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: isSaved ? '#2c3e50' : '#fff',
            fontSize: '1.3rem',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
          }}
        >
          ★
        </button>

        <div className="design-overlay" style={{ zIndex: 50 }}>
          <div className="overlay-content" style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '85%' }}>
            <button className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center' }} ref={customizeBtnRef} onClick={handleCustomize}>
              🎨 Customize
            </button>
            <button className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'center' }} ref={quickBtnRef} onClick={handleQuickOrder}>
              ⚡ Quick Order
            </button>
            <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center', background: 'rgba(255,255,255,0.1)', color: '#fff' }} ref={addCartBtnRef} onClick={handleAddToCart}>
              🛒 Add to Cart
            </button>
          </div>
        </div>
        <div className="design-shine" />
      </div>
      
      {toastMessage && (
        <div style={{
          position: 'absolute',
          bottom: '70px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.85)',
          color: '#fff',
          padding: '6px 14px',
          borderRadius: '20px',
          fontSize: '0.8rem',
          whiteSpace: 'nowrap',
          zIndex: 15,
          border: '1px solid var(--border)'
        }}>
          {toastMessage}
        </div>
      )}

      <div className="design-info">
        <h3>{design.name}</h3>
        <div className="design-meta">
          <div className="design-colors">
            {design.colors.map((c, i) => (
              <span key={i} className="color-dot" style={{ background: c }} title={c} />
            ))}
          </div>
          <span className="design-style-tag">{design.style || 'Modern'}</span>
        </div>
      </div>
    </div>
  );
}
