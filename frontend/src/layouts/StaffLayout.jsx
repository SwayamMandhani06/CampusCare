import React from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, Wrench, LogOut, LayoutDashboard, CheckSquare } from 'lucide-react';
import Button from '../components/Button';
import Footer from '../components/Footer';

/**
 * StaffLayout Shell
 * Streamlined single-column task-oriented layout with 3px burnt sienna (--status-progress)
 * top strip, slim top bar, role chip "Staff", and quick task navigation.
 */
const StaffLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink selection:bg-brand/15 selection:text-ink relative">
      {/* 3px Persistent Staff Burnt Sienna Strip */}
      <div className="h-[3px] bg-status-progress w-full fixed top-0 left-0 z-50 shadow-xs" />

      {/* Slim Top Bar */}
      <header className="sticky top-0 z-40 w-full bg-paper/95 backdrop-blur-md border-b border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          {/* Wordmark + Staff Chip */}
          <div className="flex items-center space-x-3">
            <Link to="/staff/dashboard" className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded bg-status-progress/10 border border-status-progress/30 flex items-center justify-center text-status-progress">
                <Wrench size={15} />
              </div>
              <span className="font-medium text-sm tracking-tight text-ink">
                CampusCare
              </span>
            </Link>

            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-status-progress/10 text-status-progress border border-status-progress/30 font-medium">
              Staff
            </span>
          </div>

          {/* Quick Task Navigation */}
          <nav className="flex items-center space-x-4">
            <NavLink
              to="/staff/dashboard"
              className={({ isActive }) =>
                `text-xs font-mono transition-colors flex items-center space-x-1 px-2.5 py-1 rounded ${
                  isActive
                    ? 'bg-line/40 text-ink font-semibold'
                    : 'text-muted hover:text-ink'
                }`
              }
            >
              <LayoutDashboard size={13} />
              <span className="hidden sm:inline">Overview</span>
            </NavLink>

            <NavLink
              to="/staff/tasks"
              className={({ isActive }) =>
                `text-xs font-mono transition-colors flex items-center space-x-1 px-2.5 py-1 rounded ${
                  isActive
                    ? 'bg-line/40 text-ink font-semibold'
                    : 'text-muted hover:text-ink'
                }`
              }
            >
              <CheckSquare size={13} />
              <span>Assigned Tasks</span>
            </NavLink>

            {/* Logout */}
            <div className="pl-3 border-l border-line flex items-center space-x-2">
              <span className="text-xs text-muted font-mono hidden md:inline truncate max-w-[140px]">
                {user?.name || user?.email}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="h-8 px-2.5 text-xs font-mono text-muted hover:text-priority-critical"
              >
                <LogOut size={13} className="mr-1" />
                <span>Exit</span>
              </Button>
            </div>
          </nav>
        </div>
      </header>

      {/* Main Staff Task Content */}
      <main className="flex-grow flex flex-col pt-1">
        <Outlet />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default StaffLayout;
