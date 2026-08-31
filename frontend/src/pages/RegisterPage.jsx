import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import Input from '../components/Button'; // will import real inputs
import Button from '../components/Button';
import Card from '../components/Card';
import InputField from '../components/Input';
import { UserPlus, ArrowLeft, AlertCircle } from 'lucide-react';

const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    studentId: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    // Clear inline error on edit
    if (errors[id]) {
      setErrors((prev) => ({ ...prev, [id]: '' }));
    }
    if (apiError) setApiError('');
  };

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Full name is required';
    if (!formData.email.trim()) {
      errs.email = 'Campus email is required';
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      errs.email = 'Enter a valid email address';
    }

    const prnRegex = /^\d{3}[A-Za-z]\d[A-Za-z]\d{3}$/;
    if (!formData.studentId.trim()) {
      errs.studentId = 'PRN is required';
    } else if (!prnRegex.test(formData.studentId.trim())) {
      errs.studentId = 'PRN must be in the format 123B1B231';
    }

    if (!formData.password) {
      errs.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errs.password = 'Password must be at least 6 characters';
    }
    if (formData.password !== formData.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setApiError('');

    try {
      await register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        studentId: formData.studentId.trim(),
        password: formData.password,
        role: 'student', // Student self-registration
      });

      // Navigate to student dashboard
      navigate('/dashboard');
    } catch (err) {
      console.error('[Registration Error]', err);
      const serverMessage =
        err.response?.data?.message ||
        'Registration failed. Please verify your details or try again.';
      setApiError(serverMessage);
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
            <div className="w-9 h-9 rounded bg-brand/10 border border-brand/20 flex items-center justify-center text-brand mb-3">
              <UserPlus size={18} />
            </div>
            <h2 className="text-2xl font-medium tracking-tight text-ink">
              Create Student Account
            </h2>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              Register to submit and track maintenance requests on campus.
            </p>
          </div>

          {apiError && (
            <div className="mb-5 p-3 rounded bg-priority-critical/10 border border-priority-critical/30 flex items-start space-x-2 text-xs text-priority-critical">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{apiError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <InputField
              label="Full Name"
              id="name"
              type="text"
              placeholder="e.g. Rahul Sharma"
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
              required
            />

            <InputField
              label="Campus Email"
              id="email"
              type="email"
              placeholder="name@pccoepune.org"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              required
            />

            <InputField
              label="PRN"
              id="studentId"
              type="text"
              placeholder="e.g. 123B1B231"
              value={formData.studentId}
              onChange={handleChange}
              error={errors.studentId}
              required
            />

            <InputField
              label="Password"
              id="password"
              type="password"
              placeholder="Minimum 6 characters"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              required
            />

            <InputField
              label="Confirm Password"
              id="confirmPassword"
              type="password"
              placeholder="Re-enter password"
              value={formData.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
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
                Complete Registration
              </Button>
            </div>
          </form>

          <div className="mt-6 pt-4 border-t border-line text-center">
            <p className="text-xs text-muted">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-brand hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default RegisterPage;
