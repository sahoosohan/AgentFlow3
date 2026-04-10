// src/App.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UploadPage from './pages/UploadPage';
import WorkflowMonitor from './pages/WorkflowMonitor';
import ReportViewer from './pages/ReportViewer';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';

const App = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">Loading...</div>;
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      
      {/* Protected Routes */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/upload" element={<ProtectedRoute><UploadPage /></ProtectedRoute>} />
      <Route path="/monitor" element={<ProtectedRoute><WorkflowMonitor /></ProtectedRoute>} />
      <Route path="/monitor/:jobId" element={<ProtectedRoute><WorkflowMonitor /></ProtectedRoute>} />
      <Route path="/report" element={<ProtectedRoute><ReportViewer /></ProtectedRoute>} />
      <Route path="/report/:reportId" element={<ProtectedRoute><ReportViewer /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default App;
