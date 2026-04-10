// src/components/Badge.jsx
import React from 'react';

const Badge = ({
  children,
  variant = 'info',
  className = ''
}) => {
  const variants = {
    success: "bg-success/10 text-success border-success/20",
    warning: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    error: "bg-error/10 text-error border-error/20",
    info: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    pending: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider border ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

export default Badge;
