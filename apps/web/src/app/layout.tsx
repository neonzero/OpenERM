import type { Metadata } from 'next';
import { ReactNode } from 'react';
import './globals.css';
import { Providers } from '../components/providers/providers';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'OpenERM Platform',
  description: 'Integrated Risk Management and Internal Audit platform.',
  icons: {
    icon: '/favicon.ico'
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <Providers>
          <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
            {children}
          </div>
          <Toaster position="top-right" richColors />
        </Providers>
      </body>
    </html>
  );
}
