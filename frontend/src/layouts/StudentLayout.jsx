import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

/**
 * StudentLayout Shell
 * Persistent 3px steel blue (--brand) top strip, top navbar with "Student" role chip
 */
const StudentLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink selection:bg-brand/15 selection:text-ink relative">
      {/* 3px Persistent Student Brand Strip */}
      <div className="h-[3px] bg-brand w-full fixed top-0 left-0 z-50 shadow-xs" />

      {/* Top Navbar */}
      <Navbar roleChip="Student" />

      {/* Main Student Page Content */}
      <main className="flex-grow flex flex-col pt-1">
        <Outlet />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default StudentLayout;
