import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'App360 – Network Monitoring & Alarm Management System',
  description: 'Carrier-grade Network Monitoring and Alarm Management System with AIOps Alarm Correlation and Interactive Map',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
