// src/pages/UploadPage.jsx
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ProgressBar from '../components/ProgressBar';
import api from '../api';
import { UploadCloud, FileText, X, Rocket, ShieldCheck, Zap, ArrowLeft, Check, AlertCircle } from 'lucide-react';

const UploadPage = () => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateFile = (file) => {
    setError('');
    
    // Check format
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type)) {
      setError('Invalid file format. Please upload PDF or DOCX.');
      return false;
    }
    
    // Check size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File is too large. Maximum size is 10MB.');
      return false;
    }
    
    return true;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (validateFile(droppedFile)) {
        setFile(droppedFile);
      }
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (validateFile(selectedFile)) {
        setFile(selectedFile);
      }
    }
  };

  const removeFile = () => {
    setFile(null);
    setProgress(0);
    setSuccess(false);
    setError('');
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(0);
    setError('');

    try {
      const result = await api.uploadDocument(file, (pct) => {
        setProgress(pct);
      });

      setSuccess(true);
      setProgress(100);

      // Navigate to monitor page after a brief success animation
      setTimeout(() => {
        navigate(`/monitor/${result.doc_id}`);
      }, 1500);
    } catch (err) {
      setError(err.message || 'Upload failed. Please try again.');
      setUploading(false);
      setProgress(0);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark transition-colors pt-16 font-sans">
      <Navbar />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-[fadeInUp_0.5s_ease-out]">
        <div className="flex items-center gap-4 mb-10">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Upload Document</h1>
        </div>

        <div className="max-w-2xl mx-auto">
          {/* Dropzone */}
          <div 
            className={`
              relative flex flex-col items-center justify-center w-full p-12 mb-6
              border-2 border-dashed rounded-2xl transition-all duration-300
              ${dragActive 
                ? 'border-primary bg-indigo-50/50 dark:bg-indigo-900/20 scale-[1.02]' 
                : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-card-dark hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-slate-800/50'}
              ${error ? 'border-error bg-red-50 dark:bg-red-900/10' : ''}
              ${file && !dragActive ? 'hidden' : 'flex'}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input 
              ref={inputRef}
              type="file" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
              onChange={handleChange}
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            />
            
            <div className="w-16 h-16 rounded-full bg-indigo-100 text-primary dark:bg-indigo-900/50 dark:text-primary-dark flex items-center justify-center mb-6 shadow-sm">
              <UploadCloud className="w-8 h-8" />
            </div>
            
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 text-center">
              Drag & drop files here
            </h3>
            
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6 text-center">
              Limit 10MB per file • PDF, DOCX
            </p>
            
            <button type="button" className="px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 hover:shadow-sm transition-all pointer-events-none">
              Browse Files
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg flex items-start gap-3 animate-[fadeInUp_0.3s_ease-out]">
              <AlertCircle className="w-5 h-5 text-error shrink-0 mt-0.5" />
              <p className="text-sm text-error font-medium">{error}</p>
            </div>
          )}

          {/* Selected File Card */}
          {file && !dragActive && (
            <div className="mb-6 animate-[fadeInUp_0.3s_ease-out]">
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 flex items-center gap-4 border border-slate-200 dark:border-slate-700 transition-all">
                <div className="w-12 h-12 rounded-lg bg-white dark:bg-slate-900 flex items-center justify-center text-primary shadow-sm shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="flex-grow min-w-0">
                  <p className="font-bold text-sm text-slate-900 dark:text-white truncate mb-1">
                    {file.name}
                  </p>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 tracking-wider font-mono">
                     {formatFileSize(file.size)}
                  </p>
                </div>
                {!uploading && !success && (
                  <button 
                    onClick={removeFile}
                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
                {success && (
                   <div className="w-8 h-8 rounded-full bg-success/20 text-success flex items-center justify-center shrink-0 animate-[bounce_0.5s_ease-out]">
                     <Check className="w-5 h-5" />
                   </div>
                )}
              </div>
              
              {(uploading || success) && (
                <div className="mt-4 animate-[fadeInUp_0.3s_ease-out]">
                  <ProgressBar 
                    value={progress} 
                    animated={uploading} 
                    showLabel 
                    color={success ? 'bg-success' : 'bg-primary'} 
                  />
                </div>
              )}
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={handleUpload}
            disabled={!file || uploading || success}
            className={`
              w-full py-3.5 px-4 rounded-xl font-bold flex items-center justify-center text-base transition-all duration-200 mb-10
              ${!file ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed' : 
                success ? 'bg-success text-white shadow-lg shadow-success/20' :
                'bg-primary hover:bg-indigo-600 text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30'}
            `}
          >
            {success ? (
              <>
                <Check className="w-5 h-5 mr-2" /> Upload Complete — Redirecting...
              </>
            ) : (
              <>
                <Rocket className="w-5 h-5 mr-2" /> {uploading ? 'Uploading...' : 'Upload & Analyze'}
              </>
            )}
          </button>

          {/* Feature highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-50 dark:bg-slate-800/30 p-5 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 text-success flex items-center justify-center mb-3">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-2">Secure & Private</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Your documents are encrypted and never used for training models without consent.
              </p>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-800/30 p-5 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
                <Zap className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-2">AI Optimized</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Full support for OCR and complex layout analysis in PDF and DOCX formats.
              </p>
            </div>
          </div>
          
          <p className="text-center mt-10 text-xs font-medium text-slate-500 dark:text-slate-400">
            By uploading, you agree to our <a href="#" className="text-primary hover:underline">Terms of Service</a>.<br/>
            Support for files up to 100 pages.
          </p>
        </div>
      </main>
    </div>
  );
};

export default UploadPage;
