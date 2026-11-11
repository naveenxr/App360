'use client';

import React from 'react';
import { AuthProvider } from '../context/AuthContext';
import AppLayout from '../components/layout/AppLayout';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppLayout>{children}</AppLayout>
    </AuthProvider>
  );
}
