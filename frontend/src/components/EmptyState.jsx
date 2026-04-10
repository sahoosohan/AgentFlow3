// src/components/EmptyState.jsx
import React from 'react';
import Button from './Button';

const EmptyState = ({
  title,
  subtitle,
  actionLabel,
  onAction,
  icon,
  className = ''
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 ${className}`}>
      {icon && (
        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
        {subtitle}
      </p>
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="primary">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
