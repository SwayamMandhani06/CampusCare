import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { formatFullDateTime } from '../../utils/formatDate';
import {
  Users,
  GraduationCap,
  Wrench,
  Search,
  Mail,
  Shield,
  RotateCcw,
} from 'lucide-react';

const AdminUsersPage = () => {
  const [activeTab, setActiveTab] = useState('student'); // 'student' or 'staff'
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchUsers = async (role = activeTab) => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/users?role=${role}`);
      if (res.data && res.data.users) {
        setUsers(res.data.users);
      }
    } catch (err) {
      console.error('[AdminUsers] Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(activeTab);
  }, [activeTab]);

  // Client-side search filtering
  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.studentId && u.studentId.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-line gap-4">
        <div>
          <span className="text-xs font-mono uppercase text-muted tracking-wider">
            Campus Accounts Directory
          </span>
          <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-ink mt-0.5">
            User & Staff Management
          </h1>
          <p className="text-xs text-muted mt-1">
            Registered students and verified facilities maintenance staff across campus.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono text-muted">
          <span>{filteredUsers.length} accounts found</span>
        </div>
      </div>

      {/* Tabs & Search Toolbar */}
      <div className="my-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Role Tabs */}
        <div className="flex items-center space-x-1 p-1 bg-paper border border-line rounded-lg w-fit">
          <button
            onClick={() => {
              setActiveTab('student');
              setSearch('');
            }}
            className={`inline-flex items-center space-x-2 px-4 py-2 text-xs font-mono rounded transition-colors ${
              activeTab === 'student'
                ? 'bg-ink text-paper font-medium'
                : 'text-muted hover:text-ink'
            }`}
          >
            <GraduationCap size={15} />
            <span>Students</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('staff');
              setSearch('');
            }}
            className={`inline-flex items-center space-x-2 px-4 py-2 text-xs font-mono rounded transition-colors ${
              activeTab === 'staff'
                ? 'bg-ink text-paper font-medium'
                : 'text-muted hover:text-ink'
            }`}
          >
            <Wrench size={15} />
            <span>Maintenance Staff</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-80">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder={`Search ${activeTab}s by name or email...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-paper text-xs text-ink border border-line rounded focus:border-brand focus-visible:outline-brand"
          />
        </div>
      </div>

      {/* Users Dense Table */}
      <div className="border border-line rounded-lg bg-paper overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-line bg-line/20 text-muted font-mono uppercase text-[11px] tracking-wider">
                <th className="py-3 px-4 font-medium">User Details</th>
                <th className="py-3 px-4 font-medium">Campus Email</th>
                {activeTab === 'student' ? (
                  <th className="py-3 px-4 font-medium">Student ID</th>
                ) : (
                  <th className="py-3 px-4 font-medium">Access Level</th>
                )}
                <th className="py-3 px-4 font-medium">Account Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-muted font-mono">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                      <span>Loading user accounts...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-muted font-mono">
                    No {activeTab} accounts found matching query.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u._id} className="hover:bg-line/10 transition-colors">
                    {/* Name & Avatar */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-brand/10 border border-brand/20 text-brand flex items-center justify-center font-medium text-xs uppercase">
                          {u.name ? u.name.charAt(0) : 'U'}
                        </div>
                        <div>
                          <span className="font-medium text-ink block">{u.name}</span>
                          <span className="text-[10px] font-mono text-muted uppercase">
                            UID: #{u._id.slice(-6).toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="py-3.5 px-4 font-mono text-muted text-xs whitespace-nowrap">
                      <div className="flex items-center space-x-1.5">
                        <Mail size={13} className="text-muted shrink-0" />
                        <span>{u.email}</span>
                      </div>
                    </td>

                    {/* Student ID or Staff Role Badge */}
                    <td className="py-3.5 px-4 font-mono text-xs whitespace-nowrap">
                      {activeTab === 'student' ? (
                        <span className="px-2 py-0.5 rounded border border-line bg-paper/80 font-mono text-ink">
                          {u.studentId || 'Not Specified'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded text-[10px] font-mono uppercase bg-status-assigned/10 text-status-assigned border border-status-assigned/30">
                          <Wrench size={11} />
                          <span>Campus Technician</span>
                        </span>
                      )}
                    </td>

                    {/* Joined Date */}
                    <td className="py-3.5 px-4 font-mono text-muted text-[11px] whitespace-nowrap">
                      {formatFullDateTime(u.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminUsersPage;
