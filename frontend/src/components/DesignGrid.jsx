import { useEffect, useRef, useState } from 'react';
import DesignCard from './DesignCard';
import { waveAnimation } from '../utils/animations';
import './DesignGrid.css';

export default function DesignGrid({ designs = [] }) {
  const gridRef = useRef(null);
  const [showAll, setShowAll] = useState(false);

  const safeDesigns = Array.isArray(designs) ? designs : [];
  const visibleDesigns = safeDesigns;

  useEffect(() => {
    if (gridRef.current && visibleDesigns.length > 0) {
      const cards = gridRef.current.querySelectorAll('.design-card');
      waveAnimation(cards, { delay: 0.2 });
    }
  }, [visibleDesigns]);

  if (!designs.length) return null;

  return (
    <div className="design-grid-section">
      <div className="design-grid-header">
        <p className="design-count">{designs.length} unique designs created for your brand</p>
      </div>
      <div className="design-grid" ref={gridRef}>
        {visibleDesigns.map((d) => <DesignCard key={d.id} design={d} />)}
      </div>
    </div>
  );
}
