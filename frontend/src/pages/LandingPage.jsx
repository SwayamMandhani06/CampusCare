import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  ChevronDown,
  Info,
} from 'lucide-react';
import Button from '../components/Button';
import Card from '../components/Card';
import StatusRail from '../components/StatusRail';

const LandingPage = () => {
  // Active expandable stage in the resolution pipeline
  const [activeStageKey, setActiveStageKey] = useState('ASSIGNED');

  const scrollToSection = (sectionId) => {
    const el = document.getElementById(sectionId);
    if (el) {
      const prefersReducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;
      el.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'start',
      });
    }
  };

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

  // Resolution pipeline stage descriptions
  const pipelineStages = [
    {
      key: 'PENDING',
      num: '01',
      title: 'Submitted',
      short: 'Student details issue location, category, and urgency.',
      explanation:
        'A student logs the breakdown specifying the campus building, room number, urgency level, and details. The report is recorded in the permanent PCCOE database.',
    },
    {
      key: 'REVIEWED',
      num: '02',
      title: 'Reviewed',
      short: 'Admin validates ticket urgency and scope.',
      explanation:
        'Campus administration inspects the submission, validates severity, checks for potential safety hazards, and confirms the required technician skill set.',
    },
    {
      key: 'ASSIGNED',
      num: '03',
      title: 'Assigned',
      short: 'Task routed directly to certified facility staff.',
      explanation:
        'An administrator dispatches the work order directly to a designated maintenance technician (e.g. electrical, plumbing, network IT) on duty.',
    },
    {
      key: 'IN_PROGRESS',
      num: '04',
      title: 'In Progress',
      short: 'Technician arrives on site and logs repair actions.',
      explanation:
        'The maintenance technician marks the ticket in-progress upon arriving on site, beginning inspection, parts replacement, and structural repairs.',
    },
    {
      key: 'RESOLVED',
      num: '05',
      title: 'Resolved',
      short: 'Issue closed with notes; student verifies outcome.',
      explanation:
        'Technician signs off the task with diagnostic notes detailing parts replaced and functional testing. The student is notified with the full resolution audit trail.',
    },
  ];

  // Categories definition with icons and hover animations
  const categories = [
    {
      name: 'Electrical',
      icon: (
        <Zap
          size={20}
          className="text-status-assigned transition-transform duration-200 group-hover:scale-125"
        />
      ),
      description: 'Lighting, switches, circuit breakers, lab power sockets',
    },
    {
      name: 'Plumbing',
      icon: (
        <Droplets
          size={20}
          className="text-status-reviewed transition-transform duration-200 group-hover:-translate-y-1"
        />
      ),
      description: 'Restroom fixtures, pipe leaks, washbasins, water purifiers',
    },
    {
      name: 'Internet/WiFi',
      icon: (
        <Wifi
          size={20}
          className="text-brand transition-transform duration-200 group-hover:scale-125"
        />
      ),
      description: 'Hostel Wi-Fi APs, classroom Ethernet ports, gateway latency',
    },
    {
      name: 'Furniture',
      icon: (
        <Armchair
          size={20}
          className="text-muted transition-transform duration-200 group-hover:rotate-6"
        />
      ),
      description: 'Lecture hall benches, chairs, whiteboards, podiums',
    },
    {
      name: 'Equipment',
      icon: (
        <Cpu
          size={20}
          className="text-status-progress transition-transform duration-200 group-hover:rotate-45"
        />
      ),
      description: 'Projectors, display panels, AC units, workshop machines',
    },
    {
      name: 'Cleanliness',
      icon: (
        <Sparkles
          size={20}
          className="text-status-resolved transition-transform duration-200 group-hover:scale-125 group-hover:rotate-12"
        />
      ),
      description: 'Waste bins, spills, common area and corridor sanitation',
    },
    {
      name: 'Hostel Maintenance',
      icon: (
        <Building
          size={20}
          className="text-muted transition-transform duration-200 group-hover:-translate-y-1"
        />
      ),
      description: 'Room doors, window catches, locks, geysers, laundry rooms',
    },
    {
      name: 'Classroom Infrastructure',
      icon: (
        <School
          size={20}
          className="text-ink transition-transform duration-200 group-hover:scale-110"
        />
      ),
      description: 'Acoustics, PA systems, window blinds, ventilation fans',
    },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col w-full"
    >
      {/* 1. Hero Section */}
      <section className="w-full pt-16 pb-20 md:pt-28 md:pb-32 border-b border-line bg-paper">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center space-x-2 px-3.5 py-1 mb-8 rounded-full border border-line bg-paper/80 text-xs font-mono text-muted"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-status-resolved" />
            <span>PCCOE Campus Facility & Incident Management</span>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-4xl sm:text-6xl lg:text-7xl font-medium tracking-tight text-ink max-w-5xl mx-auto leading-[1.08]"
          >
            Campus problems deserve faster solutions.
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="mt-6 text-lg sm:text-xl text-muted max-w-2xl mx-auto leading-relaxed"
          >
            A unified facility management system for reporting campus infrastructure breakdowns, dispatching college technicians, and tracking repairs in real time.
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/register">
              <Button variant="primary" size="lg" className="w-full sm:w-auto text-base">
                <span>Get Started</span>
                <ArrowRight size={18} />
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto text-base">
                Portal Login
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* 2. Interactive Resolution Pipeline */}
      <section
        id="how-it-works"
        className="w-full py-16 md:py-24 border-b border-line bg-paper scroll-mt-16"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-xs font-mono uppercase tracking-wider text-muted font-medium mb-2">
              Resolution Pipeline
            </h2>
            <h3 className="text-2xl sm:text-3xl font-medium tracking-tight text-ink">
              How a complaint moves from report to fix
            </h3>
            <p className="text-xs sm:text-sm text-muted mt-2">
              Click any stage below to inspect the procedural response at that point in the lifecycle.
            </p>
          </div>

          {/* StatusRail Interactive Container */}
          <div className="max-w-4xl mx-auto py-8 px-4 sm:px-8 bg-paper border border-line rounded-lg shadow-sm">
            <StatusRail orientation="horizontal" currentStatus={activeStageKey} />

            {/* Clickable Stage Headers */}
            <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-2 pt-6 border-t border-line text-left">
              {pipelineStages.map((stage) => {
                const isSelected = activeStageKey === stage.key;
                return (
                  <button
                    key={stage.key}
                    type="button"
                    onClick={() => setActiveStageKey(stage.key)}
                    className={`p-3 rounded text-left transition-all duration-200 border ${
                      isSelected
                        ? 'bg-line/40 border-brand/50 shadow-sm'
                        : 'border-transparent hover:bg-line/20 hover:border-line'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-mono text-muted uppercase">
                        {stage.num}. {stage.title}
                      </span>
                      <ChevronDown
                        size={13}
                        className={`text-muted transition-transform duration-200 ${
                          isSelected ? 'rotate-180 text-brand' : ''
                        }`}
                      />
                    </div>
                    <p className="text-xs text-ink line-clamp-2 leading-relaxed">
                      {stage.short}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Accordion Detail Area with Height & Opacity Transition */}
            <div className="mt-4 pt-4 border-t border-line/60">
              <AnimatePresence mode="wait">
                {pipelineStages
                  .filter((s) => s.key === activeStageKey)
                  .map((stage) => (
                    <motion.div
                      key={stage.key}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.22, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 rounded-md bg-paper/80 border border-brand/20 flex items-start space-x-3 text-left">
                        <div className="p-2 rounded bg-brand/10 text-brand shrink-0 mt-0.5">
                          <Info size={16} />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-ink font-mono uppercase tracking-wide">
                            Stage {stage.num} — {stage.title} Protocol
                          </h4>
                          <p className="text-xs sm:text-sm text-ink/90 mt-1 leading-relaxed">
                            {stage.explanation}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Role Capabilities Section */}
      <section
        id="roles"
        className="w-full py-16 md:py-24 border-b border-line bg-paper scroll-mt-16"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-xs font-mono uppercase tracking-wider text-muted font-medium mb-2">
              Role-Based Access
            </h2>
            <h3 className="text-2xl sm:text-3xl font-medium tracking-tight text-ink">
              Dedicated interfaces tailored for each campus stakeholder
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Student Card */}
            <Card hover className="flex flex-col justify-between p-6 sm:p-7">
              <div>
                <div className="w-11 h-11 rounded border border-brand/20 bg-brand/10 flex items-center justify-center text-brand mb-4">
                  <GraduationCap size={22} />
                </div>
                <h4 className="text-xl font-medium tracking-tight text-ink mb-1">Students</h4>
                <p className="text-xs font-mono text-muted mb-4">Submit & Monitor</p>
                <ul className="space-y-2.5 text-xs sm:text-sm text-muted mb-6">
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 size={15} className="text-status-resolved shrink-0" />
                    <span>Lodge complaints with verified PRN identification</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 size={15} className="text-status-resolved shrink-0" />
                    <span>Track progress with step-by-step timeline rails</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 size={15} className="text-status-resolved shrink-0" />
                    <span>Modify descriptions while ticket is pending</span>
                  </li>
                </ul>
              </div>
              <Link to="/register">
                <Button variant="secondary" size="md" className="w-full text-xs font-mono">
                  Student Sign Up
                </Button>
              </Link>
            </Card>

            {/* Admin Card */}
            <Card hover className="flex flex-col justify-between p-6 sm:p-7">
              <div>
                <div className="w-11 h-11 rounded border border-status-reviewed/30 bg-status-reviewed/10 flex items-center justify-center text-status-reviewed mb-4">
                  <ShieldCheck size={22} />
                </div>
                <h4 className="text-xl font-medium tracking-tight text-ink mb-1">Administrators</h4>
                <p className="text-xs font-mono text-muted mb-4">Dispatch & Analyze</p>
                <ul className="space-y-2.5 text-xs sm:text-sm text-muted mb-6">
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 size={15} className="text-status-resolved shrink-0" />
                    <span>Overview metrics on workload and status distribution</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 size={15} className="text-status-resolved shrink-0" />
                    <span>Dispatch complaints to technical maintenance staff</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 size={15} className="text-status-resolved shrink-0" />
                    <span>Filter issues across all departments and departments</span>
                  </li>
                </ul>
              </div>
              <Link to="/admin/login">
                <Button variant="secondary" size="md" className="w-full text-xs font-mono">
                  Admin Console
                </Button>
              </Link>
            </Card>

            {/* Staff Card */}
            <Card hover className="flex flex-col justify-between p-6 sm:p-7">
              <div>
                <div className="w-11 h-11 rounded border border-status-assigned/30 bg-status-assigned/10 flex items-center justify-center text-status-assigned mb-4">
                  <Wrench size={22} />
                </div>
                <h4 className="text-xl font-medium tracking-tight text-ink mb-1">Maintenance Staff</h4>
                <p className="text-xs font-mono text-muted mb-4">Execute & Resolve</p>
                <ul className="space-y-2.5 text-xs sm:text-sm text-muted mb-6">
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 size={15} className="text-status-resolved shrink-0" />
                    <span>View tickets assigned to your technical domain</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 size={15} className="text-status-resolved shrink-0" />
                    <span>Set progress state when on-site repairs commence</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 size={15} className="text-status-resolved shrink-0" />
                    <span>Close work orders with comprehensive resolution notes</span>
                  </li>
                </ul>
              </div>
              <Link to="/staff/login">
                <Button variant="secondary" size="md" className="w-full text-xs font-mono">
                  Staff Portal
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      </section>

      {/* 4. Categories Strip with Micro-Interactions */}
      <section
        id="categories"
        className="w-full py-16 md:py-20 bg-paper border-b border-line scroll-mt-16"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-xs font-mono uppercase tracking-wider text-muted font-medium mb-2">
              Facility Domains
            </h2>
            <h3 className="text-2xl sm:text-3xl font-medium tracking-tight text-ink">
              Categories supported by the CampusCare registry
            </h3>
            <p className="text-xs sm:text-sm text-muted mt-2">
              Specialized technicians are dispatched according to the facility domain of your request.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {categories.map((cat) => (
              <div
                key={cat.name}
                className="group flex flex-col p-5 bg-paper border border-line rounded-lg hover:border-brand/40 hover:-translate-y-1 transition-all duration-200 cursor-default shadow-xs"
              >
                <div className="flex items-center space-x-3 mb-2.5">
                  <div className="p-2.5 rounded bg-line/40 shrink-0 group-hover:bg-brand/10 transition-colors">
                    {cat.icon}
                  </div>
                  <span className="text-sm font-medium text-ink group-hover:text-brand transition-colors">
                    {cat.name}
                  </span>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  {cat.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Call to Action Banner */}
      <section className="w-full py-16 md:py-24 bg-paper text-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl sm:text-4xl font-medium tracking-tight text-ink">
            Keep your campus infrastructure running smoothly.
          </h3>
          <p className="mt-4 text-base sm:text-lg text-muted">
            Report maintenance issues instantly and verify resolution with full timeline visibility.
          </p>
          <div className="mt-8 flex justify-center space-x-4">
            <Link to="/register">
              <Button variant="primary" size="lg" className="text-sm">
                Register Student Account
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="secondary" size="lg" className="text-sm">
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
