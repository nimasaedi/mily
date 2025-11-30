import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { User, UserRole, Transaction, TransactionType, TransactionStatus, SiteSettings } from './types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

// --- API CONFIGURATION ---
// Updated to the new root path provided
const API_BASE_URL = "https://req.rider2.ir";

// --- Service Helpers ---
const getAuthHeaders = () => {
  const token = localStorage.getItem('minrely_token');
  return token ? { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}` 
  } : { 
    'Content-Type': 'application/json' 
  };
};

// --- Mock Data for UI Visuals (Charts/Winners) ---
// These remain mocked as they are usually public data or complex crons
const PREDICTION_DATA = [
  { name: 'Jan', price: 4000 },
  { name: 'Feb', price: 3000 },
  { name: 'Mar', price: 5000 },
  { name: 'Apr', price: 4780 },
  { name: 'May', price: 5890 },
  { name: 'Jun', price: 6390 },
  { name: 'Jul', price: 7490 },
];

const WINNERS = [
  { name: 'Alex M.', amount: '$5,200', time: '2 mins ago' },
  { name: 'Sarah K.', amount: '$1,450', time: '5 mins ago' },
  { name: 'John D.', amount: '$8,900', time: '12 mins ago' },
  { name: 'Mike R.', amount: '$340', time: '15 mins ago' },
];

// --- Components ---

const Navbar = ({ isLoggedIn, logout }: { isLoggedIn: boolean, logout: () => void }) => (
  <nav className="bg-surface/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-200">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between h-16 items-center">
        <div className="flex-shrink-0 flex items-center">
          <span className="text-2xl font-bold text-primary tracking-tighter">MinRely</span>
        </div>
        <div className="hidden md:flex space-x-8 items-center">
          <Link to="/" className="text-gray-600 hover:text-primary transition">Home</Link>
          <a href="#prediction" className="text-gray-600 hover:text-primary transition">Prediction</a>
          <a href="#winners" className="text-gray-600 hover:text-primary transition">Winners</a>
          <a href="#faq" className="text-gray-600 hover:text-primary transition">FAQ</a>
        </div>
        <div className="flex items-center space-x-4">
          {isLoggedIn ? (
            <>
              <Link to="/dashboard" className="px-4 py-2 rounded-full bg-primary/10 text-primary font-medium hover:bg-primary/20 transition">Dashboard</Link>
              <button onClick={logout} className="text-gray-500 hover:text-red-500"><i className="fas fa-sign-out-alt"></i></button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-gray-600 hover:text-primary font-medium">Log In</Link>
              <Link to="/register" className="px-4 py-2 rounded-full bg-primary text-white shadow-lg shadow-primary/30 hover:bg-primary/90 transition">Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </div>
  </nav>
);

const Footer = ({ apiStatus }: { apiStatus: 'checking' | 'online' | 'offline' | 'html_error' }) => (
  <footer className="bg-white border-t border-gray-200 py-12">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
      <div>
        <h3 className="text-xl font-bold text-primary mb-4">MinRely</h3>
        <p className="text-gray-500 text-sm">The most reliable platform for crypto monitoring and asset management. Secure, fast, and transparent.</p>
        <div className="mt-4 flex flex-col space-y-1 text-xs">
            <span className="text-gray-400">System Status:</span>
            {apiStatus === 'checking' && <span className="text-yellow-500 flex items-center"><span className="w-2 h-2 bg-yellow-500 rounded-full mr-1 animate-pulse"></span> Connecting...</span>}
            {apiStatus === 'online' && <span className="text-green-500 flex items-center"><span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span> Online</span>}
            {apiStatus === 'offline' && <span className="text-red-500 flex items-center"><span className="w-2 h-2 bg-red-500 rounded-full mr-1"></span> Offline (Check Node.js/CORS)</span>}
            {apiStatus === 'html_error' && <span className="text-orange-600 flex items-center font-bold"><span className="w-2 h-2 bg-orange-600 rounded-full mr-1"></span> Error: Backend Not Started (Index of /)</span>}
        </div>
      </div>
      <div>
        <h4 className="font-semibold text-gray-800 mb-4">Platform</h4>
        <ul className="space-y-2 text-sm text-gray-500">
          <li><a href="#" className="hover:text-primary">Markets</a></li>
          <li><a href="#" className="hover:text-primary">Exchange</a></li>
          <li><a href="#" className="hover:text-primary">Earn</a></li>
        </ul>
      </div>
      <div>
        <h4 className="font-semibold text-gray-800 mb-4">Support</h4>
        <ul className="space-y-2 text-sm text-gray-500">
          <li><a href="#" className="hover:text-primary">Help Center</a></li>
          <li><a href="#" className="hover:text-primary">API Documentation</a></li>
          <li><a href="#" className="hover:text-primary">Fees</a></li>
        </ul>
      </div>
      <div>
        <h4 className="font-semibold text-gray-800 mb-4">Connect</h4>
        <div className="flex space-x-4 text-gray-400">
          <a href="#" className="hover:text-primary text-xl"><i className="fab fa-twitter"></i></a>
          <a href="#" className="hover:text-primary text-xl"><i className="fab fa-telegram"></i></a>
          <a href="#" className="hover:text-primary text-xl"><i className="fab fa-discord"></i></a>
        </div>
      </div>
    </div>
    <div className="max-w-7xl mx-auto px-4 mt-8 pt-8 border-t border-gray-100 text-center text-gray-400 text-sm">
      &copy; 2024 MinRely. All rights reserved.
    </div>
  </footer>
);

// --- Pages ---

const HomePage = () => {
  return (
    <div className="bg-bgLight min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight mb-6">
              Invest in the <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Future</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10">
              Real-time analytics, secure wallets, and accurate market predictions. Join thousands of users on MinRely today.
            </p>
            <div className="flex justify-center gap-4">
              <Link to="/register" className="px-8 py-4 bg-primary text-white rounded-full font-bold shadow-xl shadow-primary/25 hover:scale-105 transition transform">Get Started</Link>
              <Link to="/login" className="px-8 py-4 bg-white text-gray-700 border border-gray-200 rounded-full font-bold hover:bg-gray-50 transition">Log In</Link>
            </div>
          </motion.div>
        </div>
        {/* Abstract Background Element */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-full h-full pointer-events-none">
           <div className="absolute top-20 left-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
           <div className="absolute top-20 right-10 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
           <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>
      </section>

      {/* Price Prediction */}
      <section id="prediction" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900">Market Prediction</h2>
            <p className="text-gray-500 mt-2">AI-driven forecasts for major assets</p>
          </div>
          <div className="bg-white rounded-3xl p-6 shadow-2xl border border-gray-100 h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={PREDICTION_DATA}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                <Area type="monotone" dataKey="price" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorPrice)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Live Winners */}
      <section id="winners" className="py-20 bg-slate-900 text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 mb-10 text-center">
            <h2 className="text-3xl font-bold text-white">Live Winners</h2>
        </div>
        <div className="flex space-x-8 animate-scroll whitespace-nowrap">
           {[...WINNERS, ...WINNERS, ...WINNERS].map((winner, idx) => (
             <div key={idx} className="inline-block bg-slate-800 rounded-xl p-4 min-w-[200px] border border-slate-700">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-black font-bold">
                   <i className="fas fa-trophy"></i>
                 </div>
                 <div>
                   <p className="font-bold text-lg text-emerald-400">{winner.amount}</p>
                   <p className="text-xs text-slate-400">{winner.name} • {winner.time}</p>
                 </div>
               </div>
             </div>
           ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 bg-bgLight">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              { q: "How do I deposit funds?", a: "Go to your dashboard wallet section, copy the admin wallet address, and send the amount." },
              { q: "Is MinRely secure?", a: "Yes, we use industry-standard encryption and cold storage for the majority of funds." },
              { q: "What are the fees?", a: "We charge a flat 0.1% fee on withdrawals. Deposits are free." }
            ].map((item, idx) => (
              <div key={idx} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h3 className="font-semibold text-lg mb-2 text-slate-800">{item.q}</h3>
                <p className="text-gray-600">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

const AuthPage = ({ type, onLogin }: { type: 'login' | 'register', onLogin: (user: User) => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referral, setReferral] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const endpoint = type === 'login' ? '/api/login' : '/api/register';
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, referralCode: referral })
        });

        // Check content type to prevent parsing HTML error pages as JSON
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            const text = await response.text();
            if (text.includes("Index of /")) {
                throw new Error("Backend server is not running (Index of / detected). Check server.");
            }
            throw new Error("Server returned an invalid response (not JSON). The backend might be down.");
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || data.error || 'Authentication failed');
        }

        if (type === 'login') {
            localStorage.setItem('minrely_token', data.token);
            onLogin(data.user);
        } else {
            // After register, auto login or ask user to login
            alert('Registration successful! Please log in.');
            window.location.hash = '#/login';
        }

    } catch (err: any) {
        console.error("Auth Error:", err);
        setError(err.message || "Network Error");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-900">{type === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
          <p className="text-gray-500 mt-2">Enter your details to access your account</p>
        </div>
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm text-center font-medium">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
              placeholder="••••••••"
            />
          </div>
          {type === 'register' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Referral Code (Optional)</label>
              <input 
                type="text" 
                value={referral}
                onChange={(e) => setReferral(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                placeholder="REF123"
              />
            </div>
          )}
          <button 
            type="submit" 
            disabled={loading}
            className={`w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition shadow-lg shadow-indigo-500/30 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Processing...' : (type === 'login' ? 'Sign In' : 'Sign Up')}
          </button>
        </form>
        <div className="mt-6 text-center text-sm text-gray-500">
          {type === 'login' ? (
            <p>Don't have an account? <Link to="/register" className="text-primary hover:underline">Sign up</Link></p>
          ) : (
            <p>Already have an account? <Link to="/login" className="text-primary hover:underline">Log in</Link></p>
          )}
        </div>
      </div>
    </div>
  );
};

