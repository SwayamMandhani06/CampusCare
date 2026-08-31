import React from 'react';
import { Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Footer Component
 * Restrained footer with system status and links
 */
const Footer = () => {
  return (
    <footer className="w-full bg-paper border-t border-line mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: System Info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
                <Activity size={14} />
              </div>
              <span className="font-medium text-sm tracking-tight text-ink">CampusCare</span>
            </div>
            <p className="text-xs text-muted max-w-sm leading-relaxed">
              Smart campus infrastructure and maintenance ticket resolution platform. Designed for students, administrators, and facilities staff.
            </p>
            <div className="flex items-center space-x-2 pt-1">
              <span className="w-2 h-2 rounded-full bg-status-resolved animate-pulse" />
              <span className="text-[11px] font-mono text-muted uppercase tracking-wider">
                Services Operational • DevOps FA1
              </span>
            </div>
          </div>

          {/* Col 2: Navigation */}
          <div className="space-y-2">
            <h4 className="text-xs font-mono uppercase tracking-wider text-ink font-medium">
              Navigation
            </h4>
            <ul className="space-y-1.5 text-xs text-muted">
              <li>
                <Link to="/" className="hover:text-ink transition-colors">
                  Overview
                </Link>
              </li>
              <li>
                <Link to="/#how-it-works" className="hover:text-ink transition-colors">
                  Workflow
                </Link>
              </li>
              <li>
                <Link to="/#roles" className="hover:text-ink transition-colors">
                  Role Capabilities
                </Link>
              </li>
              <li>
                <Link to="/#categories" className="hover:text-ink transition-colors">
                  Maintenance Categories
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Portal Access */}
          <div className="space-y-2">
            <h4 className="text-xs font-mono uppercase tracking-wider text-ink font-medium">
              Portal Access
            </h4>
            <ul className="space-y-1.5 text-xs text-muted">
              <li>
                <Link to="/login" className="hover:text-ink transition-colors">
                  Student Sign In
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-ink transition-colors">
                  Staff Task Portal
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-ink transition-colors">
                  Administrator Console
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-ink transition-colors">
                  Register Account
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Hairline Divider */}
        <div className="mt-8 pt-6 border-t border-line flex flex-col sm:flex-row items-center justify-between text-xs text-muted font-mono">
          <p>© 2026 CampusCare. All rights reserved.</p>
          <p className="mt-2 sm:mt-0 text-[11px]">
            Node.js + Express • MongoDB • React + Vite • Tailwind CSS
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
