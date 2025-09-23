import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { id: 'seed-tenant' },
    update: {},
    create: {
      id: 'seed-tenant',
      name: 'Acme Corporation',
      domain: 'acme.example',
      settings: {
        riskAppetite: 9,
        defaultLocale: 'en-US',
        heatmap: {
          greenMax: 6,
          amberMax: 12,
          redMax: 25
        }
      }
    }
  });

  const auditManager = await prisma.user.upsert({
    where: { email: 'auditor@acme.example' },
    update: {},
    create: {
      id: 'seed-auditor',
      tenantId: tenant.id,
      email: 'auditor@acme.example',
      name: 'Lead Auditor',
      roles: [Role.TenantAdmin, Role.AuditManager]
    }
  });

  const riskOwner = await prisma.user.upsert({
    where: { email: 'risk.owner@acme.example' },
    update: {},
    create: {
      id: 'seed-risk-owner',
      tenantId: tenant.id,
      email: 'risk.owner@acme.example',
      name: 'Risk Owner',
      roles: [Role.RiskOwner]
    }
  });

  const risk = await prisma.risk.upsert({
    where: { id: 'seed-risk' },
    update: {},
    create: {
      id: 'seed-risk',
      tenantId: tenant.id,
      title: 'Cloud infrastructure outage',
      description: 'Loss of availability for externally hosted workloads.',
      taxonomy: ['Operational'],
      cause: 'Single-region deployment',
      consequence: 'Extended downtime and SLA penalties',
      ownerId: riskOwner.id,
      inherentL: 4,
      inherentI: 5,
      residualL: 2,
      residualI: 3,
      residualScore: 6,
      appetiteThreshold: 9,
      keyRisk: true,
      status: 'Monitoring',
      tags: ['availability', 'cloud']
    }
  });

  await prisma.assessment.upsert({
    where: { id: 'seed-assessment' },
    update: {},
    create: {
      id: 'seed-assessment',
      tenantId: tenant.id,
      riskId: risk.id,
      method: 'qual',
      criteriaConfig: {
        scale: 5,
        velocity: false
      },
      scores: {
        likelihood: 4,
        impact: 5,
        residualLikelihood: 2,
        residualImpact: 3
      },
      residualScore: 6,
      matrixBucket: 'L4_I5',
      reviewerId: auditManager.id,
      approvedAt: new Date()
    }
  });

  const indicator = await prisma.riskIndicator.upsert({
    where: { id: 'seed-indicator' },
    update: {},
    create: {
      id: 'seed-indicator',
      tenantId: tenant.id,
      riskId: risk.id,
      name: 'Monthly downtime minutes',
      direction: 'above',
      threshold: 30,
      unit: 'minutes',
      cadence: 'Monthly',
      latestValue: 45,
      latestRecordedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
      breached: true
    }
  });

  await prisma.indicatorReading.createMany({
    data: [
      {
        indicatorId: indicator.id,
        value: 25,
        recordedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60)
      },
      {
        indicatorId: indicator.id,
        value: 45,
        recordedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7)
      }
    ]
  });

  await prisma.treatment.upsert({
    where: { id: 'seed-treatment' },
    update: {},
    create: {
      id: 'seed-treatment',
      tenantId: tenant.id,
      riskId: risk.id,
      title: 'Implement multi-region failover',
      ownerId: riskOwner.id,
      due: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90),
      status: 'In Progress',
      tasks: {
        create: [
          { title: 'Design failover runbooks', status: 'Complete' },
          { title: 'Deploy secondary region', status: 'In Progress' }
        ]
      }
    }
  });

  await prisma.questionnaire.upsert({
    where: { id: 'seed-questionnaire' },
    update: {},
    create: {
      id: 'seed-questionnaire',
      tenantId: tenant.id,
      period: '2024-Q1',
      scope: 'Infrastructure',
      audience: ['Platform Engineering', 'Risk Owners'],
      status: 'Sent',
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
      questions: [
        { id: 'q1', prompt: 'Rate outage likelihood (1-5)', type: 'scale' },
        { id: 'q2', prompt: 'List top resiliency initiatives', type: 'text' }
      ]
    }
  });

  await prisma.auditUniverse.upsert({
    where: { id: 'seed-universe' },
    update: {},
    create: {
      id: 'seed-universe',
      tenantId: tenant.id,
      name: 'Cloud Operations',
      description: 'Core infrastructure services',
      criticality: 5,
      lastAudit: new Date(Date.now() - 1000 * 60 * 60 * 24 * 180),
      nextDue: new Date(Date.now() + 1000 * 60 * 60 * 24 * 180),
      linkedRiskIds: [risk.id]
    }
  });

  const plan = await prisma.auditPlan.upsert({
    where: { id: 'seed-plan' },
    update: {},
    create: {
      id: 'seed-plan',
      tenantId: tenant.id,
      period: 'FY24',
      status: 'Approved',
      resourceModel: {
        capacityHours: {
          auditor: 1600,
          manager: 400
        }
      }
    }
  });

  const engagement = await prisma.engagement.upsert({
    where: { id: 'seed-engagement' },
    update: {},
    create: {
      id: 'seed-engagement',
      tenantId: tenant.id,
      auditPlanId: plan.id,
      title: 'Enterprise Resiliency Review',
      scope: 'Evaluate cloud resiliency posture',
      objectives: 'Assess controls for failover and incident response',
      status: 'Fieldwork',
      start: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
      end: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
      entityRef: 'seed-universe',
      criticality: 5,
      team: {
        lead: auditManager.id,
        members: [auditManager.id]
      }
    }
  });

  await prisma.rACMLine.upsert({
    where: { id: 'seed-racm' },
    update: {},
    create: {
      id: 'seed-racm',
      engagementId: engagement.id,
      process: 'Incident Response',
      riskRef: risk.id,
      controlRef: 'CTRL-01',
      assertion: 'Availability',
      testStep: 'Review incident drills',
      version: 1
    }
  });

  await prisma.workingPaper.upsert({
    where: { id: 'seed-workpaper' },
    update: {},
    create: {
      id: 'seed-workpaper',
      engagementId: engagement.id,
      kind: 'evidence',
      storageKey: 'workpapers/seed-workpaper.pdf',
      checksum: 'abc123',
      uploadedBy: auditManager.id,
      tags: ['evidence', 'resiliency']
    }
  });

  const finding = await prisma.finding.upsert({
    where: { id: 'seed-finding' },
    update: {},
    create: {
      id: 'seed-finding',
      engagementId: engagement.id,
      severity: 'High',
      condition: 'Single-region failover plan incomplete',
      cause: 'Resource constraints',
      effect: 'Prolonged outage if region fails',
      recommendation: 'Complete multi-region deployment',
      ownerId: riskOwner.id,
      due: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60)
    }
  });

  await prisma.followUp.upsert({
    where: { id: 'seed-followup' },
    update: {},
    create: {
      id: 'seed-followup',
      findingId: finding.id,
      evidenceRefs: ['evidence://multi-region-plan.pdf'],
      status: 'Open'
    }
  });

  const template = await prisma.reportTemplate.upsert({
    where: { id: 'seed-template' },
    update: {},
    create: {
      id: 'seed-template',
      tenantId: tenant.id,
      name: 'Engagement Report',
      sections: [
        { id: 'executive-summary', title: 'Executive Summary' },
        { id: 'findings', title: 'Findings' }
      ],
      placeholders: ['${engagement.title}', '${summary.heatmap}']
    }
  });

  await prisma.report.upsert({
    where: { id: 'seed-report' },
    update: {},
    create: {
      id: 'seed-report',
      tenantId: tenant.id,
      engagementId: engagement.id,
      templateId: template.id,
      fileRef: 'reports/seed-report.pdf'
    }
  });

  await prisma.event.create({
    data: {
      tenantId: tenant.id,
      actorId: auditManager.id,
      entity: 'risk',
      entityId: risk.id,
      type: 'risk.seeded',
      diff: { status: 'Monitoring' }
    }
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
