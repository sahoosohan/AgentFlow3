// src/pages/Login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Input from '../components/Input';
import Button from '../components/Button';
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login, signup, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!isLogin && password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(email, password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (err) {
      setError(err.message || 'Google sign-in failed.');
    }
  };

  return (
    <div className="min-h-screen flex text-slate-900 bg-background-light dark:bg-background-dark dark:text-slate-100 transition-colors">
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-indigo-700 opacity-90"></div>
          {/* Subtle background patterns */}
          <div className="absolute top-0 left-0 w-full h-full opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
        </div>
        
        <div className="relative z-10 p-16 max-w-2xl text-white">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-white text-primary rounded-lg flex items-center justify-center font-bold text-2xl">
              AF
            </div>
            <span className="font-bold text-2xl tracking-tight">AgentFlow</span>
          </div>
          
          <h1 className="text-5xl font-bold leading-tight mb-6 animate-[fadeInUp_0.5s_ease-out]">
            Transform<br />Documents into<br />Insights
          </h1>
          
          <p className="text-indigo-100 text-lg mb-12 max-w-md animate-[fadeInUp_0.5s_ease-out]" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
            Experience the next generation of AI-driven document processing. Automate workflows with unprecedented accuracy.
          </p>
          
          <div className="space-y-6 animate-[fadeInUp_0.5s_ease-out]" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
            {[
              "Automated Data Extraction",
              "Intelligent Workflow Logic",
              "Real-time Performance Monitoring"
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center gap-4">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white text-xs">
                  ✓
                </div>
                <span className="text-indigo-50 font-medium">{feature}</span>
              </div>
            ))}
          </div>
          
          <div className="absolute bottom-12 left-16 flex items-center gap-4 animate-[fadeInUp_0.5s_ease-out]" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
            <div className="flex -space-x-3">
              {[1, 2, 3].map(i => (
                <div key={i} className={`w-10 h-10 rounded-full border-2 border-primary bg-indigo-300 flex items-center justify-center overflow-hidden`}>
                   <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt={`User ${i}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
            <p className="text-sm text-indigo-200">Trusted by 2,000+ AI teams worldwide</p>
          </div>
        </div>
      </div>
      
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-card-dark rounded-2xl shadow-xl w-full p-8 border border-slate-100 dark:border-slate-800 relative z-10 animate-[fadeInUp_0.5s_ease-out]">
            
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                {isLogin ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p className="text-slate-500 dark:text-slate-400">
                {isLogin ? 'Please enter your details to sign in.' : 'Enter your details to get started.'}
              </p>
            </div>
            
            <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg mb-8">
              <button
                type="button"
                onClick={() => { setIsLogin(true); setError(''); }}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${isLogin ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => { setIsLogin(false); setError(''); }}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${!isLogin ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
              >
                Sign Up
              </button>
            </div>
            
            {error && (
              <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-error shrink-0 mt-0.5" />
                <p className="text-sm text-error/90 font-medium">{error}</p>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="EMAIL ADDRESS"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail className="w-5 h-5" />}
              />
              
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    PASSWORD
                  </label>
                  {isLogin && (
                    <a href="#" className="text-xs font-semibold text-primary hover:text-indigo-600 dark:hover:text-primary-dark transition-colors">
                      Forgot password?
                    </a>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-lg sm:text-sm bg-white dark:bg-background-dark border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary pl-10 pr-10 py-2.5 placeholder-slate-400 dark:placeholder-slate-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              
              <Button type="submit" fullWidth loading={loading} className="mt-2 py-3 text-sm">
                {isLogin ? 'Sign In' : 'Create Account'}
              </Button>
            </form>
            
            <div className="mt-8 flex items-center justify-center">
              <div className="border-t border-slate-200 dark:border-slate-800 flex-grow"></div>
              <span className="px-3 text-xs text-slate-500 uppercase tracking-wider font-semibold">Or continue with</span>
              <div className="border-t border-slate-200 dark:border-slate-800 flex-grow"></div>
            </div>
            
            <div className="mt-6">
              <Button variant="outlined" fullWidth className="py-2.5" type="button" onClick={handleGoogleLogin}>
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span className="text-slate-700 dark:text-slate-300 font-semibold text-sm">Google Account</span>
              </Button>
            </div>
            
            <p className="mt-8 text-center text-sm text-slate-600 dark:text-slate-400">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="font-semibold text-primary hover:text-indigo-600 dark:hover:text-primary-dark transition-colors">
                {isLogin ? "Create Account" : "Sign In"}
              </button>
            </p>
          </div>
          
          <div className="mt-12 flex justify-center space-x-6 text-xs font-semibold tracking-wider text-slate-500 uppercase">
             <a href="#" className="hover:text-slate-800 dark:hover:text-slate-300">Privacy Policy</a>
             <a href="#" className="hover:text-slate-800 dark:hover:text-slate-300">Terms of Service</a>
             <a href="#" className="hover:text-slate-800 dark:hover:text-slate-300">Help Center</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
