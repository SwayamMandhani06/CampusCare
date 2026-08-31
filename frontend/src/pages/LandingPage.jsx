import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  GraduationCap,
  ShieldCheck,
  Wrench,
  Zap,
  Droplets,
  Wifi,
  Armchair,
  Cpu,
  Sparkles,
  Building,
  School,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import Button from '../components/Button';
import Card from '../components/Card';
import StatusRail from '../components/StatusRail';

const LandingPage = () => {
  // Motion container
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.25, ease: 'easeOut' },
    },
  };

  // Categories definition with icons
  const categories = [
    { name: 'Electrical', icon: <Zap size={18} className="text-status-assigned" /> },
    { name: 'Plumbing', icon: <Droplets size={18} className="text-status-reviewed" /> },
    { name: 'Internet/WiFi', icon: <Wifi size={18} className="text-brand" /> },
    { name: 'Furniture', icon: <Armchair size={18} className="text-muted" /> },
    { name: 'Equipment', icon: <Cpu size={18} className="text-status-progress" /> },
    { name: 'Cleanliness', icon: <Sparkles size={18} className="text-status-resolved" /> },
    { name: 'Hostel Maintenance', icon: <Building size={18} className="text-muted" /> },
    { name: 'Classroom Infrastructure', icon: <School size={18} className="text-ink" /> },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col w-full"
    >
      {/* 1. Hero Section */}
      <section className="w-full pt-16 pb-20 md:pt-24 md:pb-28 border-b border-line bg-paper">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div variants={itemVariants} className="inline-flex items-center space-x-2 px-3 py-1 mb-6 rounded-full border border-line bg-paper/60 text-xs font-mono text-muted">
            <span className="w-2 h-2 rounded-full bg-status-resolved" />
            <span>Campus Incident & Resolution Engine</span>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-4xl sm:text-5xl lg:text-6xl font-medium tracking-tight text-ink max-w-4xl mx-auto leading-[1.12]"
          >
            Campus problems deserve faster solutions.
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="mt-6 text-base sm:text-lg text-muted max-w-2xl mx-auto leading-relaxed"
          >
            A unified facility management platform for reporting infrastructure issues, assigning campus technicians, and monitoring repair progress in real time.
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
          >
            <Link to="/register">
              <Button variant="primary" size="lg" className="w-full sm:w-auto">
                Get Started
                <ArrowRight size={16} />
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                Portal Login
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* 2. How It Works — Signature Horizontal Ticket Rail */}
      <section id="how-it-works" className="w-full py-16 md:py-20 border-b border-line bg-paper">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-xs font-mono uppercase tracking-wider text-muted font-medium mb-2">
              Resolution Pipeline
            </h2>
            <h3 className="text-2xl font-medium tracking-tight text-ink">
              How a complaint moves from report to fix
            </h3>
          </div>

          {/* Interactive Horizontal Ticket Rail */}
          <div className="max-w-4xl mx-auto py-6 px-4 sm:px-8 bg-paper border border-line rounded-lg shadow-sm">
            <StatusRail orientation="horizontal" currentStatus="IN_PROGRESS" />
            <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-3 pt-6 border-t border-line text-left">
              <div>
                <span className="text-[11px] font-mono uppercase text-muted block mb-1">01. Submit</span>
                <p className="text-xs text-ink">Student details issue location, category, and urgency.</p>
              </div>
              <div>
                <span className="text-[11px] font-mono uppercase text-muted block mb-1">02. Review</span>
                <p className="text-xs text-ink">Admin validates ticket urgency and scope.</p>
              </div>
              <div>
                <span className="text-[11px] font-mono uppercase text-muted block mb-1">03. Assign</span>
                <p className="text-xs text-ink">Task routed directly to certified facility staff.</p>
              </div>
              <div>
                <span className="text-[11px] font-mono uppercase text-muted block mb-1">04. Progress</span>
                <p className="text-xs text-ink">Technician arrives on site and logs repair actions.</p>
              </div>
              <div>
                <span className="text-[11px] font-mono uppercase text-muted block mb-1">05. Resolve</span>
                <p className="text-xs text-ink">Issue closed with notes; student verifies outcome.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Role Cards Section */}
      <section id="roles" className="w-full py-16 md:py-20 border-b border-line bg-paper">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-xs font-mono uppercase tracking-wider text-muted font-medium mb-2">
              Role-Based Access
            </h2>
            <h3 className="text-2xl font-medium tracking-tight text-ink">
              Dedicated interfaces tailored for each campus stakeholder
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Student Card */}
            <Card hover className="flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded border border-brand/20 bg-brand/10 flex items-center justify-center text-brand mb-4">
                  <GraduationCap size={20} />
                </div>
                <h4 className="text-lg font-medium tracking-tight text-ink mb-1">Students</h4>
                <p className="text-xs font-mono text-muted mb-4">Submit & Monitor</p>
                <ul className="space-y-2 text-xs text-muted mb-6">
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 size={14} className="text-status-resolved shrink-0" />
                    <span>Lodge complaints in under 60 seconds</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 size={14} className="text-status-resolved shrink-0" />
                    <span>Track progress with step-by-step timeline rails</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 size={14} className="text-status-resolved shrink-0" />
                    <span>Modify descriptions while ticket is pending</span>
                  </li>
                </ul>
              </div>
              <Link to="/register">
                <Button variant="secondary" size="sm" className="w-full">
                  Student Sign Up
                </Button>
              </Link>
            </Card>

            {/* Admin Card */}
            <Card hover className="flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded border border-status-reviewed/30 bg-status-reviewed/10 flex items-center justify-center text-status-reviewed mb-4">
                  <ShieldCheck size={20} />
                </div>
                <h4 className="text-lg font-medium tracking-tight text-ink mb-1">Administrators</h4>
                <p className="text-xs font-mono text-muted mb-4">Dispatch & Analyze</p>
                <ul className="space-y-2 text-xs text-muted mb-6">
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 size={14} className="text-status-resolved shrink-0" />
                    <span>Overview metrics on workload and status distribution</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 size={14} className="text-status-resolved shrink-0" />
                    <span>Dispatch complaints to appropriate technical staff</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 size={14} className="text-status-resolved shrink-0" />
                    <span>Filter campus issues by priority, building, and category</span>
                  </li>
                </ul>
              </div>
              <Link to="/login">
                <Button variant="secondary" size="sm" className="w-full">
                  Admin Console
                </Button>
              </Link>
            </Card>

            {/* Staff Card */}
            <Card hover className="flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded border border-status-assigned/30 bg-status-assigned/10 flex items-center justify-center text-status-assigned mb-4">
                  <Wrench size={20} />
                </div>
                <h4 className="text-lg font-medium tracking-tight text-ink mb-1">Maintenance Staff</h4>
                <p className="text-xs font-mono text-muted mb-4">Execute & Resolve</p>
                <ul className="space-y-2 text-xs text-muted mb-6">
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 size={14} className="text-status-resolved shrink-0" />
                    <span>View tickets assigned to your technical domain</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 size={14} className="text-status-resolved shrink-0" />
                    <span>Set progress state when repairs commence</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 size={14} className="text-status-resolved shrink-0" />
                    <span>Close work orders with comprehensive resolution notes</span>
                  </li>
                </ul>
              </div>
              <Link to="/login">
                <Button variant="secondary" size="sm" className="w-full">
                  Staff Portal
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      </section>

      {/* 4. Categories Strip */}
      <section id="categories" className="w-full py-16 bg-paper border-b border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-xs font-mono uppercase tracking-wider text-muted font-medium mb-2">
              Facility Domains
            </h2>
            <h3 className="text-2xl font-medium tracking-tight text-ink">
              Categories supported by the CampusCare registry
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {categories.map((cat) => (
              <div
                key={cat.name}
                className="flex items-center space-x-3 p-3.5 bg-paper border border-line rounded hover:border-muted/40 transition-colors"
              >
                <div className="p-2 rounded bg-line/40 shrink-0">{cat.icon}</div>
                <span className="text-xs font-medium text-ink">{cat.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Call to Action Banner */}
      <section className="w-full py-16 bg-paper text-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-2xl sm:text-3xl font-medium tracking-tight text-ink">
            Keep your campus infrastructure running smoothly.
          </h3>
          <p className="mt-3 text-sm text-muted">
            Report maintenance issues instantly and verify resolution with full timeline visibility.
          </p>
          <div className="mt-6 flex justify-center space-x-3">
            <Link to="/register">
              <Button variant="primary" size="md">
                Register Student Account
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="secondary" size="md">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </motion.div>
  );
};

export default LandingPage;
