// src/components/AgentStatusCard.jsx
import React from 'react';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import ProgressBar from './ProgressBar';

const AgentStatusCard = ({ 
  agentName, 
  agentRole, 
  icon, 
  status = 'waiting', 
  progress = 0, 
  message, 
  steps = [],
  className = '' 
}) => {
  const getStatusStyles = () => {
    switch(status) {
      case 'processing': 
        return {
          wrapper: 'border-primary shadow-[0_0_15px_rgba(99,102,241,0.2)] dark:shadow-[0_0_15px_rgba(129,140,248,0.15)] ring-1 ring-primary/20 bg-white dark:bg-card-dark',
          iconBg: 'bg-primary text-white',
          title: 'text-slate-900 dark:text-white',
          role: 'text-slate-500 dark:text-slate-400'
        };
      case 'complete':
        return {
          wrapper: 'border-slate-200 dark:border-slate-700 bg-white dark:bg-card-dark',
          iconBg: 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500',
          title: 'text-slate-900 dark:text-white',
          role: 'text-slate-500 dark:text-slate-400'
        };
      case 'error':
        return {
          wrapper: 'border-error shadow-[0_0_15px_rgba(239,68,68,0.2)] bg-white dark:bg-card-dark',
          iconBg: 'bg-error text-white',
          title: 'text-slate-900 dark:text-white',
          role: 'text-slate-500 dark:text-slate-400'
        };
      case 'waiting':
      default:
        return {
          wrapper: 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50',
          iconBg: 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500',
          title: 'text-slate-400 dark:text-slate-500',
          role: 'text-slate-400 dark:text-slate-500'
        };
    }
  };

  const styles = getStatusStyles();

  return (
    <div className={`rounded-2xl border p-6 transition-all duration-300 ${styles.wrapper} ${className}`}>
      <div className="flex items-center gap-4 mb-6">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${styles.iconBg} relative`}>
          {icon}
          {status === 'complete' && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-white dark:bg-card-dark rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-success" />
            </div>
          )}
        </div>
        <div>
          <h3 className={`font-bold text-lg ${styles.title}`}>{agentName}</h3>
          <p className={`text-xs font-semibold uppercase tracking-wider ${styles.role}`}>{agentRole}</p>
        </div>
        {status === 'waiting' && (
           <div className="ml-auto w-3 h-3 rounded-full bg-slate-200 dark:bg-slate-700"></div>
        )}
        {status === 'processing' && (
           <div className="ml-auto w-3 h-3 rounded-full bg-primary animate-[pulseGlow_2s_infinite]"></div>
        )}
      </div>

      {status === 'waiting' && (
        <div className="flex flex-col items-center justify-center py-8 text-center h-[160px]">
          <Loader2 className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2 animate-spin duration-1000" />
          <p className="text-sm text-slate-400 dark:text-slate-500">Awaiting dataset from Agent 1</p>
        </div>
      )}

      {(status === 'processing' || status === 'complete' || status === 'error') && (
        <div className="space-y-4 h-[160px] flex flex-col justify-between">
          <ul className="space-y-3">
            {steps.map((step, idx) => (
              <li key={idx} className="flex items-start gap-3">
                {step.status === 'done' && <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />}
                {step.status === 'active' && <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0 mt-0.5" />}
                {step.status === 'pending' && <div className="w-4 h-4 rounded-full border-2 border-slate-200 dark:border-slate-700 shrink-0 mt-0.5" />}
                <span className={`text-sm tracking-wide ${
                  step.status === 'done' ? 'text-slate-700 dark:text-slate-300 font-medium' :
                  step.status === 'active' ? 'text-slate-900 dark:text-white font-bold' :
                  'text-slate-400 dark:text-slate-500 font-medium'
                }`}>
                  {step.label}
                </span>
              </li>
            ))}
          </ul>
          
          {status === 'processing' && (
            <ProgressBar value={progress} showLabel animated color="bg-primary" />
          )}

          {status === 'complete' && (
            <ProgressBar value={100} color="bg-indigo-100 dark:bg-slate-700 w-full" />
          )}
          
          {status === 'error' && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-start gap-2 border border-red-100 dark:border-red-900/30">
              <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
              <p className="text-xs text-error font-medium">{message}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AgentStatusCard;
