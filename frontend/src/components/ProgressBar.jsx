// src/components/ProgressBar.jsx
import React from 'react';

const ProgressBar = ({ value = 0, color = 'bg-primary', animated = false, showLabel = false, className = '' }) => {
  const safeValue = Math.min(Math.max(value, 0), 100);
  
  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs font-bold text-primary dark:text-primary-dark tracking-wider uppercase">
            {animated ? 'ANALYZING...' : 'PROGRESS'}
          </span>
          <span className="text-xs font-bold text-primary dark:text-primary-dark">{Math.round(safeValue)}%</span>
        </div>
      )}
      <div className="w-full h-2 bg-indigo-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full ${color} transition-all duration-300 ease-out relative`}
          style={{ width: `${safeValue}%` }}
        >
          {animated && (
            <div 
              className="absolute top-0 left-0 bottom-0 w-full bg-white/20" 
              style={{ animation: 'shimmer 1.5s infinite linear', backgroundSize: '200% 100%' }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;
