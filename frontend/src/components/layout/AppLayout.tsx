'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import Header from './Header';
import { Loader2 } from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== '/login') {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  // Login page does not render sidebar or header
  if (pathname === '/login') {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] flex flex-col items-center justify-center text-[#64748B]">
        <Loader2 className="w-8 h-8 text-[#2563EB] animate-spin mb-3" />
        <p className="text-sm font-medium text-[#172B4D]">Connecting to App360 Network NOC...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#172B4D] flex">
      {/* Fixed Sidebar */}
      <Sidebar />

      {/* Main Container */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen bg-[#F7F9FC]">
        <Header />
        <main className="flex-1 p-6 sm:p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
};

export default AppLayout;
