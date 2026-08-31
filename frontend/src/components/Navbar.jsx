import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, LogOut, Menu, X, Shield, Wrench, GraduationCap } from 'lucide-react';
import Button from './Button';

/**
 * Navbar Component
 * Minimalist header with wordmark in Geist medium and state-aware auth controls
 */
const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const getDashboardPath = () => {
    if (!user) return '/login';
    if (user.role === 'admin') return '/admin/dashboard';
    if (user.role === 'staff') return '/staff/dashboard';
    return '/dashboard';
  };

  const getRoleIcon = () => {
    if (user?.role === 'admin') return <Shield size={14} className="text-status-reviewed" />;
    if (user?.role === 'staff') return <Wrench size={14} className="text-status-assigned" />;
    return <GraduationCap size={14} className="text-brand" />;
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-paper/95 backdrop-blur-md border-b border-line">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Wordmark */}
        <Link to="/" className="flex items-center space-x-2.5 group">
          <div className="w-8 h-8 rounded bg-brand/10 border border-brand/20 flex items-center justify-center text-brand group-hover:border-brand transition-colors">
            <Activity size={18} strokeWidth={2.2} />
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-base tracking-tight text-ink">CampusCare</span>
            <span className="text-[10px] font-mono text-muted tracking-wide uppercase -mt-0.5">Facility System</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link
            to="/#how-it-works"
            className="text-sm text-muted hover:text-ink transition-colors"
          >
            Workflow
          </Link>
          <Link
            to="/#roles"
            className="text-sm text-muted hover:text-ink transition-colors"
          >
            Roles
          </Link>
          <Link
            to="/#categories"
            className="text-sm text-muted hover:text-ink transition-colors"
          >
            Categories
          </Link>

          {/* Auth State Actions */}
          <div className="flex items-center pl-4 border-l border-line space-x-3">
            {isAuthenticated ? (
              <>
                <Link to={getDashboardPath()}>
                  <Button variant="secondary" size="sm" className="font-mono text-xs">
                    {getRoleIcon()}
                    <span className="uppercase">{user?.role}</span>
                    <span className="text-muted ml-1 hidden lg:inline">Dashboard</span>
                  </Button>
                </Link>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  title="Logout"
                  className="text-muted hover:text-priority-critical"
                >
                  <LogOut size={16} />
                  <span className="text-xs font-mono">Exit</span>
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Login
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary" size="sm">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </nav>

        {/* Mobile menu toggle */}
        <div className="flex md:hidden items-center space-x-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-muted hover:text-ink focus-visible:outline-brand"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-line bg-paper px-4 py-5 space-y-4 animate-in fade-in duration-150">
          <div className="flex flex-col space-y-3">
            <Link
              to="/#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium text-muted hover:text-ink py-1"
            >
              Workflow
            </Link>
            <Link
              to="/#roles"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium text-muted hover:text-ink py-1"
            >
              Roles
            </Link>
            <Link
              to="/#categories"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium text-muted hover:text-ink py-1"
            >
              Categories
            </Link>
          </div>

          <div className="pt-3 border-t border-line flex flex-col space-y-2">
            {isAuthenticated ? (
              <>
                <Link
                  to={getDashboardPath()}
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full"
                >
                  <Button variant="secondary" className="w-full justify-start font-mono text-xs">
                    {getRoleIcon()}
                    <span className="uppercase">{user?.role} Dashboard</span>
                  </Button>
                </Link>
                <Button
                  variant="danger"
                  onClick={handleLogout}
                  className="w-full justify-start text-xs font-mono"
                >
                  <LogOut size={16} />
                  Logout
                </Button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="secondary" className="w-full">
                    Login
                  </Button>
                </Link>
                <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" className="w-full">
                    Register
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
