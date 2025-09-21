import Link from 'next/link';
import { ArrowRight, ShieldCheck, Workflow } from 'lucide-react';

const features = [
  {
    title: 'Risk Register & Assessments',
    description:
      'Capture risks, run COSO-aligned assessments, and orchestrate mitigations across your enterprise.',
    href: '/risk'
  },
  {
    title: 'Internal Audit Lifecycle',
    description:
      'Plan audits, manage fieldwork, track findings, and evidence compliance with IIA Standards.',
    href: '/audit'
  },
  {
    title: 'Continuous Monitoring',
    description:
      'Stream events, automate workflows, and keep leadership informed with real-time dashboards.',
    href: '/dashboard'
  }
];

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-16 px-6 py-16">
      <section className="space-y-4 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-4 py-1 text-sm font-semibold text-brand-600">
          <ShieldCheck className="h-4 w-4" /> COSO ERM + IIA 2024 aligned
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white md:text-5xl">
          Integrated Internal Audit & Enterprise Risk Management
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-slate-600 dark:text-slate-300">
          Manage strategic, operational, and compliance risk alongside internal audit engagements in a
          single secure workspace designed for multi-tenant governance.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/risk"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-white shadow-lg transition hover:bg-brand-500"
          >
            Explore risk workspace <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/audit"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-6 py-3 text-slate-700 transition hover:border-brand-500 hover:text-brand-600 dark:border-slate-700 dark:text-slate-200"
          >
            View audit hub
          </Link>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {features.map((feature) => (
          <Link
            key={feature.title}
            href={feature.href}
            className="group flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/70 p-6 shadow-sm transition hover:-translate-y-1 hover:border-brand-500 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/70"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <Workflow className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">{feature.title}</h3>
            <p className="text-sm text-slate-600 transition group-hover:text-slate-700 dark:text-slate-400 dark:group-hover:text-slate-300">
              {feature.description}
            </p>
          </Link>
        ))}
      </section>
    </main>
  );
}
