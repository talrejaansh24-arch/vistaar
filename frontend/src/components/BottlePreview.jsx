import React from 'react';
import './BottlePreview.css';

export default function BottlePreview({ labelImage, bottleSize = '500ml' }) {
  // Map bottle size to visual scale
  const sizeMap = {
    '250ml': { height: 300, width: 120, labelHeight: 140 },
    '500ml': { height: 400, width: 140, labelHeight: 180 },
    '1000ml': { height: 500, width: 160, labelHeight: 220 },
  };

  const dims = sizeMap[bottleSize] || sizeMap['500ml'];

  return (
    <div className="bottle-preview-container">
      <div 
        className="bottle-mockup"
        style={{
          width: dims.width,
          height: dims.height
        }}
      >
        {/* Bottle Cap */}
        <div className="bottle-cap"></div>
        <div className="bottle-neck"></div>
        
        {/* Bottle Body */}
        <div className="bottle-body">
          {/* Glass & Water Reflection */}
          <div className="bottle-glass-effect"></div>
          
          {/* The Label Overlay */}
          <div 
            className="bottle-label"
            style={{
              height: dims.labelHeight,
              backgroundImage: labelImage ? `url(${labelImage})` : 'none',
            }}
          >
            <div className="label-shadow-overlay"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
