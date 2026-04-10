// src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Input from '../components/Input';
import Skeleton from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import api from '../api';
import { Search, ChevronDown, Filter, FileText, CheckCircle2, RefreshCw, Calendar, MoreVertical, Trash2, Download, AlertCircle } from 'lucide-react';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [documents, setDocuments] = useState([]);
  const [activeMenu, setActiveMenu] = useState(null);
  const [error, setError] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const navigate = useNavigate();

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const data = await api.getDocuments();
      setDocuments(data);
    } catch (err) {
      setError(err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Compute statistics from real data
  const stats = {
    total: documents.length,
    completed: documents.filter(d => d.status === 'complete').length,
    processing: documents.filter(d => d.status === 'processing').length,
    thisMonth: documents.filter(d => {
      const created = new Date(d.created_at);
      const now = new Date();
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    }).length,
  };

  // Filter documents
  const filtered = documents.filter(d => {
    const matchesSearch = !searchQuery ||
      d.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.batch_id?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    switch(status) {
      case 'complete': return <Badge variant="success">COMPLETE</Badge>;
      case 'processing': return <Badge variant="info" className="bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mr-1.5 animate-pulse"></span>PROCESSING</Badge>;
      case 'failed': return <Badge variant="error">FAILED</Badge>;
      case 'uploading': return <Badge variant="pending">UPLOADING</Badge>;
      default: return <Badge variant="pending">{status?.toUpperCase()}</Badge>;
    }
  };

  const getFileIcon = (filename, status) => {
    if (status === 'failed') {
      return (
        <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-500">
          <AlertCircle className="w-5 h-5" />
        </div>
      );
    }
    const ext = filename?.split('.').pop()?.toLowerCase();
    return (
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
        ext === 'pdf' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
        ext === 'docx' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' :
        'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
      }`}>
        <FileText className="w-5 h-5" />
      </div>
    );
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const toggleMenu = (id, e) => {
    e.stopPropagation();
    if (activeMenu === id) setActiveMenu(null);
    else setActiveMenu(id);
  };

  useEffect(() => {
    const closeMenu = () => setActiveMenu(null);
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, []);

  const handleDownload = async (doc) => {
    try {
      setActionLoadingId(doc.id);
      setError('');
      const { blob, filename } = await api.downloadDocument(doc.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || doc.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setActiveMenu(null);
    } catch (err) {
      setError(err.message || 'Failed to download document');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (doc) => {
    const confirmed = window.confirm(`Delete "${doc.filename}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
      setActionLoadingId(doc.id);
      setError('');
      await api.deleteDocument(doc.id);
      setDocuments((current) => current.filter((item) => item.id !== doc.id));
      setActiveMenu(null);
    } catch (err) {
      setError(err.message || 'Failed to delete document');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark transition-colors pt-16">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-[fadeInUp_0.5s_ease-out]">
        <div className="mb-8">
          <p className="text-sm font-semibold text-primary dark:text-primary-dark tracking-wider uppercase mb-1">Workspace Overview</p>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">My Reports</h1>
        </div>
        
        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { title: 'Total Reports', value: stats.total.toLocaleString(), trend: `${stats.total} documents processed`, icon: <FileText className="w-5 h-5" />, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', trendColor: 'text-slate-500' },
            { title: 'Completed', value: stats.completed.toLocaleString(), trend: stats.total > 0 ? `${((stats.completed / stats.total) * 100).toFixed(1)}% success rate` : 'No data yet', icon: <CheckCircle2 className="w-5 h-5" />, color: 'text-success', bg: 'bg-green-100 dark:bg-green-900/30', trendColor: 'text-slate-500' },
            { title: 'Processing', value: stats.processing.toLocaleString(), trend: 'Active workflows', icon: <RefreshCw className="w-5 h-5" />, color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/30', trendColor: 'text-indigo-500 dark:text-indigo-400', iconAnim: stats.processing > 0 ? 'animate-[spin_3s_linear_infinite]' : '' },
            { title: 'This Month', value: stats.thisMonth.toLocaleString(), trend: 'Current billing period', icon: <Calendar className="w-5 h-5" />, color: 'text-slate-600', bg: 'bg-slate-100 dark:bg-slate-800', trendColor: 'text-slate-500' }
          ].map((stat, i) => (
            <Card key={i} className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.bg} ${stat.color} ${stat.iconAnim || ''}`}>
                  {stat.icon}
                </div>
                <span className="font-medium text-slate-600 dark:text-slate-400">{stat.title}</span>
              </div>
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{stat.value}</h3>
              <p className={`text-sm font-medium flex items-center ${stat.trendColor}`}>
                {stat.trend.includes('Active') && (
                  <svg className="w-3 h-3 mr-1.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                )}
                {stat.trend}
              </p>
            </Card>
          ))}
        </div>
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-grow">
            <Input
              placeholder="Search reports by filename or batch ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="w-5 h-5" />}
              className="w-full lg:max-w-2xl"
            />
          </div>
          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-white dark:bg-card-dark border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors min-w-[140px] focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Status</option>
              <option value="complete">Complete</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-error" />
            <p className="text-sm text-error font-medium">{error}</p>
            <button onClick={fetchDocuments} className="ml-auto text-sm text-primary font-semibold hover:underline">Retry</button>
          </div>
        )}
        
        {/* Reports Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Card key={i} className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <Skeleton className="w-12 h-12 rounded-lg" />
                  <Skeleton className="w-8 h-8 rounded-full" />
                </div>
                <div className="flex gap-2 mb-4">
                  <Skeleton className="w-20 h-5" />
                  <Skeleton className="w-24 h-5" />
                </div>
                <Skeleton className="w-3/4 h-6 mb-3" />
                <Skeleton className="w-full h-4 mb-2" />
                <Skeleton className="w-5/6 h-4 mb-8" />
                <div className="flex justify-between items-center mt-auto">
                  <Skeleton className="w-24 h-4" />
                  <Skeleton className="w-24 h-4" />
                </div>
              </Card>
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((doc) => (
              <Card key={doc.id} hoverable className="p-6 flex flex-col relative group">
                <div className="flex justify-between items-start mb-5">
                  {getFileIcon(doc.filename, doc.status)}
                  <button 
                    onClick={(e) => toggleMenu(doc.id, e)}
                    className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors focus:outline-none"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  
                  {activeMenu === doc.id && (
                    <div className="absolute top-14 right-6 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-100 dark:border-slate-700 z-10 py-1 animate-[fadeInUp_0.2s_ease-out]">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(doc);
                        }}
                        disabled={actionLoadingId === doc.id}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center disabled:opacity-60"
                      >
                        <Download className="w-4 h-4 mr-2" /> {actionLoadingId === doc.id ? 'Working...' : 'Download'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(doc);
                        }}
                        disabled={actionLoadingId === doc.id}
                        className="w-full text-left px-4 py-2 text-sm text-error hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center disabled:opacity-60"
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> {actionLoadingId === doc.id ? 'Working...' : 'Delete'}
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-3 mb-3">
                  {getStatusBadge(doc.status)}
                  <span className="text-xs font-medium text-slate-400">{formatTime(doc.created_at)}</span>
                </div>
                
                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-3 truncate" title={doc.filename}>
                  {doc.filename}
                </h3>
                
                {doc.status === 'complete' && doc.summary && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-8 flex-grow">
                    {doc.summary}
                  </p>
                )}
                
                {doc.status === 'processing' && (
                  <div className="mb-8 flex-grow">
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mb-2 overflow-hidden">
                      <div className="bg-primary h-2 rounded-full relative overflow-hidden transition-all duration-500" style={{ width: `${doc.progress || 0}%` }}>
                         <div className="absolute top-0 left-0 w-full h-full bg-white/20 animate-[shimmer_1.5s_infinite_linear]" style={{ transform: 'translateX(-100%)' }}></div>
                      </div>
                    </div>
                    <p className="text-xs font-medium text-primary dark:text-primary-dark">Processing... {doc.progress || 0}%</p>
                  </div>
                )}
                
                {doc.status === 'failed' && (
                  <div className="mb-8 flex-grow p-3 bg-red-50 dark:bg-red-900/10 rounded-lg">
                    <p className="text-xs font-medium text-error flex items-start gap-1.5">
                      {doc.error_message || 'An error occurred during processing.'}
                    </p>
                  </div>
                )}

                {!doc.summary && doc.status === 'complete' && (
                  <div className="mb-8 flex-grow">
                    <p className="text-sm text-slate-500 dark:text-slate-400 italic">Report ready for viewing</p>
                  </div>
                )}
                
                <div className="flex justify-between items-center mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-medium text-slate-400 tracking-wider">ID: {doc.batch_id || doc.id.slice(0, 8)}</span>
                  {doc.status === 'failed' ? (
                    <button 
                      onClick={() => navigate('/upload')}
                      className="text-sm font-semibold text-error hover:text-red-600 transition-colors flex items-center"
                    >
                      Retry Upload <RefreshCw className="w-3.5 h-3.5 ml-1" />
                    </button>
                  ) : doc.status === 'processing' ? (
                    <button 
                      onClick={() => navigate(`/monitor/${doc.id}`)}
                      className="text-sm font-semibold text-primary dark:text-primary-dark hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center"
                    >
                      Monitor <span className="ml-1">→</span>
                    </button>
                  ) : (
                    <button 
                      onClick={() => navigate(`/report/${doc.id}`)}
                      className="text-sm font-semibold text-primary dark:text-primary-dark hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center group-hover:-translate-x-1 duration-200"
                    >
                      View Report <span className="ml-1 transition-transform group-hover:translate-x-1">→</span>
                    </button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<FileText className="w-8 h-8" />}
            title="No reports found"
            subtitle="Get started by uploading your first document for processing."
            actionLabel="Upload Document"
            onAction={() => navigate('/upload')}
          />
        )}
      </main>
    </div>
  );
};

export default Dashboard;
