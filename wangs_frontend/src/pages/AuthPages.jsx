import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, Mail, User, ArrowRight, ShieldCheck, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [isLogin, setIsLogin] = useState(searchParams.get('tab') !== 'register');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone_number: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        const loggedInUser = await login(formData.username, formData.password);
        if (loggedInUser.role === 'ADMIN') {
          navigate('/admin');
        } else if (loggedInUser.role === 'MANUFACTURER') {
          navigate('/manufacturer');
        } else {
          navigate('/account');
        }
      } else {
        await register(formData);
        navigate('/account');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Quick fill helper for review
  const quickFill = (userType) => {
    if (userType === 'admin') {
      setFormData({ ...formData, username: 'admin', password: 'admin12345' });
    } else if (userType === 'aunt') {
      setFormData({ ...formData, username: 'aunt_arenla', password: 'aunt12345' });
    } else if (userType === 'customer') {
      setFormData({ ...formData, username: 'customer', password: 'customer12345' });
    }
    setIsLogin(true);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-white p-8 rounded-2xl border border-stone-200 shadow-md space-y-6">
        <div className="text-center">
          <Link to="/" className="inline-block font-serif font-black text-3xl text-forest-950 mb-1">
            Wangs
          </Link>
          <p className="text-xs text-stone-500">
            Authentic Naga Pickle Marketplace · Kohima, Nagaland
          </p>
        </div>

        {/* Tab switch */}
        <div className="grid grid-cols-2 bg-stone-100 p-1 rounded-xl text-xs font-semibold text-stone-600">
          <button
            onClick={() => { setIsLogin(true); setError(''); }}
            className={`py-2 rounded-lg transition-all ${isLogin ? 'bg-white text-stone-900 shadow-sm font-bold' : ''}`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(''); }}
            className={`py-2 rounded-lg transition-all ${!isLogin ? 'bg-white text-stone-900 shadow-sm font-bold' : ''}`}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {!isLogin && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-stone-700 font-medium mb-1">First Name</label>
                <input
                  type="text"
                  required
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-stone-700 font-medium mb-1">Last Name</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-stone-700 font-medium mb-1">
              {isLogin ? 'Username or Email' : 'Desired Username'}
            </label>
            <input
              type="text"
              required
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder={isLogin ? 'e.g. admin or customer@wangs.in' : 'e.g. moa_longkumer'}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg"
            />
          </div>

          {!isLogin && (
            <>
              <div>
                <label className="block text-stone-700 font-medium mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="e.g. moa@example.com"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-stone-700 font-medium mb-1">Mobile Phone (Optional)</label>
                <input
                  type="tel"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-stone-700 font-medium mb-1">Password</label>
            <input
              type="password"
              required
              minLength={6}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-forest-800 hover:bg-forest-900 text-white font-bold rounded-xl shadow transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <span>Authenticating...</span> : (
              <>
                <span>{isLogin ? 'Sign In to Wangs' : 'Create Customer Account'}</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Credentials Assistant */}
        <div className="pt-4 border-t border-stone-100 text-[11px] text-stone-500 space-y-2">
          <p className="font-semibold text-stone-700">Quick Demo Credentials:</p>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => quickFill('admin')}
              className="px-2 py-1 bg-cream-100 hover:bg-cream-200 text-forest-900 rounded font-medium truncate"
            >
              Admin Hub
            </button>
            <button
              type="button"
              onClick={() => quickFill('aunt')}
              className="px-2 py-1 bg-cream-100 hover:bg-cream-200 text-forest-900 rounded font-medium truncate"
            >
              Aunt Arenla
            </button>
            <button
              type="button"
              onClick={() => quickFill('customer')}
              className="px-2 py-1 bg-cream-100 hover:bg-cream-200 text-forest-900 rounded font-medium truncate"
            >
              Customer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
