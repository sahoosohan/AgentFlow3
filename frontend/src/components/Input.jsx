// src/components/Input.jsx
import React from 'react';

const Input = React.forwardRef(({
  label,
  error,
  helperText,
  icon,
  className = '',
  ...props
}, ref) => {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={`
            block w-full rounded-lg sm:text-sm
            bg-white dark:bg-background-dark
            border ${error ? 'border-error ring-error dark:border-error' : 'border-slate-300 dark:border-slate-700'}
            text-slate-900 dark:text-white
            focus:ring-2 focus:ring-primary focus:border-primary dark:focus:ring-primary-dark dark:focus:border-primary-dark
            transition-colors
            ${icon ? 'pl-10' : 'pl-3'}
            pr-3 py-2.5
            placeholder-slate-400 dark:placeholder-slate-500
          `}
          {...props}
        />
      </div>
      {(error || helperText) && (
        <p className={`mt-1 text-sm ${error ? 'text-error' : 'text-slate-500 dark:text-slate-400'}`}>
          {error || helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
