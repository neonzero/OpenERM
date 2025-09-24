
import { RiskIndicator } from '@prisma/client';

export function KRIList({ indicators }: { indicators: RiskIndicator[] }) {
    if (!indicators || indicators.length === 0) {
        return <p>No Key Risk Indicators found.</p>;
    }

    return (
        <div className="space-y-4">
            {indicators.map((indicator) => (
                <div key={indicator.id} className="p-4 border rounded-md">
                    <p className="font-bold">{indicator.name}</p>
                    <p>Direction: {indicator.direction}</p>
                    <p>Threshold: {indicator.threshold}</p>
                    <p>Latest Value: {indicator.latestValue}</p>
                </div>
            ))}
        </div>
    );
}
