// src/pages/WorkflowMonitor.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Navbar from '../components/Navbar';
import AgentStatusCard from '../components/AgentStatusCard';
import Button from '../components/Button';
import api from '../api';
import { Eye, FileText, Settings, XCircle, CheckCircle2, AlertCircle } from 'lucide-react';

const WorkflowMonitor = () => {
  const { jobId } = useParams();
  const [status, setStatus] = useState('processing');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [batchId, setBatchId] = useState('');
  const [logs, setLogs] = useState([]);
  const lastStageMessageRef = useRef('');
  const logsEndRef = useRef(null);
  const navigate = useNavigate();

  // Derive agent stages from progress
  const getStage = (p, s) => {
    if (s === 'complete') return 'complete';
    if (s === 'failed') return 'failed';
    if (p >= 70) return 'writing';
    if (p >= 40) return 'extracted';
    if (p >= 25) return 'extracting';
    return 'started';
  };

  const stage = getStage(progress, status);

  // Add a log entry
  const addLog = (src, msg, type = 'info') => {
    setLogs(prev => [...prev, {
      id: Date.now() + Math.random(),
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' }),
      src, msg, type
    }]);
  };

  // Connect to SSE stream
  useEffect(() => {
    if (!jobId) return;

    let cancelled = false;

    addLog('SYSTEM', 'Connecting to processing pipeline...');

    const connect = async () => {
      try {
        const stream = await api.monitorStream(jobId);
        
        await stream.subscribe(
          // onMessage
          (data) => {
            if (cancelled) return;
            
            const newProgress = data.progress || 0;
            const newStatus = data.status || 'processing';
            
            setProgress(newProgress);
            setStatus(newStatus);

            if (data.batch_id) setBatchId(data.batch_id);
            if (data.error_message) {
              setErrorMsg(data.error_message);
              if (data.error_message !== lastStageMessageRef.current) {
                const logType = newStatus === 'failed'
                  ? 'error'
                  : /retry|waiting|timeout|rate limit/i.test(data.error_message)
                  ? 'warning'
                  : 'info';
                addLog('SYSTEM', data.error_message, logType);
                lastStageMessageRef.current = data.error_message;
              }
            }

            // Generate contextual log messages based on progress milestones
            if (newProgress <= 10 && newProgress > 0) {
              addLog('SYSTEM', 'File downloaded from storage.', 'success');
            } else if (newProgress > 10 && newProgress <= 25) {
              addLog('SYSTEM', 'Extracting text from document...', 'info');
            } else if (newProgress > 25 && newProgress <= 40) {
              addLog('AGENT_1', 'Starting semantic entity extraction...', 'info');
            } else if (newProgress > 40 && newProgress <= 70) {
              addLog('AGENT_1', `Extraction in progress — ${newProgress}% complete.`, 'info');
            } else if (newProgress > 70 && newProgress <= 90) {
              addLog('AGENT_2', 'Synthesizing report structure...', 'info');
            } else if (newProgress > 90 && newProgress < 100) {
              addLog('SYSTEM', 'Saving report to database...', 'info');
            }

            if (newStatus === 'complete') {
              addLog('SYSTEM', 'Workflow execution complete. Report generated.', 'success');
            }
            if (newStatus === 'failed') {
              addLog('SYSTEM', `Pipeline failed: ${data.error_message || 'Unknown error'}`, 'error');
            }
          },
          // onError
          (err) => {
            if (!cancelled) {
              addLog('SYSTEM', `Connection error: ${err.message}`, 'error');
            }
          },
          // onComplete
          (data) => {
            // Stream finished
          }
        );
      } catch (err) {
        if (!cancelled) {
          addLog('SYSTEM', `Failed to connect: ${err.message}`, 'error');
        }
      }
    };

    connect();

    return () => { cancelled = true; };
  }, [jobId]);

  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const steps = ['Uploaded', 'Extracting', 'Report Ready'];
  
  const getStepStatus = (stepIndex) => {
    if (stage === 'complete') return 'complete';
    if (stage === 'failed') return stepIndex === 0 ? 'complete' : 'pending';
    
    if (stepIndex === 0) return 'complete'; // Uploaded
    if (stepIndex === 1) { // Extracting
      if (['extracting', 'started'].includes(stage)) return 'active';
      return ['extracted', 'writing', 'complete'].includes(stage) ? 'complete' : 'pending';
    }
    if (stepIndex === 2) { // Report Ready
      if (stage === 'writing') return 'active';
      if (stage === 'complete') return 'complete';
      return 'pending';
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark transition-colors pt-16 font-sans">
      <Navbar />
      
      {stage === 'complete' && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 text-success animate-[fadeInUp_1s_ease-out_forwards]">
            <div className="text-4xl mt-12">🎊</div>
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-[fadeInUp_0.5s_ease-out]">
        
        {/* Header */}
        <div className="text-center mb-12">
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase mb-4 border ${
            status === 'failed' 
              ? 'bg-red-50 dark:bg-red-900/30 text-error border-red-100 dark:border-red-800'
              : status === 'complete'
              ? 'bg-green-50 dark:bg-green-900/30 text-success border-green-100 dark:border-green-800'
              : 'bg-indigo-50 dark:bg-indigo-900/30 text-primary dark:text-primary-dark border-indigo-100 dark:border-indigo-800'
          }`}>
             <div className={`w-1.5 h-1.5 rounded-full mr-2 ${
               status === 'failed' ? 'bg-error' : status === 'complete' ? 'bg-success' : 'bg-primary animate-pulse'
             }`}></div>
             {status === 'complete' ? 'Complete' : status === 'failed' ? 'Failed' : 'Live Analysis'}
          </div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
            {status === 'complete' ? 'Processing Complete' : status === 'failed' ? 'Processing Failed' : 'Processing Document'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            {batchId ? `Batch-ID: #${batchId}` : `Doc-ID: ${jobId?.slice(0, 8) || 'N/A'}`}
          </p>
        </div>

        {/* Stepper */}
        <div className="max-w-3xl mx-auto mb-16 relative">
          <div className="absolute top-5 left-8 right-8 h-0.5 bg-slate-200 dark:bg-slate-800 -z-10"></div>
          
          <div className="absolute top-5 left-8 h-0.5 bg-primary transition-all duration-1000 -z-10" 
               style={{ width: stage === 'complete' ? '100%' : ['writing', 'extracted'].includes(stage) ? '50%' : stage === 'failed' ? '0%' : '0%' }}></div>
          
          <div className="flex justify-between relative z-10">
            {steps.map((step, idx) => {
              const stepStatus = getStepStatus(idx);
              return (
                <div key={idx} className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 transition-colors duration-500 shadow-sm
                    ${stepStatus === 'complete' ? 'bg-primary text-white border-2 border-primary' : 
                      stepStatus === 'active' ? 'bg-white dark:bg-card-dark text-primary border-2 border-primary' : 
                      'bg-slate-100 dark:bg-slate-800 text-slate-400 border-2 border-slate-200 dark:border-slate-700'}`}
                  >
                    {stepStatus === 'complete' ? <CheckCircle2 className="w-5 h-5" /> :
                     idx === 0 ? <CheckCircle2 className="w-5 h-5" /> :
                     idx === 1 ? <Settings className={`w-5 h-5 ${stepStatus === 'active' ? 'animate-[spin_4s_linear_infinite]' : ''}`} /> :
                     <FileText className="w-5 h-5" />
                    }
                  </div>
                  <span className={`text-sm font-bold ${stepStatus === 'active' ? 'text-slate-900 dark:text-white' : stepStatus === 'complete' ? 'text-primary dark:text-primary-dark' : 'text-slate-400'}`}>
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Agents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <AgentStatusCard
            agentName="Agent 1"
            agentRole="EXTRACTOR ENGINE"
            icon={<Settings className="w-6 h-6" />}
            status={status === 'failed' ? 'error' : ['started', 'extracting'].includes(stage) ? 'processing' : 'complete'}
            progress={progress < 40 ? Math.min(progress * 2.5, 100) : 100}
            message={status === 'failed' ? errorMsg : ''}
            steps={[
              { label: 'Source connection established', status: progress >= 10 ? 'done' : 'pending' },
              { label: 'Text extraction & OCR', status: progress >= 25 ? 'done' : progress >= 10 ? 'active' : 'pending' },
              { label: 'Entities semantic analysis', status: progress >= 40 ? 'done' : progress >= 25 ? 'active' : 'pending' },
              { label: 'Metadata cross-referencing', status: progress >= 40 ? 'done' : 'pending' }
            ]}
          />
          
          <AgentStatusCard
            agentName="Agent 2"
            agentRole="REPORT WRITER"
            icon={<FileText className="w-6 h-6" />}
            status={status === 'failed' ? 'error' : stage === 'writing' ? 'processing' : stage === 'complete' ? 'complete' : 'waiting'}
            progress={progress >= 70 ? Math.min((progress - 70) * 3.3, 100) : 0}
            message={status === 'failed' ? errorMsg : ''}
            steps={[
               { label: 'Dataset ingestion', status: progress >= 75 ? 'done' : progress >= 70 ? 'active' : 'pending' },
               { label: 'Synthesizing report structure', status: progress >= 90 ? 'done' : progress >= 75 ? 'active' : 'pending' },
               { label: 'Formatting executive summary', status: progress >= 100 ? 'done' : progress >= 90 ? 'active' : 'pending' }
            ]}
          />
        </div>

        {/* Live Terminal Log */}
        <div className="bg-[#0f111a] rounded-xl overflow-hidden shadow-xl border border-slate-800 flex flex-col h-64 mb-10 relative">
          <div className="bg-[#1a1d27] px-4 py-2 flex justify-between items-center border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <span className="ml-3 text-xs font-bold text-slate-500 tracking-widest uppercase font-mono">LIVE EXECUTION LOG</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${status === 'complete' ? 'bg-emerald-500' : status === 'failed' ? 'bg-red-500' : 'bg-emerald-500 animate-pulse'}`}></div>
              <span className={`text-[10px] font-bold tracking-widest uppercase ${status === 'failed' ? 'text-red-500' : 'text-emerald-500'}`}>
                {status === 'complete' ? 'DONE' : status === 'failed' ? 'ERROR' : 'CONNECTED'}
              </span>
            </div>
          </div>
          <div className="p-4 overflow-y-auto font-mono text-[13px] leading-relaxed flex-grow">
            {logs.map((log) => (
              <div key={log.id} className="mb-1 flex hover:bg-white/5 px-1 -mx-1 rounded transition-colors">
                <span className="text-slate-500 mr-4 shrink-0">{log.timestamp}</span>
                <span className={`mr-3 shrink-0 ${log.src === 'SYSTEM' ? 'text-blue-400' : log.src === 'AGENT_2' ? 'text-purple-400' : 'text-emerald-400'}`}>[{log.src}]</span>
                <span className={`
                  ${log.type === 'error' ? 'text-red-400 font-bold' : 
                    log.type === 'warning' ? 'text-amber-400' : 
                    log.type === 'success' ? 'text-emerald-300' : 
                    'text-slate-300'}
                `}>
                  {log.msg}
                </span>
              </div>
            ))}
            {!['complete', 'failed'].includes(status) && (
              <div className="flex mt-1">
                <span className="text-slate-500 mr-4 opacity-0">00:00:00</span>
                <span className="w-2 h-4 bg-slate-400 animate-pulse"></span>
              </div>
            )}
            <div ref={logsEndRef} />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-center gap-4 animate-[fadeInUp_0.5s_ease-out]">
          {status === 'complete' ? (
             <Button 
               variant="primary" 
               size="lg" 
               icon={<Eye className="w-5 h-5" />} 
               className="px-8 shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-transform"
               onClick={() => navigate(`/report/${jobId}`)}
             >
               View Report
             </Button>
          ) : status === 'failed' ? (
             <>
               <Button 
                 variant="primary" 
                 size="md" 
                 className="px-6"
                 onClick={() => navigate('/upload')}
               >
                 Try Again
               </Button>
               <Button 
                variant="ghost" 
                size="md" 
                className="text-slate-600 dark:text-slate-400"
                onClick={() => navigate('/dashboard')}
               >
                 Back to Dashboard
               </Button>
             </>
          ) : (
             <>
               <Button variant="ghost" size="md" icon={<Eye className="w-5 h-5" />} className="bg-indigo-50 dark:bg-slate-800 text-primary dark:text-primary-dark font-bold hover:bg-indigo-100 dark:hover:bg-slate-700" disabled>
                 Preview Report
               </Button>
               <Button 
                variant="ghost" 
                size="md" 
                icon={<XCircle className="w-5 h-5" />} 
                className="text-error font-bold hover:bg-red-50 dark:hover:bg-red-900/20"
                onClick={async () => {
                  setStatus('failed');
                  try {
                    await supabase.from('documents').update({ status: 'cancelled' }).eq('id', jobId);
                  } catch (e) { console.error(e); }
                  navigate('/dashboard');
                }}
               >
                 Cancel
               </Button>
             </>
          )}
        </div>

      </main>
    </div>
  );
};

export default WorkflowMonitor;
