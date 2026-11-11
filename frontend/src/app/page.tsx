'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="min-h-screen bg-[#F7F9FC] flex flex-col items-center justify-center text-[#64748B]">
      <Loader2 className="w-8 h-8 text-[#2563EB] animate-spin mb-3" />
      <p className="text-xs font-medium text-[#172B4D]">Directing to App360 Network NOC...</p>
    </div>
  );
}