const DashboardLayout = ({ children, title, user, logout }: { children: React.ReactNode, title: string, user: User, logout: () => void }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const menuItems = user.role === UserRole.ADMIN ? [
    { icon: 'fas fa-chart-pie', label: 'Overview', path: '/admin' },
    { icon: 'fas fa-users', label: 'Users', path: '/admin/users' },
    { icon: 'fas fa-exchange-alt', label: 'Transactions', path: '/admin/transactions' },
    { icon: 'fas fa-cogs', label: 'Settings', path: '/admin/settings' },
  ] : [
    { icon: 'fas fa-home', label: 'Dashboard', path: '/dashboard' },
    { icon: 'fas fa-wallet', label: 'Wallet', path: '/dashboard/wallet' },
    { icon: 'fas fa-history', label: 'History', path: '/dashboard/history' },
    { icon: 'fas fa-user', label: 'Profile', path: '/dashboard/profile' },
  ];

  return (
    <div className="flex h-screen bg-bgLight">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black bg-opacity-50 md:hidden" onClick={() => setSidebarOpen(false)}></div>
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-center h-16 border-b border-gray-200">
          <Link to="/" className="text-2xl font-bold text-primary">MinRely</Link>
        </div>
        <nav className="mt-6 px-4 space-y-1">
          {menuItems.map((item) => (
            <Link 
              key={item.path} 
              to={item.path}
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${location.pathname === item.path ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <i className={`${item.icon} w-6`}></i>
              {item.label}
            </Link>
          ))}
          <button onClick={logout} className="w-full flex items-center px-4 py-3 text-sm font-medium text-red-500 rounded-lg hover:bg-red-50 transition-colors mt-8">
            <i className="fas fa-sign-out-alt w-6"></i>
            Logout
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between h-16 px-6 bg-white border-b border-gray-200">
          <button className="md:hidden text-gray-500" onClick={() => setSidebarOpen(true)}>
            <i className="fas fa-bars text-xl"></i>
          </button>
          <h1 className="text-xl font-semibold text-slate-800">{title}</h1>
          <div className="flex items-center space-x-4">
             <div className="text-right hidden sm:block">
               <p className="text-sm font-medium text-slate-900">{user.email}</p>
               <p className="text-xs text-gray-500 uppercase">{user.role}</p>
             </div>
             <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
               <i className="fas fa-user"></i>
             </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

// --- User Dashboard Components ---

const UserDashboardHome = ({ user }: { user: User }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-gradient-to-br from-primary to-indigo-700 rounded-2xl p-6 text-white shadow-lg">
        <p className="text-indigo-200 text-sm font-medium mb-1">Total Balance</p>
        <h3 className="text-3xl font-bold">${user.balance ? Number(user.balance).toLocaleString() : '0.00'}</h3>
        <div className="mt-4 flex space-x-2">
          <Link to="/dashboard/wallet" className="flex-1 bg-white/20 hover:bg-white/30 text-white py-2 rounded-lg text-sm font-medium text-center backdrop-blur-sm transition">Deposit</Link>
          <Link to="/dashboard/wallet" className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg text-sm font-medium text-center backdrop-blur-sm transition">Withdraw</Link>
        </div>
      </div>
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col justify-center">
        <p className="text-gray-500 text-sm font-medium">Referral Code</p>
        <h3 className="text-xl font-bold text-slate-800">{user.referralCode || 'N/A'}</h3>
        <p className="text-green-500 text-xs mt-1 flex items-center">Share with friends</p>
      </div>
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col justify-center">
        <p className="text-gray-500 text-sm font-medium">Status</p>
        <h3 className="text-xl font-bold text-slate-800">Active</h3>
        <p className="text-green-500 text-xs mt-1 flex items-center"><i className="fas fa-check-circle mr-1"></i> Verified</p>
      </div>
    </div>

    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
      <h3 className="text-lg font-bold text-slate-800 mb-4">Welcome back, {user.email}</h3>
      <p className="text-gray-600">Head over to the Wallet section to manage your funds or check the History tab for past transactions.</p>
    </div>
  </div>
);

const WalletPage = ({ user }: { user: User }) => {
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState('');
  const [adminWallet, setAdminWallet] = useState('Loading...'); 
  const [userWithdrawWallet, setUserWithdrawWallet] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch admin wallet settings on mount
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/settings`)
      .then(res => {
        const type = res.headers.get("content-type");
        if (!type || !type.includes("application/json")) throw new Error("Backend not ready");
        return res.json();
      })
      .then(data => {
        if(data && data.admin_wallet) setAdminWallet(data.admin_wallet);
        else setAdminWallet('Contact Support');
      })
      .catch(err => {
          console.error("Failed to fetch settings", err);
          setAdminWallet('Network Error / Backend Down');
      });
  }, []);

  const handleTransaction = async () => {
      if(!amount) return alert('Please enter an amount');
      
      setLoading(true);
      try {
          const res = await fetch(`${API_BASE_URL}/api/transaction`, {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify({
                  type: activeTab,
                  amount: parseFloat(amount),
                  address: activeTab === 'withdraw' ? userWithdrawWallet : adminWallet
              })
          });
          const data = await res.json();
          if(res.ok) {
              alert('Transaction request submitted successfully!');
              setAmount('');
          } else {
              alert(data.error || 'Transaction failed');
          }
      } catch (err) {
          alert('Network error');
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white rounded-2xl p-1 border border-gray-200 shadow-sm inline-flex">
        <button 
          onClick={() => setActiveTab('deposit')} 
          className={`px-6 py-2 rounded-xl text-sm font-medium transition ${activeTab === 'deposit' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:text-gray-900'}`}
        >
          Deposit Funds
        </button>
        <button 
          onClick={() => setActiveTab('withdraw')} 
          className={`px-6 py-2 rounded-xl text-sm font-medium transition ${activeTab === 'withdraw' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:text-gray-900'}`}
        >
          Withdraw Funds
        </button>
      </div>

      <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
        {activeTab === 'deposit' ? (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-slate-900">Deposit USDT (TRC20)</h3>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-blue-800 text-sm">
              <i className="fas fa-info-circle mr-2"></i> Send only USDT (TRC20) to this address. Sending other coins may result in permanent loss.
            </div>
            
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-2">Admin Wallet Address</label>
               <div className="flex">
                 <input 
                    type="text" 
                    readOnly 
                    value={adminWallet} 
                    className="flex-1 bg-gray-50 px-4 py-3 rounded-l-lg border border-gray-300 text-gray-500 outline-none" 
                  />
                 <button 
                    onClick={() => navigator.clipboard.writeText(adminWallet)}
                    className="bg-gray-100 px-6 py-3 rounded-r-lg border border-l-0 border-gray-300 text-gray-600 hover:bg-gray-200 font-medium"
                 >
                   Copy
                 </button>
               </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Amount Deposited</label>
              <input 
                type="number" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                placeholder="0.00"
              />
            </div>
            <button 
                onClick={handleTransaction}
                disabled={loading}
                className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition shadow-lg shadow-indigo-500/30 disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Deposit Request'}
            </button>
          </div>
        ) : (
           <div className="space-y-6">
            <h3 className="text-xl font-bold text-slate-900">Withdraw Funds</h3>
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border border-gray-200">
               <span className="text-gray-500">Available Balance</span>
               <span className="text-xl font-bold text-slate-800">${user.balance ? Number(user.balance).toLocaleString() : '0.00'}</span>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Withdraw Amount</label>
              <input 
                type="number" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                placeholder="0.00"
              />
            </div>
             <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Your Wallet Address (TRC20)</label>
              <input 
                type="text" 
                value={userWithdrawWallet}
                onChange={(e) => setUserWithdrawWallet(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                placeholder="Enter your wallet address"
              />
            </div>
            <button 
                onClick={handleTransaction}
                disabled={loading}
                className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition shadow-lg shadow-indigo-500/30 disabled:opacity-50"
            >
               {loading ? 'Processing...' : 'Request Withdrawal'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Admin Panel Components ---

const AdminDashboard = () => {
    const [stats, setStats] = useState({ users: 0, pending: 0, pool: 0 });

    useEffect(() => {
        // In a real app, you would make an API call for dashboard stats
        // Currently mostly visual, but lets fetch users count at least
        fetch(`${API_BASE_URL}/api/admin/users`, { headers: getAuthHeaders() })
            .then(res => res.json())
            .then(data => {
                if(Array.isArray(data)) {
                    setStats(prev => ({ ...prev, users: data.length }));
                }
            })
            .catch(console.error);
            
        fetch(`${API_BASE_URL}/api/admin/transactions`, { headers: getAuthHeaders() })
            .then(res => res.json())
            .then(data => {
                 if(Array.isArray(data)) {
                    setStats(prev => ({ ...prev, pending: data.length }));
                 }
            })
            .catch(console.error);

    }, []);

    return (
    <div className="space-y-6">
        <h2 className="text-2xl font-bold text-slate-800">Admin Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             {/* Stats Cards */}
             <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                 <p className="text-gray-500 text-sm">Total Users</p>
                 <h3 className="text-2xl font-bold text-slate-800">{stats.users}</h3>
             </div>
             <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                 <p className="text-gray-500 text-sm">Pending Transactions</p>
                 <h3 className="text-2xl font-bold text-yellow-600">{stats.pending}</h3>
             </div>
             <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                 <p className="text-gray-500 text-sm">System Status</p>
                 <h3 className="text-2xl font-bold text-green-600">Online</h3>
             </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
           <p className="text-gray-500">Use the sidebar to manage Users, Approve Transactions, or change Wallet settings.</p>
        </div>
    </div>
    );
};

const AdminUsers = () => {
    const [users, setUsers] = useState<any[]>([]);
    
    useEffect(() => {
        fetch(`${API_BASE_URL}/api/admin/users`, { headers: getAuthHeaders() })
            .then(res => res.json())
            .then(data => {
                if(Array.isArray(data)) setUsers(data);
            });
    }, []);

    return (
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">User Management</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
                <thead>
                <tr className="border-b border-gray-100">
                    <th className="pb-3">ID</th>
                    <th className="pb-3">Email</th>
                    <th className="pb-3">Balance</th>
                    <th className="pb-3">Role</th>
                    <th className="pb-3">Status</th>
                </tr>
                </thead>
                <tbody>
                {users.map(u => (
                    <tr key={u.id} className="border-b border-gray-50">
                        <td className="py-3">{u.id}</td>
                        <td className="py-3">{u.email}</td>
                        <td className="py-3">${u.balance}</td>
                        <td className="py-3">{u.role}</td>
                        <td className="py-3"><span className={`px-2 py-1 rounded text-xs ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                    </tr>
                ))}
                </tbody>
            </table>
          </div>
        </div>
    );
}

const AdminTransactions = () => {
    const [txs, setTxs] = useState<any[]>([]);

    const fetchTxs = () => {
        fetch(`${API_BASE_URL}/api/admin/transactions`, { headers: getAuthHeaders() })
            .then(res => res.json())
            .then(data => {
                if(Array.isArray(data)) setTxs(data);
            });
    };
    
    useEffect(fetchTxs, []);

    const handleUpdate = async (id: number, status: 'approved' | 'rejected', userId: number, amount: number, type: string) => {
        const res = await fetch(`${API_BASE_URL}/api/admin/transaction/update`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ transactionId: id, status, userId, amount, type })
        });
        if(res.ok) fetchTxs();
        else alert('Error updating transaction');
    };

    return (
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Pending Transactions</h3>
             <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
                <thead>
                <tr className="border-b border-gray-100">
                    <th className="pb-3">User</th>
                    <th className="pb-3">Type</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3">Address</th>
                    <th className="pb-3 text-right">Actions</th>
                </tr>
                </thead>
                <tbody>
                {txs.length === 0 && <tr><td colSpan={5} className="py-4 text-center">No pending transactions</td></tr>}
                {txs.map(t => (
                    <tr key={t.id} className="border-b border-gray-50">
                        <td className="py-3">{t.email}</td>
                        <td className="py-3 uppercase">{t.type}</td>
                        <td className="py-3 font-bold">${t.amount}</td>
                        <td className="py-3 text-xs font-mono">{t.address}</td>
                        <td className="py-3 text-right space-x-2">
                            <button onClick={() => handleUpdate(t.id, 'approved', t.user_id, t.amount, t.type)} className="text-green-600 font-bold text-xs border border-green-200 px-2 py-1 rounded hover:bg-green-50">Approve</button>
                            <button onClick={() => handleUpdate(t.id, 'rejected', t.user_id, t.amount, t.type)} className="text-red-600 font-bold text-xs border border-red-200 px-2 py-1 rounded hover:bg-red-50">Reject</button>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
            </div>
        </div>
    );
}

const AdminSettings = () => {
    const [wallet, setWallet] = useState('');
    
    useEffect(() => {
        fetch(`${API_BASE_URL}/api/settings`)
          .then(res => res.json())
          .then(data => {
            if(data && data.admin_wallet) setWallet(data.admin_wallet);
          });
    }, []);

    const save = async () => {
        const res = await fetch(`${API_BASE_URL}/api/admin/settings`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ admin_wallet: wallet })
        });
        if(res.ok) alert('Settings Saved');
    }
    
    return (
        <div className="max-w-2xl">
            <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
                <h3 className="text-xl font-bold text-slate-800 mb-6">Platform Settings</h3>
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">System Wallet Address (For Deposits)</label>
                        <input 
                            type="text" 
                            value={wallet}
                            onChange={(e) => setWallet(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary outline-none"
                        />
                        <p className="text-xs text-gray-500 mt-2">This address will be shown to users on the deposit page.</p>
                    </div>
                    <button onClick={save} className="bg-primary text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition">
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}

// --- Main App Logic ---

// Wrapper Components to fix TS "missing children" error when using DashboardLayout directly in Route element
const UserDashboardWrapper = ({ user, logout }: { user: User, logout: () => void }) => (
  <DashboardLayout title="User Dashboard" user={user} logout={logout}>
     <Routes>
        <Route index element={<UserDashboardHome user={user} />} />
        <Route path="wallet" element={<WalletPage user={user} />} />
        <Route path="history" element={<div className="p-4 bg-white rounded shadow">History is available in API but requires UI implementation</div>} />
        <Route path="profile" element={<div className="p-4 bg-white rounded shadow">Profile Settings</div>} />
     </Routes>
  </DashboardLayout>
);

const AdminDashboardWrapper = ({ user, logout }: { user: User, logout: () => void }) => (
  <DashboardLayout title="Admin Control Panel" user={user} logout={logout}>
     <Routes>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="transactions" element={<AdminTransactions />} />
        <Route path="settings" element={<AdminSettings />} />
     </Routes>
  </DashboardLayout>
);

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline' | 'html_error'>('checking');

  const fetchUser = async (token: string) => {
      try {
          const res = await fetch(`${API_BASE_URL}/api/user`, {
              headers: { 'Authorization': `Bearer ${token}` }
          });
          const type = res.headers.get("content-type");
          if(res.ok && type && type.includes("application/json")) {
              const userData = await res.json();
              setUser(userData);
          } else {
              localStorage.removeItem('minrely_token');
          }
      } catch(e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  const checkApi = async () => {
    console.log(`Connecting to backend at: ${API_BASE_URL}...`);
    try {
      const res = await fetch(`${API_BASE_URL}/`);
      const contentType = res.headers.get("content-type");
      
      // If server returns HTML instead of JSON, it's likely showing "Index of /"
      if (contentType && !contentType.includes("application/json")) {
         const text = await res.text();
         if(text.includes("Index of")) {
             console.error("❌ API Error: Server is showing directory listing instead of running the app.");
             setApiStatus('html_error');
             return;
         }
      }

      if(res.ok) {
        if (contentType && contentType.includes("application/json")) {
            console.log("✅ API Connected Successfully!");
            setApiStatus('online');
        } else {
            console.error("❌ API Connected but returned unknown HTML.");
            setApiStatus('html_error');
        }
      } else {
        console.error("❌ API Connected but returned error:", res.status);
        setApiStatus('offline');
      }
    } catch(e) {
       console.error("❌ API Connection Failed (Network Error / CORS):", e);
       setApiStatus('offline');
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('minrely_token');
    
    // Check API Health
    checkApi();

    if (token) {
      fetchUser(token);
    } else {
        setLoading(false);
    }
  }, []);

  const handleLogin = (userData: User) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('minrely_token');
    window.location.hash = '#/';
  };

  if(loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;

  return (
    <HashRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={
            <>
                <Navbar isLoggedIn={!!user} logout={handleLogout} />
                <HomePage />
                <Footer apiStatus={apiStatus} />
            </>
        } />
        
        <Route path="/login" element={
            user ? <Navigate to="/dashboard" /> : <AuthPage type="login" onLogin={handleLogin} />
        } />
        
        <Route path="/register" element={
            user ? <Navigate to="/dashboard" /> : <AuthPage type="register" onLogin={handleLogin} />
        } />

        {/* Protected Routes */}
        <Route path="/dashboard/*" element={
          user ? (
             user.role === UserRole.ADMIN ? <Navigate to="/admin" /> : (
                <UserDashboardWrapper user={user} logout={handleLogout} />
             )
          ) : (
            <Navigate to="/login" />
          )
        } />

        {/* Admin Routes */}
        <Route path="/admin/*" element={
           user && user.role === UserRole.ADMIN ? (
              <AdminDashboardWrapper user={user} logout={handleLogout} />
           ) : (
               <Navigate to="/dashboard" />
           )
        } />

      </Routes>
    </HashRouter>
  );
}

export default App;