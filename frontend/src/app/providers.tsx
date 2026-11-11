'use client';

import React from 'react';
import { AuthProvider } from '../context/AuthContext';
import { SocketProvider } from '../context/SocketContext';
import AppLayout from '../components/layout/AppLayout';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SocketProvider>
        <AppLayout>{children}</AppLayout>
      </SocketProvider>
    </AuthProvider>
  );
}
