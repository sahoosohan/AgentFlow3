// src/components/Skeleton.jsx
import React from 'react';

const Skeleton = ({ className = '', style }) => {
  return (
    <div
      className={`shimmer-bg bg-slate-200 dark:bg-slate-800 rounded animate-[shimmer_2s_infinite_linear] ${className}`}
      style={{
        ...style
      }}
    />
  );
};

export default Skeleton;
