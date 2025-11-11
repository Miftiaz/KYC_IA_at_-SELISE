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
  const [view, setView] = useState<'user' | 'admin' | 'login'>('user');
  const [token, setToken] = useState<string | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
    setView('login');
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-indigo-600">KYC System</h1>
          <div className="flex gap-2">
            {!token && (
              <>
                <button
                  onClick={() => setView('user')}
                  className={`px-4 py-2 rounded ${view === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}
                >
                  Submit KYC
                </button>
                <button
                  onClick={() => setView('login')}
                  className={`px-4 py-2 rounded ${view === 'login' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}
                >
                  Admin Login
                </button>
              </>
            )}
            {token && (
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500 text-white rounded flex items-center gap-2 hover:bg-red-600"
              >
                <LogOut size={18} /> Logout
              </button>
            )}
          </div>
        </div>
      </header>

      {message && (
        <div className="max-w-7xl mx-auto px-4 mt-4">
          <div className={`p-4 rounded flex items-center gap-2 ${
            message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            {message.text}
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8">
        {view === 'user' && (
          <div className="bg-white rounded-lg shadow-md p-8 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">KYC Application Form</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Profession</label>
                <input
                  type="text"
                  name="profession"
                  value={formData.profession}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID Type</label>
                <select
                  name="idType"
                  value={formData.idType}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="passport">Passport</option>
                  <option value="driving_license">Driving License</option>
                  <option value="national_id">National ID</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID Number</label>
                <input
                  type="text"
                  name="idNumber"
                  value={formData.idNumber}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={handleSubmitKYC}
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-3 rounded font-medium hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </div>
        )}

        {view === 'login' && (
          <div className="bg-white rounded-lg shadow-md p-8 max-w-md mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
              <User /> Admin Login
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  value={loginData.username}
                  onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-3 rounded font-medium hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-4 text-center">
              Demo: admin / admin123
            </p>
          </div>
        )}

        {view === 'admin' && token && (
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">KYC Applications</h2>
              <button
                onClick={fetchApplications}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                Refresh
              </button>
            </div>

            <div className="space-y-4">
              {applications.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No applications found</p>
              ) : (
                applications.map((app) => (
                  <div key={app._id} className="border border-gray-200 rounded-lg p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800">{app.fullName}</h3>
                        <p className="text-sm text-gray-500">
                          Submitted: {new Date(app.submittedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded text-sm font-medium ${
                        app.status === 'approved' ? 'bg-green-100 text-green-800' :
                        app.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {app.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                      <div>
                        <span className="font-medium">Email:</span> {app.email}
                      </div>
                      <div>
                        <span className="font-medium">Phone:</span> {app.phone}
                      </div>
                      <div>
                        <span className="font-medium">DOB:</span> {new Date(app.dateOfBirth).toLocaleDateString()}
                      </div>
                      <div>
                        <span className="font-medium">Profession:</span> {app.profession}
                      </div>
                      <div className="col-span-2">
                        <span className="font-medium">ID:</span> {app.idType} - {app.idNumber}
                      </div>
                      <div className="col-span-2">
                        <span className="font-medium">Address:</span> {app.address}
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-1">Summary:</p>
                      <p className="text-sm text-gray-600">{app.summary}</p>
                    </div>

                    <div className="flex gap-2">
                      {app.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApproval(app._id, 'approved')}
                            disabled={loading}
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleApproval(app._id, 'rejected')}
                            disabled={loading}
                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {app.status === 'approved' && (
                        <button
                          onClick={() => handleDownloadPDF(app._id)}
                          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center gap-2"
                        >
                          <Download size={18} /> Download PDF
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default KYCSystem;