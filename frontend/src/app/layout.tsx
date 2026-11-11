import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

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
    <html lang="en">
      <body className="min-h-screen bg-[#F7F9FC] text-[#172B4D] antialiased selection:bg-blue-600 selection:text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
