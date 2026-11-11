import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'App360 – Carrier-Grade Network Monitoring & AIOps Platform',
  description: 'Enterprise Network Telemetry Ingestion, AIOps Alarm Correlation and Dynamic RBAC Platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-[#F7F9FC] text-[#172B4D] antialiased selection:bg-blue-600 selection:text-white font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
