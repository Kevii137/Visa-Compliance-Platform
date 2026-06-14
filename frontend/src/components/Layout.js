import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Toaster } from '../components/ui/sonner';

const DEMO = process.env.REACT_APP_DEMO_MODE === 'true';

const Layout = () => {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="pl-64">
        {DEMO && (
          <div className="sticky top-0 z-30 bg-amber-500/10 border-b border-amber-500/30 text-amber-300 text-xs px-6 py-2 text-center backdrop-blur">
            Static demo · running on sample data with no live backend — changes you make aren’t persisted.
          </div>
        )}
        <div className="p-6 md:p-8">
          <Outlet />
        </div>
      </main>
      <Toaster position="top-right" richColors />
    </div>
  );
};

export default Layout;
