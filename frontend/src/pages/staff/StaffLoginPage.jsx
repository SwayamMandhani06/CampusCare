import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/Button';
import Card from '../../components/Card';
import InputField from '../../components/Input';
import { Wrench, ArrowLeft, AlertCircle, KeyRound } from 'lucide-react';

const StaffLoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please provide maintenance technician email and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const user = await login(email.trim(), password);

      if (user.role !== 'staff') {
        setError('Access restricted: This portal is reserved for campus facility staff.');
        return;
      }

      navigate('/staff/dashboard', { replace: true });
    } catch (err) {
      console.error('[StaffLogin] Error:', err);
      if (err.response?.status === 401) {
        setError('Incorrect email or password');
      } else {
        setError(err.response?.data?.message || 'Authentication service error');
      }
    } finally {
      setLoading(false);
    }
  };

  const fillSeededStaff = () => {
    setEmail('staff@campuscare.edu');
    setPassword('StaffPassword123!');
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
            <div className="w-9 h-9 rounded bg-status-assigned/10 border border-status-assigned/30 flex items-center justify-center text-status-assigned mb-3">
              <Wrench size={18} />
            </div>
            <h1 className="text-2xl font-medium tracking-tight text-ink">
              Staff sign in
            </h1>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              Maintenance technician portal for work order inspection, status progress, and resolution signing.
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
              label="Staff Email"
              id="email"
              type="email"
              placeholder="staff@campuscare.edu"
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
                Sign In to Work Orders
              </Button>
            </div>
          </form>

          {/* Quick Credential Chip */}
          <div className="mt-6 pt-5 border-t border-line">
            <div className="flex items-center space-x-1.5 text-xs text-muted font-mono mb-2">
              <KeyRound size={12} />
              <span>Seeded Technician Credential:</span>
            </div>
            <button
              type="button"
              onClick={fillSeededStaff}
              className="w-full p-2.5 border border-line rounded bg-paper/60 hover:bg-line/30 text-[11px] text-left transition-colors flex items-center justify-between"
            >
              <div>
                <span className="font-mono font-medium text-status-assigned block uppercase">
                  Staff Lead
                </span>
                <span className="text-muted block font-mono">staff@campuscare.edu</span>
              </div>
              <span className="text-xs font-mono text-brand">Auto-fill</span>
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-line text-center">
            <p className="text-xs text-muted">
              Not a staff member?{' '}
              <Link to="/login" className="font-medium text-brand hover:underline">
                Student portal
              </Link>
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default StaffLoginPage;
