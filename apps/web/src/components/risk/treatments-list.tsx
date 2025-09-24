
import { Treatment } from '@prisma/client';

export function TreatmentsList({ treatments }: { treatments: Treatment[] }) {
    if (!treatments || treatments.length === 0) {
        return <p>No treatments found.</p>;
    }

    return (
        <div className="space-y-4">
            {treatments.map((treatment) => (
                <div key={treatment.id} className="p-4 border rounded-md">
                    <p className="font-bold">{treatment.title}</p>
                    <p>Status: {treatment.status}</p>
                    <p>Due Date: {treatment.due ? new Date(treatment.due).toLocaleDateString() : 'N/A'}</p>
                </div>
            ))}
        </div>
    );
}
