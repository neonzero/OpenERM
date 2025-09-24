import { Injectable } from '@nestjs/common';

export type DraftScopeInput = {
  engagement: {
    id: string;
    title: string;
    scope: string | null;
  };
  risks: Array<{
    id: string;
    title: string;
    residualScore: number | null;
    status: string;
  }>;
  libraryItems: Array<{
    id: string;
    type: string;
    title: string;
    description?: string | null;
    content: Record<string, unknown>;
  }>;
};

export type DraftScopeOutput = {
  scopeStatement: string;
  suggestedObjectives: string[];
  testPlan: Array<{
    title: string;
    description: string;
    evidence: string[];
  }>;
  referencedLibraryItems: string[];
};

export interface AuditPlanningProvider {
  generateDraftScope(input: DraftScopeInput): DraftScopeOutput;
}

@Injectable()
export class DeterministicPlanningProvider implements AuditPlanningProvider {
  generateDraftScope(input: DraftScopeInput): DraftScopeOutput {
    const sortedRisks = [...input.risks].sort((a, b) => (b.residualScore ?? 0) - (a.residualScore ?? 0));
    const topRiskTitles = sortedRisks.map((risk) => risk.title);

    const scopeStatement = [
      `Assess the design and operating effectiveness of ${input.engagement.title}.`,
      topRiskTitles.length > 0
        ? `Focus on the following risks: ${topRiskTitles.join(', ')}.`
        : 'No specific linked risks were provided; cover standard control objectives.',
      (() => {
        const controlTitles = input.libraryItems
          .filter((item) => item.type === 'control')
          .map((item) => item.title);
        return controlTitles.length > 0
          ? `Reference catalog controls: ${controlTitles.join(', ')}.`
          : 'Leverage catalog narratives and policies to inform procedures.';
      })()
    ].join(' ');

    const suggestedObjectives = [
      `Validate control coverage for ${input.engagement.title}.`,
      topRiskTitles.length > 0
        ? `Confirm mitigation plans remain effective for ${topRiskTitles[0]}.`
        : 'Confirm baseline control operations across the process.'
    ];

    const testPlan = sortedRisks.map((risk, index) => {
      const relatedControls = input.libraryItems.filter((item) => {
        if (item.type !== 'control') {
          return false;
        }
        const riskId = item.content['riskId'];
        const risksList = item.content['risks'];
        if (typeof riskId === 'string' && riskId === risk.id) {
          return true;
        }
        if (Array.isArray(risksList)) {
          return (risksList as unknown[]).some((value) => value === risk.id);
        }
        return false;
      });

      const evidence = [
        'Sampling evidence of key controls',
        'Walkthrough documentation'
      ];

      if (relatedControls.length > 0) {
        evidence.push(`Control design reference: ${relatedControls.map((control) => control.title).join(', ')}`);
      }

      return {
        title: `Test step ${index + 1}: ${risk.title}`,
        description: `Perform procedures to evaluate the residual risk status (${risk.status}) and confirm controls remain effective.`,
        evidence
      };
    });

    if (testPlan.length === 0) {
      testPlan.push({
        title: 'Baseline control walkthrough',
        description: 'Perform walkthroughs over key process areas leveraging catalog narratives.',
        evidence: ['Narrative acknowledgement', 'Sample population list']
      });
    }

    const referencedLibraryItems = input.libraryItems.map((item) => item.id);

    return {
      scopeStatement,
      suggestedObjectives,
      testPlan,
      referencedLibraryItems
    };
  }
}
