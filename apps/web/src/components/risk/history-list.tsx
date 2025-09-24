
import { Event } from '@prisma/client';

export function HistoryList({ events }: { events: Event[] }) {
    if (!events || events.length === 0) {
        return <p>No history found.</p>;
    }

    return (
        <div className="space-y-4">
            {events.map((event) => (
                <div key={event.id} className="p-4 border rounded-md">
                    <p className="font-bold">{event.type}</p>
                    <p>Timestamp: {new Date(event.timestamp).toLocaleString()}</p>
                    <pre className="bg-gray-100 p-2 rounded-md text-sm">{JSON.stringify(event.diff, null, 2)}</pre>
                </div>
            ))}
        </div>
    );
}
