import type { ReactNode } from 'react';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/risk', label: 'Risk Register' },
  { href: '/audit', label: 'Audit Hub' }
];

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <header className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-600">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-300">Phase 1 MVP</p>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">OpenERM Workspace</h1>
          </div>
        </div>
        <nav className="flex items-center gap-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="flex flex-1 flex-col gap-6">{children}</main>
    </div>
  );
}
