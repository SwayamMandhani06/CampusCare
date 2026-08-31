import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import LandingPage from './pages/LandingPage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import DashboardPlaceholder from './pages/DashboardPlaceholder';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import RaiseComplaintPage from './pages/student/RaiseComplaintPage';
import MyComplaintsPage from './pages/student/MyComplaintsPage';
import ComplaintDetailPage from './pages/student/ComplaintDetailPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen flex flex-col bg-paper text-ink selection:bg-brand/15 selection:text-ink">
          <Navbar />
          <main className="flex-grow flex flex-col">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/login" element={<LoginPage />} />

              {/* Student Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <StudentDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/complaints/new"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <RaiseComplaintPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/complaints"
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <MyComplaintsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/complaints/:id"
                element={
                  <ProtectedRoute allowedRoles={['student', 'admin', 'staff']}>
                    <ComplaintDetailPage />
                  </ProtectedRoute>
                }
              />

              {/* Admin & Staff Dashboards (to be fleshed out in upcoming stages) */}
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <DashboardPlaceholder
                      title="Administrator Operations Console"
                      roleRequired="admin"
                    />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/staff/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['staff', 'admin']}>
                    <DashboardPlaceholder
                      title="Facility Staff Task Dispatch"
                      roleRequired="staff"
                    />
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
