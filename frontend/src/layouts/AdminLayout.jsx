import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Activity,
  LayoutDashboard,
  FileText,
  Users,
  LogOut,
  Shield,
  BarChart2,
  Menu,
  X,
} from 'lucide-react';
import Button from '../components/Button';
import ThemeToggle from '../components/ThemeToggle';
import NotificationBell from '../components/NotificationBell';

/**
 * AdminLayout Shell
 * Left sidebar console layout with 3px muted gold (--status-assigned) top strip,
 * role chip "Admin", collapsible mobile navigation, and theme/notification controls.
 */
const AdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    {
      to: '/admin/dashboard',
      label: 'Operational Dashboard',
      shortLabel: 'Dashboard',
      icon: <LayoutDashboard size={17} />,
    },
    {
      to: '/admin/analytics',
      label: 'Advanced Analytics',
      shortLabel: 'Analytics',
      icon: <BarChart2 size={17} />,
    },
    {
      to: '/admin/complaints',
      label: 'Complaint Management',
      shortLabel: 'Complaints',
      icon: <FileText size={17} />,
    },
    {
      to: '/admin/users',
      label: 'User & Staff Directory',
      shortLabel: 'Users & Staff',
      icon: <Users size={17} />,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-paper text-ink selection:bg-brand/15 selection:text-ink relative">
      {/* 3px Persistent Admin Muted Gold Strip */}
      <div className="h-[3px] bg-status-assigned w-full fixed top-0 left-0 z-50 shadow-xs" />

      {/* Left Sidebar Console */}
      <aside className="w-full md:w-64 lg:w-72 bg-surface border-r border-line flex flex-col shrink-0 md:min-h-screen sticky top-0 z-40">
        {/* Console Header / Wordmark */}
        <div className="p-4 sm:p-5 border-b border-line flex items-center justify-between">
          <Link to="/admin/dashboard" className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-status-reviewed/10 border border-status-reviewed/30 flex items-center justify-center text-status-reviewed shrink-0">
              <Activity size={18} strokeWidth={2.2} />
            </div>
            <div>
              <span className="font-semibold text-sm tracking-tight text-ink block">
                CampusCare
              </span>
              <span className="text-[10px] font-mono text-muted uppercase tracking-wider">
                Admin Console
              </span>
            </div>
          </Link>

          {/* Admin Controls & Mobile Menu Toggle */}
          <div className="flex items-center space-x-1.5">
            <NotificationBell />
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 text-muted hover:text-ink md:hidden focus-visible:outline-brand"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className={`p-3 space-y-1 flex-1 ${mobileMenuOpen ? 'block' : 'hidden md:block'}`}>
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-[10px] font-mono uppercase text-muted tracking-wider">
              Operations
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-status-assigned/15 text-status-assigned border border-status-assigned/30 font-semibold">
              Admin
            </span>
          </div>

          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-subtle text-ink border border-line shadow-2xs font-semibold'
                    : 'text-muted hover:text-ink hover:bg-subtle/60'
                }`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User Card & Logout */}
        <div className={`p-4 border-t border-line bg-subtle/40 mt-auto ${mobileMenuOpen ? 'block' : 'hidden md:block'}`}>
          <div className="flex items-center space-x-2.5 mb-3">
            <div className="w-8 h-8 rounded-full bg-status-reviewed/15 text-status-reviewed border border-status-reviewed/30 flex items-center justify-center font-mono text-xs font-bold shrink-0">
              <Shield size={14} />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-semibold text-ink block truncate">
                {user?.name || 'Administrator'}
              </span>
              <span className="text-[10px] font-mono text-muted block truncate">
                {user?.email || 'admin@pccoepune.org'}
              </span>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleLogout}
            className="w-full text-xs font-mono justify-center"
          >
            <LogOut size={13} className="mr-1.5" />
            <span>Sign Out</span>
          </Button>
        </div>
      </aside>

      {/* Main Administrative Content Canvas */}
      <main className="flex-1 overflow-x-hidden p-3 sm:p-5 lg:p-7 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
