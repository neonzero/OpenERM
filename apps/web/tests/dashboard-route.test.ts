import { beforeEach, describe, expect, it, vi } from 'vitest';

const getMock = vi.fn();

vi.mock('../src/lib/api/client', () => ({
  apiClient: {
    get: getMock
  }
}));

import DashboardPage from '../src/app/(app)/dashboard/page';

describe('Dashboard route', () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it('renders without throwing', async () => {
    getMock.mockImplementation((path: string) => {
      if (path.endsWith('/risks')) {
        return Promise.resolve({
          items: [
            {
              id: 'risk-1',
              title: 'Test risk',
              taxonomy: ['Operational'],
              inherentL: 3,
              inherentI: 4,
              residualL: 2,
              residualI: 2,
              status: 'Monitoring',
              appetiteBreached: false,
              owner: { name: 'Owner', email: 'owner@example.com' }
            }
          ]
        });
      }
      if (path.endsWith('/risk-heatmap')) {
        return Promise.resolve({
          matrix: {
            bucket: {
              likelihood: 3,
              impact: 4,
              count: 1,
              risks: [
                {
                  id: 'risk-1',
                  title: 'Test risk',
                  status: 'Monitoring',
                  likelihood: 3,
                  impact: 4,
                  appetiteBreached: false
                }
              ]
            }
          },
          totals: { totalRisks: 1, appetiteBreaches: 0 }
        });
      }
      if (path.endsWith('/audit-dashboard')) {
        return Promise.resolve({
          planProgress: [
            { planId: 'plan-1', period: 'FY24', status: 'Approved', completed: 1, total: 1 }
          ],
          findingsBySeverity: { High: 1 },
          findingsAging: { '0-30': 1, '31-60': 0, '60+': 0 },
          utilization: { totalCapacity: 100, bookedHours: 50, utilizationRate: 0.5 },
          indicatorSummary: { Open: 1, Closed: 0 }
        });
      }
      if (path.endsWith('/engagements')) {
        return Promise.resolve([
          {
            id: 'eng-1',
            title: 'Kickoff',
            status: 'Planning',
            startDate: new Date().toISOString(),
            findingsOpen: 0,
            owner: 'Lead Auditor'
          }
        ]);
      }
      return Promise.resolve({});
    });

    await expect(DashboardPage()).resolves.toBeTruthy();
    expect(getMock).toHaveBeenCalled();
  });
});
