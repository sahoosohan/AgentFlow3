// src/components/Button.jsx
import React from 'react';

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  className = '',
  ...props
}) => {
  const baseStyles = "inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 disabled:opacity-60 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-primary hover:bg-indigo-600 text-white focus:ring-primary shadow-sm",
    secondary: "bg-secondary hover:bg-violet-600 text-white focus:ring-secondary shadow-sm",
    outlined: "border-2 border-slate-200 hover:border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-600 focus:ring-slate-500",
    ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white focus:ring-slate-500",
    danger: "bg-error hover:bg-red-600 text-white focus:ring-error shadow-sm",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  return (
    <button
      className={`
        ${baseStyles}
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {!loading && icon && (
        <span className="mr-2">{icon}</span>
      )}
      {children}
    </button>
  );
};

export default Button;
