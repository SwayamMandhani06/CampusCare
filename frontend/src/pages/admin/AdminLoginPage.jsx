import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/Button';
import Card from '../../components/Card';
import InputField from '../../components/Input';
import { ShieldCheck, ArrowLeft, AlertCircle, KeyRound } from 'lucide-react';

const AdminLoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please provide administrator email and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const user = await login(email.trim(), password);

      if (user.role !== 'admin') {
        setError('Access denied: This account does not possess administrator privileges.');
        return;
      }

      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      console.error('[AdminLogin] Error:', err);
      if (err.response?.status === 401) {
        setError('Incorrect email or password');
      } else {
        setError(err.response?.data?.message || 'Authentication service error');
      }
    } finally {
      setLoading(false);
    }
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
            <div className="w-9 h-9 rounded bg-status-reviewed/10 border border-status-reviewed/30 flex items-center justify-center text-status-reviewed mb-3">
              <ShieldCheck size={18} />
            </div>
            <h1 className="text-2xl font-medium tracking-tight text-ink">
              Admin sign in
            </h1>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              Campus administration console for issue triage, staff routing, and operational metrics.
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
              label="Admin Email"
              id="email"
              type="email"
              placeholder="admin@pccoepune.org"
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
                Sign In to Console
              </Button>
            </div>
          </form>

          <div className="mt-6 pt-4 border-t border-line text-center space-y-2">
            <p className="text-xs text-muted">
              Not an administrator?{' '}
              <Link to="/login" className="font-medium text-brand hover:underline">
                Student sign in
              </Link>
            </p>

            <div className="pt-1 text-[11px] font-mono text-muted">
              <Link to="/staff/login" className="hover:text-ink transition-colors hover:underline">
                Staff? Sign in here →
              </Link>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default AdminLoginPage;
