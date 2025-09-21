'use client';

import { format } from 'date-fns';
import { Badge } from '../ui/badge';

export type EngagementEvent = {
  id: string;
  title: string;
  status: string;
  timestamp: string;
  owner: string;
};

export function EngagementTimeline({ events }: { events: EngagementEvent[] }) {
  return (
    <ol className="relative border-l border-slate-200 pl-6 dark:border-slate-800">
      {events.map((event) => (
        <li key={event.id} className="mb-10 ml-2">
          <span className="absolute -left-1 mt-1 flex h-3 w-3 items-center justify-center rounded-full border border-brand-500 bg-white dark:bg-slate-900" />
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{event.title}</h4>
            <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">{event.status}</Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {format(new Date(event.timestamp), 'PPPp')} · {event.owner}
          </p>
        </li>
      ))}
    </ol>
  );
}
