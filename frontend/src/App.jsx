import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Public Layout
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Distinct Role Layout Shells
import StudentLayout from './layouts/StudentLayout';
import AdminLayout from './layouts/AdminLayout';
import StaffLayout from './layouts/StaffLayout';

// Public Pages
import LandingPage from './pages/LandingPage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import StaffLoginPage from './pages/staff/StaffLoginPage';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import RaiseComplaintPage from './pages/student/RaiseComplaintPage';
import MyComplaintsPage from './pages/student/MyComplaintsPage';
import ComplaintDetailPage from './pages/student/ComplaintDetailPage';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminComplaintsPage from './pages/admin/AdminComplaintsPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';

// Staff Pages
import StaffDashboard from './pages/staff/StaffDashboard';
import StaffTasksPage from './pages/staff/StaffTasksPage';

// Public Route Shell wrapper
const PublicLayout = ({ children }) => (
  <div className="min-h-screen flex flex-col bg-paper text-ink selection:bg-brand/15 selection:text-ink">
    <Navbar />
    <main className="flex-grow flex flex-col">{children}</main>
    <Footer />
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes with standard Navbar/Footer */}
          <Route
            path="/"
            element={
              <PublicLayout>
                <LandingPage />
              </PublicLayout>
            }
          />
          <Route
            path="/register"
            element={
              <PublicLayout>
                <RegisterPage />
              </PublicLayout>
            }
          />
          <Route
            path="/login"
            element={
              <PublicLayout>
                <LoginPage />
              </PublicLayout>
            }
          />
          <Route
            path="/admin/login"
            element={
              <PublicLayout>
                <AdminLoginPage />
              </PublicLayout>
            }
          />
          <Route
            path="/staff/login"
            element={
              <PublicLayout>
                <StaffLoginPage />
              </PublicLayout>
            }
          />

          {/* Student Role Shell (Persistent 3px steel blue top bar, Navbar with Student chip) */}
          <Route
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<StudentDashboard />} />
            <Route path="/complaints/new" element={<RaiseComplaintPage />} />
            <Route path="/complaints" element={<MyComplaintsPage />} />
            <Route path="/complaints/:id" element={<ComplaintDetailPage />} />
          </Route>

          {/* Admin Role Shell (Persistent 3px muted gold top bar, dark-tint left sidebar console) */}
          <Route
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/complaints" element={<AdminComplaintsPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
          </Route>

          {/* Staff Role Shell (Persistent 3px burnt sienna top bar, slim task-focused header) */}
          <Route
            element={
              <ProtectedRoute allowedRoles={['staff']}>
                <StaffLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/staff/dashboard" element={<StaffDashboard />} />
            <Route path="/staff/tasks" element={<StaffTasksPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
