import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert } from 'lucide-react';
import Button from './Button';

/**
 * ProtectedRoute Component
 * Guards routes by checking authentication and optional allowed roles
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, loading, isInitializing } = useAuth();
  const location = useLocation();

  // Wait for initial auth/me check before evaluating roles or redirecting
  if (isInitializing || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center space-x-3 text-muted">
          <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          <span className="font-mono text-sm">Verifying authorization...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based access if specified
  if (allowedRoles && (!user || !allowedRoles.includes(user.role))) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-paper border border-line rounded-lg text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-priority-critical/10 flex items-center justify-center text-priority-critical">
          <ShieldAlert size={24} />
        </div>
        <h2 className="text-xl font-medium tracking-tight mb-2 text-ink">Access Restricted</h2>
        <p className="text-sm text-muted mb-6">
          Your current account role (<span className="font-mono font-medium text-ink">{user?.role}</span>) is not permitted to view this section.
        </p>
        <div className="flex justify-center space-x-3">
          <Button variant="secondary" onClick={() => window.history.back()}>
            Go Back
          </Button>
          <Button variant="primary" onClick={() => window.location.href = '/'}>
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
