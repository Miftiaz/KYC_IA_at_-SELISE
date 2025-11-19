import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Download, LogOut, User } from 'lucide-react';

const API_URL = 'http://localhost:3001/api';

interface KYCFormData {
  fullName: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  profession: string;
  address: string;
  idNumber: string;
  idType: string;
}

interface Application {
  _id: string;
  fullName: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  profession: string;
  address: string;
  idNumber: string;
  idType: string;
  status: 'pending' | 'approved' | 'rejected';
  summary: string;
  submittedAt: string;
  pdfUrl?: string;
}

const KYCSystem: React.FC = () => {
  const [view, setView] = useState<'home' | 'user' | 'admin' | 'login'>('home');
  const [token, setToken] = useState<string | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [formData, setFormData] = useState<KYCFormData>({
    fullName: '',
    dateOfBirth: '',
    email: '',
    phone: '',
    profession: '',
    address: '',
    idNumber: '',
    idType: 'passport'
  });

  const [loginData, setLoginData] = useState({ username: '', password: '' });

  useEffect(() => {
    const savedToken = localStorage.getItem('adminToken');
    if (savedToken) {
      setToken(savedToken);
      setView('admin');
    }
  }, []);

  useEffect(() => {
    if (token && view === 'admin') {
      fetchApplications();
    }
  }, [token, view]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmitKYC = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (response.ok) {
        showMessage('success', 'KYC application submitted successfully!');
        setFormData({
          fullName: '',
          dateOfBirth: '',
          email: '',
          phone: '',
          profession: '',
          address: '',
          idNumber: '',
          idType: 'passport'
        });
      } else {
        showMessage('error', data.message || 'Submission failed');
      }
    } catch (error) {
      showMessage('error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });

      const data = await response.json();
      if (response.ok) {
        setToken(data.token);
        localStorage.setItem('adminToken', data.token);
        setView('admin');
        showMessage('success', 'Login successful!');
      } else {
        showMessage('error', data.message || 'Login failed');
      }
    } catch (error) {
      showMessage('error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('adminToken');
    setView('home');
  };

  const fetchApplications = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/applications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setApplications(data);
      } else {
        showMessage('error', 'Failed to fetch applications');
      }
    } catch (error) {
      showMessage('error', 'Network error');
    }
  };

  const handleApproval = async (id: string, status: 'approved' | 'rejected') => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/admin/applications/${id}/${status}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        showMessage('success', `Application ${status} successfully!`);
        fetchApplications();
      } else {
        showMessage('error', 'Action failed');
      }
    } catch (error) {
      showMessage('error', 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/admin/applications/${id}/pdf`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kyc-${id}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        showMessage('error', 'PDF download failed');
      }
    } catch (error) {
      showMessage('error', 'Network error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 backdrop-blur-md bg-slate-900/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => setView('home')} className="flex items-center gap-3 group cursor-pointer">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center group-hover:shadow-lg group-hover:shadow-indigo-500/50 transition-all">
              <span className="text-xl font-bold text-white">K</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">KYC</span>
          </button>

          <div className="flex items-center gap-4">
            {!token ? (
              <>
                <button
                  onClick={() => setView('home')}
                  className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
                >
                  Home
                </button>
                <button
                  onClick={() => setView('login')}
                  className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg hover:shadow-indigo-500/50 transition-all"
                >
                  Admin Login
                </button>
              </>
            ) : (
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white transition-colors"
              >
                <LogOut size={18} />
                Logout
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Message Display */}
      {message && (
        <div className={`fixed top-20 right-6 p-4 rounded-lg backdrop-blur-md border flex items-center gap-3 ${
          message.type === 'success'
            ? 'bg-green-500/20 border-green-500/50 text-green-300'
            : 'bg-red-500/20 border-red-500/50 text-red-300'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle size={20} />
          ) : (
            <AlertCircle size={20} />
          )}
          {message.text}
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Home View */}
        {view === 'home' && (
          <div className="space-y-16">
            {/* Hero Section */}
            <div className="min-h-[600px] flex items-center justify-center">
              <div className="text-center space-y-8 max-w-4xl">
                <div className="space-y-4">
                  <h1 className="text-6xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                    Know Your Customer
                  </h1>
                  <p className="text-xl text-slate-300 leading-relaxed">
                    Secure, fast, and reliable KYC verification for modern businesses. Complete your identity verification in minutes with our streamlined digital platform.
                  </p>
                </div>

                <div className="flex gap-4 justify-center flex-wrap pt-4">
                  <button
                    onClick={() => setView('user')}
                    className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-300 font-semibold text-lg"
                  >
                    Submit Application
                  </button>
                  <button
                    onClick={() => setView('login')}
                    className="px-8 py-4 bg-slate-700/50 border border-slate-600 text-white rounded-lg hover:shadow-lg hover:shadow-purple-500/30 transition-all duration-300 font-semibold text-lg"
                  >
                    Admin Portal
                  </button>
                </div>
              </div>
            </div>

            {/* Features Section */}
            <div className="grid md:grid-cols-3 gap-8 py-12">
              <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl p-8 hover:border-indigo-500/40 transition-all">
                <div className="text-4xl mb-4">⚡</div>
                <h3 className="text-xl font-bold text-indigo-300 mb-3">Fast Verification</h3>
                <p className="text-slate-400">Complete your KYC process in minutes, not days. Our automated system processes applications instantly.</p>
              </div>

              <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-8 hover:border-purple-500/40 transition-all">
                <div className="text-4xl mb-4">🔒</div>
                <h3 className="text-xl font-bold text-purple-300 mb-3">Secure & Safe</h3>
                <p className="text-slate-400">Your data is encrypted and protected with enterprise-grade security standards.</p>
              </div>

              <div className="bg-gradient-to-br from-pink-500/10 to-rose-500/10 border border-pink-500/20 rounded-xl p-8 hover:border-pink-500/40 transition-all">
                <div className="text-4xl mb-4">✓</div>
                <h3 className="text-xl font-bold text-pink-300 mb-3">Instant Results</h3>
                <p className="text-slate-400">Get immediate verification status with AI-powered assessment and human review.</p>
              </div>
            </div>

            {/* How It Works Section */}
            <div className="py-12">
              <h2 className="text-4xl font-bold text-center mb-12 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                How It Works
              </h2>
              
              <div className="grid md:grid-cols-4 gap-6">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mb-4 text-2xl font-bold text-white">
                    1
                  </div>
                  <h3 className="text-lg font-semibold text-indigo-300 mb-2">Submit Info</h3>
                  <p className="text-slate-400 text-sm">Fill out your personal details and identification information securely.</p>
                </div>

                <div className="flex flex-col items-center justify-between">
                  <div className="w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-600 mb-4 hidden md:block"></div>
                </div>

                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mb-4 text-2xl font-bold text-white">
                    2
                  </div>
                  <h3 className="text-lg font-semibold text-purple-300 mb-2">AI Review</h3>
                  <p className="text-slate-400 text-sm">Our AI analyzes your submission for completeness and authenticity.</p>
                </div>

                <div className="flex flex-col items-center justify-between">
                  <div className="w-full h-1 bg-gradient-to-r from-purple-500 to-pink-600 mb-4 hidden md:block"></div>
                </div>

                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-rose-600 rounded-full flex items-center justify-center mb-4 text-2xl font-bold text-white">
                    3
                  </div>
                  <h3 className="text-lg font-semibold text-pink-300 mb-2">Verification</h3>
                  <p className="text-slate-400 text-sm">Our team verifies your information against official databases.</p>
                </div>

                <div className="flex flex-col items-center justify-between">
                  <div className="w-full h-1 bg-gradient-to-r from-pink-500 to-rose-600 mb-4 hidden md:block"></div>
                </div>

                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-red-600 rounded-full flex items-center justify-center mb-4 text-2xl font-bold text-white">
                    4
                  </div>
                  <h3 className="text-lg font-semibold text-rose-300 mb-2">Approved</h3>
                  <p className="text-slate-400 text-sm">Once verified, receive your digital certificate instantly.</p>
                </div>
              </div>
            </div>

            {/* Final CTA Section */}
            <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-2xl p-12 text-center">
              <h2 className="text-3xl font-bold text-white mb-4">Ready to Get Started?</h2>
              <p className="text-slate-300 mb-8 text-lg">Join thousands of users who have completed their KYC verification in minutes.</p>
              <button
                onClick={() => setView('user')}
                className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-300 font-semibold text-lg"
              >
                Start Your Application Now
              </button>
            </div>
          </div>
        )}

        {/* User KYC Form View */}
        {view === 'user' && (
          <div className="max-w-2xl mx-auto backdrop-blur-md bg-slate-800/50 border border-slate-700/50 rounded-2xl shadow-2xl p-8">
            <h2 className="text-3xl font-bold mb-8 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              KYC Application Form
            </h2>

            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Date of Birth</label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="Your phone number"
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Profession</label>
                <input
                  type="text"
                  name="profession"
                  value={formData.profession}
                  onChange={handleInputChange}
                  placeholder="Your profession"
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Address</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Your address"
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">ID Type</label>
                  <select
                    name="idType"
                    value={formData.idType}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  >
                    <option value="passport">Passport</option>
                    <option value="driving_license">Driving License</option>
                    <option value="national_id">National ID</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">ID Number</label>
                  <input
                    type="text"
                    name="idNumber"
                    value={formData.idNumber}
                    onChange={handleInputChange}
                    placeholder="ID number"
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                </div>
              </div>

              <button
                onClick={handleSubmitKYC}
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg hover:shadow-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 mt-6"
              >
                {loading ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </div>
        )}

        {/* Admin Login View */}
        {view === 'login' && (
          <div className="backdrop-blur-md bg-slate-800/50 border border-slate-700/50 rounded-2xl shadow-2xl p-8 max-w-md mx-auto">
            <div className="flex items-center justify-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                <User size={32} className="text-white" />
              </div>
            </div>
            <h2 className="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Admin Login
            </h2>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Username</label>
                <input
                  type="text"
                  value={loginData.username}
                  onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                  placeholder="Enter username"
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
                <input
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  placeholder="Enter password"
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>

              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg hover:shadow-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 mt-6"
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </div>
            <p className="text-sm text-slate-400 mt-6 text-center">
              Demo Credentials: <br />
              <span className="text-indigo-400 font-medium">admin</span> / <span className="text-indigo-400 font-medium">admin123</span>
            </p>
          </div>
        )}

        {/* Admin Dashboard View */}
        {view === 'admin' && token && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Dashboard
              </h2>
              <button
                onClick={fetchApplications}
                className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg hover:shadow-indigo-500/50 transition-all duration-300 font-medium"
              >
                Refresh
              </button>
            </div>

            {/* Stats Cards */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="backdrop-blur-md bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 hover:border-yellow-500/30 transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-300 text-sm font-medium mb-1">Pending</p>
                    <p className="text-3xl font-bold text-yellow-200">{applications.filter((a: Application) => a.status === 'pending').length}</p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
                    <span className="text-2xl">⏳</span>
                  </div>
                </div>
              </div>

              <div className="backdrop-blur-md bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 hover:border-green-500/30 transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-300 text-sm font-medium mb-1">Approved</p>
                    <p className="text-3xl font-bold text-green-200">{applications.filter((a: Application) => a.status === 'approved').length}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                    <span className="text-2xl">✓</span>
                  </div>
                </div>
              </div>

              <div className="backdrop-blur-md bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 hover:border-red-500/30 transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-300 text-sm font-medium mb-1">Rejected</p>
                    <p className="text-3xl font-bold text-red-200">{applications.filter((a: Application) => a.status === 'rejected').length}</p>
                  </div>
                  <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                    <span className="text-2xl">✕</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Three Panel Layout */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Pending Panel */}
              <div className="backdrop-blur-md bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
                <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-b border-yellow-500/30 px-6 py-4">
                  <h3 className="text-xl font-bold text-yellow-300 flex items-center gap-2">
                    <span className="text-2xl">⏳</span> Pending ({applications.filter((a: Application) => a.status === 'pending').length})
                  </h3>
                </div>
                <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto">
                  {applications.filter((a: Application) => a.status === 'pending').length === 0 ? (
                    <p className="text-slate-400 text-center py-8">No pending applications</p>
                  ) : (
                    applications.filter((a: Application) => a.status === 'pending').map((app: Application) => (
                      <div key={app._id} className="border border-yellow-500/20 bg-yellow-500/5 rounded-xl overflow-hidden hover:bg-yellow-500/10 transition-all">
                        <div 
                          className="p-4 cursor-pointer"
                          onClick={() => setExpandedId(expandedId === app._id ? null : app._id)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-yellow-100">{app.fullName}</h4>
                            <span className="text-xs text-yellow-300">{expandedId === app._id ? '▼' : '▶'}</span>
                          </div>
                          <p className="text-xs text-slate-400">{app.email}</p>
                        </div>

                        {expandedId === app._id && (
                          <div className="border-t border-yellow-500/20 bg-yellow-500/5 px-4 py-4 space-y-3">
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <p className="text-yellow-300 font-medium mb-1">Phone:</p>
                                <p className="text-slate-300">{app.phone}</p>
                              </div>
                              <div>
                                <p className="text-yellow-300 font-medium mb-1">DOB:</p>
                                <p className="text-slate-300">{app.dateOfBirth}</p>
                              </div>
                              <div>
                                <p className="text-yellow-300 font-medium mb-1">Profession:</p>
                                <p className="text-slate-300">{app.profession}</p>
                              </div>
                              <div>
                                <p className="text-yellow-300 font-medium mb-1">Address:</p>
                                <p className="text-slate-300">{app.address}</p>
                              </div>
                              <div>
                                <p className="text-yellow-300 font-medium mb-1">ID Type:</p>
                                <p className="text-slate-300">{app.idType}</p>
                              </div>
                              <div>
                                <p className="text-yellow-300 font-medium mb-1">ID Number:</p>
                                <p className="text-slate-300">{app.idNumber}</p>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-yellow-300 font-medium mb-1">Summary:</p>
                              <p className="text-xs text-slate-300 leading-relaxed">{app.summary}</p>
                            </div>
                            <div className="flex gap-2 pt-2">
                              <button
                                onClick={() => handleApproval(app._id, 'approved')}
                                disabled={loading}
                                className="flex-1 px-3 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:shadow-lg hover:shadow-green-500/50 disabled:opacity-50 text-xs font-medium transition-all"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleApproval(app._id, 'rejected')}
                                disabled={loading}
                                className="flex-1 px-3 py-2 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-lg hover:shadow-lg hover:shadow-red-500/50 disabled:opacity-50 text-xs font-medium transition-all"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Approved Panel */}
              <div className="backdrop-blur-md bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
                <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-b border-green-500/30 px-6 py-4">
                  <h3 className="text-xl font-bold text-green-300 flex items-center gap-2">
                    <span className="text-2xl">✓</span> Approved ({applications.filter((a: Application) => a.status === 'approved').length})
                  </h3>
                </div>
                <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto">
                  {applications.filter((a: Application) => a.status === 'approved').length === 0 ? (
                    <p className="text-slate-400 text-center py-8">No approved applications</p>
                  ) : (
                    applications.filter((a: Application) => a.status === 'approved').map((app: Application) => (
                      <div key={app._id} className="border border-green-500/20 bg-green-500/5 rounded-xl overflow-hidden hover:bg-green-500/10 transition-all">
                        <div 
                          className="p-4 cursor-pointer"
                          onClick={() => setExpandedId(expandedId === app._id ? null : app._id)}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-semibold text-green-100">{app.fullName}</h4>
                              <p className="text-xs text-slate-400">{app.email}</p>
                            </div>
                            <span className="text-xs text-green-300">{expandedId === app._id ? '▼' : '▶'}</span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadPDF(app._id);
                            }}
                            className="w-full px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg hover:shadow-indigo-500/50 transition-all flex items-center justify-center gap-2 text-xs font-medium"
                          >
                            <Download size={14} />
                            Download PDF
                          </button>
                        </div>

                        {expandedId === app._id && (
                          <div className="border-t border-green-500/20 bg-green-500/5 px-4 py-4 space-y-3">
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <p className="text-green-300 font-medium mb-1">Phone:</p>
                                <p className="text-slate-300">{app.phone}</p>
                              </div>
                              <div>
                                <p className="text-green-300 font-medium mb-1">DOB:</p>
                                <p className="text-slate-300">{app.dateOfBirth}</p>
                              </div>
                              <div>
                                <p className="text-green-300 font-medium mb-1">Profession:</p>
                                <p className="text-slate-300">{app.profession}</p>
                              </div>
                              <div>
                                <p className="text-green-300 font-medium mb-1">Address:</p>
                                <p className="text-slate-300">{app.address}</p>
                              </div>
                              <div>
                                <p className="text-green-300 font-medium mb-1">ID Type:</p>
                                <p className="text-slate-300">{app.idType}</p>
                              </div>
                              <div>
                                <p className="text-green-300 font-medium mb-1">ID Number:</p>
                                <p className="text-slate-300">{app.idNumber}</p>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-green-300 font-medium mb-1">Summary:</p>
                              <p className="text-xs text-slate-300 leading-relaxed">{app.summary}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Rejected Panel */}
              <div className="backdrop-blur-md bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
                <div className="bg-gradient-to-r from-red-500/20 to-pink-500/20 border-b border-red-500/30 px-6 py-4">
                  <h3 className="text-xl font-bold text-red-300 flex items-center gap-2">
                    <span className="text-2xl">✕</span> Rejected ({applications.filter((a: Application) => a.status === 'rejected').length})
                  </h3>
                </div>
                <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto">
                  {applications.filter((a: Application) => a.status === 'rejected').length === 0 ? (
                    <p className="text-slate-400 text-center py-8">No rejected applications</p>
                  ) : (
                    applications.filter((a: Application) => a.status === 'rejected').map((app: Application) => (
                      <div key={app._id} className="border border-red-500/20 bg-red-500/5 rounded-xl overflow-hidden hover:bg-red-500/10 transition-all">
                        <div 
                          className="p-4 cursor-pointer"
                          onClick={() => setExpandedId(expandedId === app._id ? null : app._id)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-red-100">{app.fullName}</h4>
                            <span className="text-xs text-red-300">{expandedId === app._id ? '▼' : '▶'}</span>
                          </div>
                          <p className="text-xs text-slate-400">{app.email}</p>
                        </div>

                        {expandedId === app._id && (
                          <div className="border-t border-red-500/20 bg-red-500/5 px-4 py-4 space-y-3">
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <p className="text-red-300 font-medium mb-1">Phone:</p>
                                <p className="text-slate-300">{app.phone}</p>
                              </div>
                              <div>
                                <p className="text-red-300 font-medium mb-1">DOB:</p>
                                <p className="text-slate-300">{app.dateOfBirth}</p>
                              </div>
                              <div>
                                <p className="text-red-300 font-medium mb-1">Profession:</p>
                                <p className="text-slate-300">{app.profession}</p>
                              </div>
                              <div>
                                <p className="text-red-300 font-medium mb-1">Address:</p>
                                <p className="text-slate-300">{app.address}</p>
                              </div>
                              <div>
                                <p className="text-red-300 font-medium mb-1">ID Type:</p>
                                <p className="text-slate-300">{app.idType}</p>
                              </div>
                              <div>
                                <p className="text-red-300 font-medium mb-1">ID Number:</p>
                                <p className="text-slate-300">{app.idNumber}</p>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-red-300 font-medium mb-1">Summary:</p>
                              <p className="text-xs text-slate-300 leading-relaxed">{app.summary}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default KYCSystem;
