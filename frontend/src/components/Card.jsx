// src/components/Card.jsx
import React from 'react';

const Card = ({
  children,
  className = '',
  hoverable = false,
  onClick
}) => {
  return (
    <div
      onClick={onClick}
      className={`
        bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm
        transition-all duration-200 overflow-hidden
        ${hoverable ? 'hover:shadow-md hover:-translate-y-1 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export default Card;
