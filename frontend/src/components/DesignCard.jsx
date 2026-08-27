import { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { cardTilt3D, elasticScale } from '../utils/animations';
import './DesignCard.css';

export default function DesignCard({ design }) {
  const navigate = useNavigate();
  const { setCurrentDesign, addToCart } = useStore();
  const cardRef = useRef(null);
  const customizeBtnRef = useRef(null);
  const quickBtnRef = useRef(null);

  useEffect(() => {
    if (cardRef.current) cardTilt3D(cardRef.current, 6);
    if (customizeBtnRef.current) elasticScale(customizeBtnRef.current);
    if (quickBtnRef.current) elasticScale(quickBtnRef.current);
  }, []);

  const handleCustomize = () => {
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

  return (
    <div className="design-card card" ref={cardRef} onClick={handleCustomize} style={{ cursor: 'pointer' }}>
      <div className="design-preview">
        <img src={design.preview_url} alt={design.name} />
        <div className="design-overlay">
          <div className="overlay-content">
            <button className="btn btn-primary btn-sm" ref={customizeBtnRef} onClick={handleCustomize}>Customize</button>
            <button className="btn btn-secondary btn-sm" ref={quickBtnRef} onClick={handleQuickOrder}>Quick Order</button>
          </div>
        </div>
        <div className="design-shine" />
      </div>
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
