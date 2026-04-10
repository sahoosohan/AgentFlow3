// src/pages/Profile.jsx
import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Input from '../components/Input';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { User, Shield, Bell, CreditCard, Key, Lock, CheckCircle2, AlertTriangle, FileText, Camera } from 'lucide-react';

const Profile = () => {
  const { user } = useAuth();
  
  // Profile Form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [profileLoaded, setProfileLoaded] = useState(false);
  
  // Notifications & UI State
  const [notifications, setNotifications] = useState({ email: true, alerts: true });
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Load profile from Supabase
  useEffect(() => {
    if (!user) return;

    setEmail(user.email || '');

    const loadProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (data) {
        setName(data.full_name || '');
        setRole(data.professional_role || '');
        setBio(data.bio || '');
        setAvatarUrl(data.avatar_url || '');
      }
      setProfileLoaded(true);
    };

    loadProfile();
  }, [user]);

  // Save profile to Supabase
  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: name,
          professional_role: role,
          bio: bio,
          avatar_url: avatarUrl,
        });

      if (error) throw error;

      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      console.error('Failed to save profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Avatar upload
  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('documents')
        .getPublicUrl(path);

      setAvatarUrl(data.publicUrl);
    } catch (err) {
      console.error('Avatar upload failed:', err);
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-sans pt-16">
      <Navbar />
      
      {/* Toast */}
      <div className={`fixed top-20 right-8 z-[110] transition-all duration-300 transform ${showToast ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0 pointer-events-none'}`}>
        <div className="bg-success text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 font-medium">
          <CheckCircle2 className="w-5 h-5" />
          Changes saved successfully
        </div>
      </div>
      
      {/* Delete Modal */}
      <Modal 
        isOpen={deleteModalOpen} 
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Account"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>Cancel</Button>
            <Button variant="danger" icon={<AlertTriangle className="w-4 h-4" />}>Yes, delete my account</Button>
          </>
        }
      >
        <div className="text-slate-600 dark:text-slate-300">
          <p className="mb-4">Are you absolutely sure you want to delete your account?</p>
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-lg text-sm text-error mb-4">
            <span className="font-bold">Warning:</span> This action cannot be undone. This will permanently delete your account, reports, and remove your data from our servers.
          </div>
          <p>Please type <strong className="font-mono text-slate-800 dark:text-slate-200 select-all">DELETE</strong> to confirm.</p>
          <Input className="mt-3" placeholder="DELETE" />
        </div>
      </Modal>

      <div className="max-w-7xl mx-auto flex flex-col md:flex-row pb-20">
        
        {/* Left Sidebar */}
        <aside className="w-full md:w-64 shrink-0 md:min-h-[calc(100vh-64px)] p-6 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-card-dark">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white">
              <SettingsIcon />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white leading-tight">Settings</h2>
              <p className="text-xs text-slate-500">Manage your environment</p>
            </div>
          </div>
          
          <nav className="space-y-1">
            {[
              { id: 'profile', icon: <User className="w-5 h-5" />, label: 'Profile' },
              { id: 'security', icon: <Shield className="w-5 h-5" />, label: 'Security' },
              { id: 'notifications', icon: <Bell className="w-5 h-5" />, label: 'Notifications' },
              { id: 'billing', icon: <CreditCard className="w-5 h-5" />, label: 'Billing' },
              { id: 'api', icon: <Key className="w-5 h-5" />, label: 'API Keys' },
            ].map(item => (
              <a key={item.id} href="#" className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                item.id === 'profile' 
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-primary dark:text-primary-dark' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}>
                {item.icon}
                {item.label}
              </a>
            ))}
          </nav>
          
          <div className="mt-auto pt-10">
            <nav className="space-y-1">
              <a href="#" className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
                 <FileText className="w-4 h-4" /> Documentation
              </a>
              <a href="#" className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> Support
              </a>
            </nav>
          </div>
        </aside>
        
        {/* Main Content */}
        <main className="flex-1 p-6 md:p-10 lg:p-14 animate-[fadeInUp_0.4s_ease-out]">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
            <div>
              <span className="text-[10px] font-bold text-primary dark:text-primary-dark uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded inline-block mb-3">Account Ecosystem</span>
              <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                Profile & <span className="text-primary italic font-serif">Workspace</span>
              </h1>
            </div>
            <div className="flex gap-3 shrink-0">
              <Button variant="ghost" className="bg-white dark:bg-card-dark border border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50">Discard</Button>
              <Button variant="primary" onClick={handleSave} loading={isSaving} className="shadow-lg shadow-primary/20 bg-[#6366F1] hover:bg-indigo-600">Save Changes</Button>
            </div>
          </div>
          
          <div className="max-w-3xl space-y-8">
            
            {/* Personal Identity Box */}
            <div className="bg-white dark:bg-card-dark border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm relative overflow-hidden">
               <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-indigo-500 to-purple-500"></div>
               
               <div className="flex justify-between items-start mb-8">
                 <div>
                   <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Personal Identity</h3>
                   <p className="text-sm text-slate-500 dark:text-slate-400">Manage your public and private persona within the canvas.</p>
                 </div>
                 <div className="relative group">
                   <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-lg border-2 border-slate-100 dark:border-slate-800 bg-[#FCD34D] flex items-center justify-center">
                     {avatarUrl ? (
                       <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                     ) : (
                       <div className="scale-[1.8] translate-y-2">
                         <User className="w-10 h-10 text-white fill-white/20" />
                       </div>
                     )}
                   </div>
                   <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                     <Camera className="w-5 h-5 text-white" />
                     <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                   </label>
                   {uploadingAvatar && (
                     <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl">
                       <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                     </div>
                   )}
                 </div>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                 <div>
                   <Input 
                     label={<span className="text-xs font-bold tracking-wider uppercase text-slate-500">Full Name</span>}
                     value={name}
                     onChange={(e) => setName(e.target.value)}
                     className="bg-slate-50 dark:bg-slate-900/50 border-0"
                   />
                 </div>
                  <div className="relative">
                    <Input 
                      label={<span className="text-xs font-bold tracking-wider uppercase text-slate-500">Email Address</span>}
                      value={email}
                      readOnly
                      className="bg-slate-50 dark:bg-slate-900/50 border-slate-100 text-slate-600"
                    />
                    <div className="absolute right-3 bottom-2.5">
                      <Badge variant="success" className="px-2 py-1 text-[10px] bg-emerald-600 text-white border-transparent flex gap-1 items-center rounded-md font-bold tracking-tighter">
                        <CheckCircle2 className="w-3 h-3 text-white"/> VERIFIED
                      </Badge>
                    </div>
                  </div>
               </div>
               
               <div className="mb-6">
                 <Input 
                   label={<span className="text-xs font-bold tracking-wider uppercase text-slate-500">Professional Role</span>}
                   value={role}
                   onChange={(e) => setRole(e.target.value)}
                   className="bg-slate-50 dark:bg-slate-900/50 border-0"
                   placeholder="e.g. Senior Data Strategist"
                 />
               </div>
               
               <div>
                 <label className="block text-xs font-bold tracking-wider uppercase text-slate-500 mb-2">Bio</label>
                 <textarea 
                   value={bio}
                   onChange={(e) => setBio(e.target.value)}
                   rows="3"
                   placeholder="Tell us about yourself..."
                   className="w-full rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 p-4 text-sm focus:ring-2 focus:ring-primary focus:border-border-primary text-slate-900 dark:text-white transition-colors"
                 />
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Password Management */}
              <div className="bg-white dark:bg-card-dark border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-primary flex items-center justify-center">
                    <Lock className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Password Management</h3>
                </div>
                
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                  Update your password via Supabase authentication.
                </p>
                
                <Button variant="primary" fullWidth className="bg-indigo-100 text-primary hover:bg-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 dark:hover:bg-indigo-900/60 shadow-none">
                  Update Credentials
                </Button>
              </div>

              {/* 2FA Status */}
              <div className="bg-white dark:bg-card-dark border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Two-Factor Status</h3>
                </div>
                
                <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-lg p-4 mb-6 flex justify-between items-center text-emerald-700 dark:text-emerald-500 font-medium text-sm">
                  Active (Authenticator) <CheckCircle2 className="w-5 h-5" />
                </div>
                
                <Button variant="ghost" className="w-full text-error font-medium hover:bg-red-50 dark:hover:bg-red-900/20">
                  Disable Security Layer
                </Button>
              </div>

            </div>
            
            {/* Preferences */}
            <div className="bg-white dark:bg-card-dark border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm">
               <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Notification Preferences</h3>
               
               <div className="space-y-6">
                 <div className="flex items-center justify-between">
                   <div>
                     <h4 className="font-medium text-slate-900 dark:text-white text-sm">Email Notifications</h4>
                     <p className="text-xs text-slate-500">Receive daily digest and system updates.</p>
                   </div>
                   <label className="relative inline-flex items-center cursor-pointer">
                     <input type="checkbox" className="sr-only peer" checked={notifications.email} onChange={() => setNotifications(p => ({...p, email: !p.email}))} />
                     <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                   </label>
                 </div>
                 <div className="w-full h-px bg-slate-100 dark:bg-slate-800"></div>
                 <div className="flex items-center justify-between">
                   <div>
                     <h4 className="font-medium text-slate-900 dark:text-white text-sm">Report Ready Alerts</h4>
                     <p className="text-xs text-slate-500">Get notified immediately when your workflows complete.</p>
                   </div>
                   <label className="relative inline-flex items-center cursor-pointer">
                     <input type="checkbox" className="sr-only peer" checked={notifications.alerts} onChange={() => setNotifications(p => ({...p, alerts: !p.alerts}))} />
                     <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                   </label>
                 </div>
               </div>
            </div>

            {/* Danger Zone */}
            <div className="border border-red-200 dark:border-red-900/50 rounded-2xl p-8 shadow-sm bg-white dark:bg-card-dark">
               <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Danger Zone</h3>
               <p className="text-sm text-slate-500 mb-6 py-2">Once you delete your account, there is no going back. Please be certain.</p>
               
               <Button variant="outlined" className="text-error border-error hover:bg-error hover:text-white font-medium" onClick={() => setDeleteModalOpen(true)}>
                 Delete Account
               </Button>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
};

const SettingsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

export default Profile;
