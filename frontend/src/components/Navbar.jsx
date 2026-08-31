import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, LogOut, Menu, X, Shield, Wrench, GraduationCap } from 'lucide-react';
import Button from './Button';

/**
 * Navbar Component
 * Minimalist header with wordmark in Geist medium and state-aware auth controls
 */
const Navbar = ({ roleChip }) => {
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
          <button
            type="button"
            onClick={() => {
              if (window.location.pathname !== '/') {
                navigate('/#how-it-works');
              } else {
                const el = document.getElementById('how-it-works');
                el?.scrollIntoView({
                  behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
                });
              }
            }}
            className="text-sm text-muted hover:text-ink transition-colors cursor-pointer"
          >
            Workflow
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.location.pathname !== '/') {
                navigate('/#categories');
              } else {
                const el = document.getElementById('categories');
                el?.scrollIntoView({
                  behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
                });
              }
            }}
            className="text-sm text-muted hover:text-ink transition-colors cursor-pointer"
          >
            Categories
          </button>

          {/* Role-Specific Navigation Links */}
          {user?.role === 'admin' && (
            <>
              <Link
                to="/admin/complaints"
                className="text-sm text-muted hover:text-ink transition-colors"
              >
                Complaints
              </Link>
              <Link
                to="/admin/users"
                className="text-sm text-muted hover:text-ink transition-colors"
              >
                Users & Staff
              </Link>
            </>
          )}

          {user?.role === 'staff' && (
            <Link
              to="/staff/tasks"
              className="text-sm text-muted hover:text-ink transition-colors"
            >
              Assigned Tasks
            </Link>
          )}

          {user?.role === 'student' && (
            <Link
              to="/complaints"
              className="text-sm text-muted hover:text-ink transition-colors"
            >
              My Complaints
            </Link>
          )}

          {/* Auth State Actions */}
          <div className="flex items-center pl-4 border-l border-line space-x-3">
            {isAuthenticated ? (
              <div className="flex items-center space-x-2">
                <Link
                  to={getDashboardPath()}
                  className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-line/40 hover:bg-line/70 transition-colors text-xs font-mono text-ink"
                >
                  {getRoleIcon()}
                  <span className="truncate max-w-[130px]">{user?.name || user?.email}</span>
                </Link>

                {roleChip && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-brand/10 text-brand border border-brand/20 font-medium">
                    {roleChip}
                  </span>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="h-8 px-2 text-muted hover:text-ink"
                  title="Sign out"
                >
                  <LogOut size={14} className="mr-1" />
                  <span className="text-xs font-mono">Exit</span>
                </Button>
              </div>
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
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                if (window.location.pathname !== '/') {
                  navigate('/#how-it-works');
                } else {
                  const el = document.getElementById('how-it-works');
                  el?.scrollIntoView({
                    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
                  });
                }
              }}
              className="text-left text-sm font-medium text-muted hover:text-ink py-1"
            >
              Workflow
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                if (window.location.pathname !== '/') {
                  navigate('/#categories');
                } else {
                  const el = document.getElementById('categories');
                  el?.scrollIntoView({
                    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
                  });
                }
              }}
              className="text-left text-sm font-medium text-muted hover:text-ink py-1"
            >
              Categories
            </button>
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
