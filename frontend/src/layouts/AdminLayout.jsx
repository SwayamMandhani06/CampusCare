import React from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Activity,
  LayoutDashboard,
  FileText,
  Users,
  LogOut,
  Shield,
} from 'lucide-react';
import Button from '../components/Button';

/**
 * AdminLayout Shell
 * Distinct left sidebar console layout with 3px muted gold (--status-assigned) top strip,
 * role chip "Admin", and dark-tinted console sidebar navigation.
 */
const AdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
      <aside className="w-full md:w-64 lg:w-72 bg-[#EBECE8] border-r border-line flex flex-col shrink-0 md:min-h-screen sticky top-0 z-40">
        {/* Console Header / Wordmark */}
        <div className="p-5 border-b border-line flex items-center justify-between">
          <Link to="/admin/dashboard" className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded bg-status-reviewed/10 border border-status-reviewed/30 flex items-center justify-center text-status-reviewed">
              <Activity size={18} strokeWidth={2.2} />
            </div>
            <div>
              <span className="font-medium text-sm tracking-tight text-ink block">
                CampusCare
              </span>
              <span className="text-[10px] font-mono text-muted uppercase tracking-wide">
                Admin Console
              </span>
            </div>
          </Link>

          {/* Admin Role Chip */}
          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-status-assigned/15 text-[#9E7D1A] border border-status-assigned/30 font-medium">
            Admin
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1 flex-1">
          <span className="px-3 text-[10px] font-mono uppercase text-muted tracking-wider block py-2">
            Operations
          </span>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-paper text-ink border border-line shadow-xs font-semibold'
                    : 'text-muted hover:text-ink hover:bg-paper/50'
                }`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-line bg-paper/50 mt-auto">
          <div className="flex items-center space-x-2.5 mb-3">
            <div className="w-8 h-8 rounded-full bg-status-reviewed/15 text-status-reviewed flex items-center justify-center font-mono text-xs font-bold shrink-0">
              <Shield size={14} />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-medium text-ink block truncate">
                {user?.name || 'Administrator'}
              </span>
              <span className="text-[10px] font-mono text-muted block truncate">
                {user?.email || 'admin@pccoepune.org'}
              </span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full text-xs font-mono text-muted hover:text-priority-critical justify-center border border-line bg-paper"
          >
            <LogOut size={13} className="mr-1.5" />
            <span>Sign Out</span>
          </Button>
        </div>
      </aside>

      {/* Main Administrative Content Canvas */}
      <main className="flex-1 overflow-x-hidden p-2 sm:p-4 lg:p-6 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
