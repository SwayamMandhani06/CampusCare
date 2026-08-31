import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import Card from '../components/Card';
import InputField from '../components/Input';
import { LogIn, ArrowLeft, AlertCircle, KeyRound } from 'lucide-react';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please provide both email and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const user = await login(email.trim(), password);

      // Role-based redirection
      if (from) {
        navigate(from, { replace: true });
      } else if (user.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else if (user.role === 'staff') {
        navigate('/staff/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      console.error('[Login Error]', err);
      if (err.response?.status === 401) {
        setError('Incorrect email or password');
      } else {
        setError(
          err.response?.data?.message ||
            'Unable to connect to service. Please check your credentials and try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Demo account quick filler
  const fillDemoAccount = (roleEmail, rolePass) => {
    setEmail(roleEmail);
    setPassword(rolePass);
    setError('');
  };

  return (
    <div className="min-h-[calc(100vh-12rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-md"
      >
        <Link
          to="/"
          className="inline-flex items-center text-xs font-mono text-muted hover:text-ink mb-6 transition-colors"
        >
          <ArrowLeft size={14} className="mr-1" />
          Back to Overview
        </Link>

        <Card className="p-8 sm:p-10 shadow-sm border border-line">
          <div className="text-left mb-6">
            <div className="w-9 h-9 rounded bg-brand/10 border border-brand/20 flex items-center justify-center text-brand mb-3">
              <LogIn size={18} />
            </div>
            <h2 className="text-2xl font-medium tracking-tight text-ink">
              Portal Sign In
            </h2>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              Access your personalized campus care workspace.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded bg-priority-critical/10 border border-priority-critical/30 flex items-start space-x-2 text-xs text-priority-critical">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <InputField
              label="Campus Email"
              id="email"
              type="email"
              placeholder="name@campuscare.edu"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError('');
              }}
              required
            />

            <InputField
              label="Password"
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              required
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                loading={loading}
                disabled={loading}
              >
                Sign In
              </Button>
            </div>
          </form>

          {/* Quick Credential Chips for Viva / Demo Testing */}
          <div className="mt-6 pt-5 border-t border-line">
            <div className="flex items-center space-x-1.5 text-xs text-muted font-mono mb-2">
              <KeyRound size={12} />
              <span>Quick Demo Credentials:</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-left">
              <button
                type="button"
                onClick={() =>
                  fillDemoAccount('admin@campuscare.edu', 'AdminPassword123!')
                }
                className="p-2 border border-line rounded bg-paper/60 hover:bg-line/30 text-[11px] text-left transition-colors"
              >
                <span className="font-mono font-medium text-status-reviewed block uppercase">
                  Admin
                </span>
                <span className="text-muted block truncate">admin@campuscare.edu</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  fillDemoAccount('staff@campuscare.edu', 'StaffPassword123!')
                }
                className="p-2 border border-line rounded bg-paper/60 hover:bg-line/30 text-[11px] text-left transition-colors"
              >
                <span className="font-mono font-medium text-status-assigned block uppercase">
                  Staff Lead
                </span>
                <span className="text-muted block truncate">staff@campuscare.edu</span>
              </button>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-line text-center">
            <p className="text-xs text-muted">
              Don't have an account yet?{' '}
              <Link to="/register" className="font-medium text-brand hover:underline">
                Create student account
              </Link>
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default LoginPage;
