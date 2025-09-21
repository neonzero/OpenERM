import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'acme-corp' },
    update: {},
    create: {
      name: 'Acme Corporation',
      slug: 'acme-corp',
      timeZone: 'UTC'
    }
  });

  const [auditManager, riskManager] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'auditor@acme.example' },
      update: {},
      create: {
        email: 'auditor@acme.example',
        displayName: 'Lead Auditor',
        tenantId: tenant.id,
        roles: {
          create: [
            {
              role: 'audit.manager'
            }
          ]
        }
      }
    }),
    prisma.user.upsert({
      where: { email: 'risk.owner@acme.example' },
      update: {},
      create: {
        email: 'risk.owner@acme.example',
        displayName: 'Risk Owner',
        tenantId: tenant.id,
        roles: {
          create: [
            {
              role: 'risk.manager'
            }
          ]
        }
      }
    })
  ]);

  const category = await prisma.riskCategory.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Operational' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Operational'
    }
  });

  const risk = await prisma.risk.upsert({
    where: { tenantId_referenceId: { tenantId: tenant.id, referenceId: 'R-001' } },
    update: {},
    create: {
      tenantId: tenant.id,
      categoryId: category.id,
      referenceId: 'R-001',
      title: 'Cloud infrastructure outage',
      inherentScore: 16,
      residualScore: 8,
      ownerId: riskManager.id,
      status: 'MONITORING'
    }
  });

  await prisma.tenantRiskPreference.upsert({
    where: { tenantId: tenant.id },
    update: {
      likelihoodAppetite: 3,
      impactAppetite: 3,
      residualAppetite: 9
    },
    create: {
      tenantId: tenant.id,
      likelihoodAppetite: 3,
      impactAppetite: 3,
      residualAppetite: 9
    }
  });

  await prisma.riskIndicator.upsert({
    where: { id: 'seed-indicator' },
    update: {},
    create: {
      id: 'seed-indicator',
      tenantId: tenant.id,
      riskId: risk.id,
      name: 'Monthly uptime %',
      cadence: 'monthly',
      direction: 'INCREASE',
      threshold: 97,
      target: 99,
      status: 'ON_TRACK'
    }
  });

  await prisma.riskQuestionnaire.upsert({
    where: { id: 'seed-questionnaire' },
    update: {},
    create: {
      id: 'seed-questionnaire',
      tenantId: tenant.id,
      title: 'Q1 Risk Survey',
      period: 'Q1',
      scope: 'Enterprise',
      audience: ['Risk Owners', 'IT'],
      status: 'SENT',
      dueDate: new Date(),
      questions: {
        create: [
          {
            prompt: 'Rate the likelihood of a major outage',
            responseType: 'SCALE',
            options: ['1', '2', '3', '4', '5'],
            sortOrder: 1
          },
          {
            prompt: 'List top resilience initiatives',
            responseType: 'TEXT',
            sortOrder: 2
          }
        ]
      }
    }
  });

  const engagement = await prisma.auditEngagement.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'FY24-IA-01' } },
    update: {},
    create: {
      tenantId: tenant.id,
      code: 'FY24-IA-01',
      name: 'Enterprise Risk Review',
      status: 'PLANNING',
      ownerId: auditManager.id
    }
  });

  const entity = await prisma.auditableEntity.upsert({
    where: { id: 'seed-entity' },
    update: {},
    create: {
      id: 'seed-entity',
      tenantId: tenant.id,
      name: 'Cloud Operations',
      type: 'Process',
      criticality: 5,
      riskLinkages: [risk.id],
      lastAudit: new Date(Date.now() - 1000 * 60 * 60 * 24 * 200),
      nextDue: new Date(Date.now() + 1000 * 60 * 60 * 24 * 180)
    }
  });

  const plan = await prisma.auditPlan.upsert({
    where: { id: 'seed-plan' },
    update: {},
    create: {
      id: 'seed-plan',
      tenantId: tenant.id,
      period: 'FY24',
      status: 'IN_PROGRESS',
      items: {
        create: [
          {
            engagementId: engagement.id,
            auditableEntityId: entity.id,
            priority: 1,
            status: 'IN_PROGRESS'
          }
        ]
      },
      capacities: {
        create: [
          {
            tenantId: tenant.id,
            role: 'Auditor',
            hoursAvailable: 1600,
            utilization: 0.45
          }
        ]
      }
    }
  });

  await prisma.timesheetEntry.upsert({
    where: { id: 'seed-timesheet' },
    update: {},
    create: {
      id: 'seed-timesheet',
      tenantId: tenant.id,
      userId: auditManager.id,
      engagementId: engagement.id,
      entryDate: new Date(),
      hours: 6,
      activity: 'Planning workshop',
      status: 'APPROVED',
      approverId: auditManager.id,
      approvedAt: new Date()
    }
  });

  await prisma.reportTemplate.upsert({
    where: { id: 'seed-risk-template' },
    update: {},
    create: {
      id: 'seed-risk-template',
      tenantId: tenant.id,
      name: 'Risk Register Summary',
      type: 'RISK_REGISTER',
      sections: {
        intro: 'Risk Register Overview',
        body: ['Risk Table', 'Heatmap'],
        signOff: 'Prepared by Internal Audit'
      }
    }
  });

  await prisma.generatedReport.create({
    data: {
      tenantId: tenant.id,
      templateId: 'seed-risk-template',
      context: {
        generatedFor: 'Demo seed',
        generatedAt: new Date().toISOString()
      },
      fileRef: 'reports/demo-risk-register.pdf'
    }
  });

  await prisma.auditProgram.upsert({
    where: { id: 'seed-program' },
    update: {},
    create: {
      id: 'seed-program',
      tenantId: tenant.id,
      engagementId: engagement.id,
      name: 'FY24 Cloud Operations Program',
      steps: {
        create: [
          {
            title: 'Review resilience policy',
            description: 'Validate policy coverage for outage response',
            procedure: 'Inspect documents and interview owners',
            evidence: 'Policy docs, interview notes',
            sortOrder: 1
          }
        ]
      }
    }
  });

  await prisma.findingFollowUp.upsert({
    where: { id: 'seed-followup' },
    update: {},
    create: {
      id: 'seed-followup',
      tenantId: tenant.id,
      findingId: (await prisma.auditFinding.create({
        data: {
          tenantId: tenant.id,
          engagementId: engagement.id,
          title: 'Outdated failover procedure',
          criteria: 'Procedures must be refreshed annually',
          condition: 'Procedures last updated 3 years ago',
          rating: 'HIGH'
        }
      })).id,
      evidenceRefs: ['s3://evidence/failover-plan.pdf'],
      status: 'IN_PROGRESS'
    }
  });

  await prisma.auditPlan.update({
    where: { id: plan.id },
    data: {
      items: {
        updateMany: {
          where: { planId: plan.id },
          data: { status: 'IN_PROGRESS' }
        }
      }
    }
  });
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
