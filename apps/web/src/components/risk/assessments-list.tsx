
import { Assessment } from '@prisma/client';

export function AssessmentsList({ assessments }: { assessments: Assessment[] }) {
    if (!assessments || assessments.length === 0) {
        return <p>No assessments found.</p>;
    }

    return (
        <div className="space-y-4">
            {assessments.map((assessment) => (
                <div key={assessment.id} className="p-4 border rounded-md">
                    <p className="font-bold">{assessment.method}</p>
                    <p>Residual Score: {assessment.residualScore}</p>
                    <p>Approved at: {assessment.approvedAt ? new Date(assessment.approvedAt).toLocaleDateString() : 'N/A'}</p>
                </div>
            ))}
        </div>
    );
}
