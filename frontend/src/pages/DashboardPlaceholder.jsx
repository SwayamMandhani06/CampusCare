import React from 'react';
import { useAuth } from '../context/AuthContext';
import Card from '../components/Card';
import StatusBadge from '../components/StatusBadge';
import StatusRail from '../components/StatusRail';
import Button from '../components/Button';
import { CheckCircle2, Clock, PlusCircle } from 'lucide-react';

/**
 * DashboardPlaceholder
 * Serves as temporary landing for /dashboard, /admin/dashboard, /staff/dashboard
 * before full dashboard implementation in next stage.
 */
const DashboardPlaceholder = ({ title, roleRequired }) => {
  const { user, logout } = useAuth();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-line gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl font-medium tracking-tight text-ink">{title}</h1>
            <span className="px-2 py-0.5 rounded text-xs font-mono uppercase bg-brand/10 text-brand border border-brand/20">
              {user?.role}
            </span>
          </div>
          <p className="text-xs text-muted mt-1">
            Logged in as <span className="font-mono text-ink">{user?.email}</span> {user?.studentId && `(ID: ${user.studentId})`}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button variant="secondary" size="sm" onClick={logout}>
            Sign Out
          </Button>
        </div>
      </div>

      {/* Main Container */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        {/* Col 1 & 2: Sample Ticket Preview with StatusRail */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="text-[11px] font-mono text-muted uppercase">
                  Incident Ref: CMP-2026-001
                </span>
                <h3 className="text-lg font-medium text-ink mt-0.5">
                  Air conditioner compressor failure in Lecture Hall 204
                </h3>
              </div>
              <StatusBadge status="IN_PROGRESS" />
            </div>

            <p className="text-xs text-muted leading-relaxed mb-6">
              Main AC blower unit is generating excessive rattling noise and tripping circuit breaker B-12. Facility technician currently deployed on-site.
            </p>

            <div className="p-4 bg-paper/60 border border-line rounded">
              <h4 className="text-xs font-mono uppercase tracking-wider text-muted font-medium mb-3">
                Ticket Rail Timeline
              </h4>
              <StatusRail
                currentStatus="IN_PROGRESS"
                statusHistory={[
                  {
                    status: 'PENDING',
                    changedAt: new Date(Date.now() - 3600000 * 2),
                    notes: 'Ticket registered by student',
                  },
                  {
                    status: 'ASSIGNED',
                    changedAt: new Date(Date.now() - 3600000),
                    notes: 'Assigned to technician Mike',
                  },
                  {
                    status: 'IN_PROGRESS',
                    changedAt: new Date(Date.now() - 1800000),
                    notes: 'Inspecting HVAC compressor and relays',
                  },
                ]}
              />
            </div>
          </Card>
        </div>

        {/* Col 3: Role info & next steps */}
        <div className="space-y-6">
          <Card>
            <h4 className="text-xs font-mono uppercase tracking-wider text-muted font-medium mb-3">
              System Ready
            </h4>
            <div className="space-y-3 text-xs text-muted">
              <div className="flex items-center space-x-2 text-ink">
                <CheckCircle2 size={16} className="text-status-resolved" />
                <span>Frontend Design System active</span>
              </div>
              <div className="flex items-center space-x-2 text-ink">
                <CheckCircle2 size={16} className="text-status-resolved" />
                <span>JWT Authentication verified</span>
              </div>
              <div className="flex items-center space-x-2 text-ink">
                <CheckCircle2 size={16} className="text-status-resolved" />
                <span>StatusRail component wired</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-line">
              <span className="text-[11px] font-mono text-muted block mb-1">
                Next Stage:
              </span>
              <p className="text-xs text-ink leading-relaxed">
                Full complaint filing forms, admin triage dashboard, and staff resolution views will be built on this foundation.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardPlaceholder;
