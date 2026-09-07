import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { HeartPulse, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { loginUser } from '@/services/api';
import { User } from '@/types';

interface LoginPageProps {
  onLoginSuccess: (token: string, user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await loginUser(email.trim(), password);
      onLoginSuccess(data.access_token, data.user);

      if (data.user.role === 'EXPERT') {
        navigate('/expert/dashboard');
      } else if (data.user.role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Incorrect email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (demoRole: 'farmer' | 'expert' | 'admin') => {
    if (demoRole === 'farmer') {
      setEmail('farmer@example.com');
      setPassword('farmer123');
    } else if (demoRole === 'expert') {
      setEmail('expert@example.com');
      setPassword('expert123');
    } else {
      setEmail('admin@example.com');
      setPassword('admin123');
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        <div className="w-16 h-16 rounded-2xl bg-farm-700 flex items-center justify-center mx-auto text-white shadow-lg shadow-farm-900/20">
          <HeartPulse className="w-10 h-10" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Livestock Health System
        </h1>
        <p className="text-sm font-medium text-slate-600">
          Sign in to manage your livestock and track animal health
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="shadow-xl border-slate-200 p-6 sm:p-8 space-y-6">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-xl flex items-start gap-2">
              <span className="font-bold">•</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="farmer@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            <div className="space-y-1">
              <label className="block text-xs sm:text-sm font-bold text-slate-700">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-farm-600 focus:border-farm-600 text-sm pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full font-bold text-base mt-2"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="pt-4 border-t border-slate-200">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5 text-center">
              Quick Test Credentials
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleDemoLogin('farmer')}
                className="px-2 py-2 text-xs font-bold rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-farm-50 hover:text-farm-800 transition-colors"
              >
                Farmer
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('expert')}
                className="px-2 py-2 text-xs font-bold rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-amber-50 hover:text-amber-800 transition-colors"
              >
                Expert
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('admin')}
                className="px-2 py-2 text-xs font-bold rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-purple-50 hover:text-purple-800 transition-colors"
              >
                Admin
              </button>
            </div>
          </div>

          <div className="text-center pt-2">
            <p className="text-sm font-medium text-slate-600">
              Need a farm account?{' '}
              <Link to="/register" className="font-bold text-farm-700 hover:underline">
                Register as Farmer
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};
