// src/pages/NotFound.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import { LayoutDashboard, ArrowLeft, FileText, Search, Settings } from 'lucide-react';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
      
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-tr from-indigo-500/5 to-purple-500/5 rounded-full blur-3xl -z-10"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] w-[400px] h-[400px] bg-gradient-to-tr from-indigo-500/10 to-transparent rounded-full blur-2xl -z-10"></div>

      {/* Floating Illustration */}
      <div className="relative mb-12 animate-[float_6s_ease-in-out_infinite]">
        <div className="w-64 h-64 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center transform -rotate-6 relative z-10">
          <div className="w-16 h-2 bg-slate-100 dark:bg-slate-800 rounded absolute top-8 left-8"></div>
          <div className="w-32 h-2 bg-slate-100 dark:bg-slate-800 rounded absolute top-14 left-8"></div>
          <div className="w-24 h-2 bg-slate-100 dark:bg-slate-800 rounded absolute bottom-14 right-8"></div>
          <div className="w-12 h-2 bg-slate-100 dark:bg-slate-800 rounded absolute bottom-8 right-8"></div>
          
          <div className="w-20 h-24 bg-indigo-100/50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-primary dark:text-primary-dark">
            <FileText className="w-10 h-10" />
          </div>
        </div>
        
        {/* Floating elements */}
        <div className="absolute -top-6 -right-6 w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg flex items-center justify-center text-white transform rotate-12 animate-[float_4s_ease-in-out_infinite_1s]">
           <Settings className="w-8 h-8 opacity-80" />
        </div>
        <div className="absolute -bottom-8 -left-8 w-14 h-14 bg-white dark:bg-slate-800 rounded-full shadow-lg border border-slate-100 dark:border-slate-700 flex items-center justify-center text-primary dark:text-primary-dark transform -rotate-12 animate-[float_5s_ease-in-out_infinite_2s]">
           <Search className="w-6 h-6" />
        </div>
      </div>

      {/* Content */}
      <div className="text-center z-10">
        <h1 className="text-8xl md:text-9xl font-black mb-4 tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-indigo-600 to-purple-600 drop-shadow-sm">404</h1>
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-4">Oops! Page not found</h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium max-w-md mx-auto mb-8">
          The page you're looking for doesn't exist or has been moved to another workflow.
        </p>

        <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-900/50 rounded-full text-xs font-mono text-slate-500 tracking-wider mb-10 border border-slate-200 dark:border-slate-800">
          <div className="w-1.5 h-1.5 rounded-full bg-error"></div>
          ERROR CODE: ERR_OBJECT_NOT_FOUND_IN_WORKSPACE
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button 
            variant="primary" 
            size="lg" 
            icon={<LayoutDashboard className="w-5 h-5" />}
            onClick={() => navigate('/dashboard')}
            className="w-full sm:w-auto shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-transform"
          >
            Go to Dashboard
          </Button>
          <Button 
            variant="ghost" 
            size="lg" 
            icon={<ArrowLeft className="w-5 h-5" />}
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto text-primary dark:text-primary-dark font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Go Back
          </Button>
        </div>
      </div>

      <p className="absolute bottom-8 left-0 right-0 text-center text-xs font-medium text-slate-400 dark:text-slate-500">
        © 2024 AgentFlow AI Document Processing Systems. All rights reserved.
      </p>
    </div>
  );
};

export default NotFound;
