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

  const user = await prisma.user.upsert({
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
  });

  await prisma.riskCategory.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'Operational' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Operational'
    }
  });

  await prisma.auditEngagement.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'FY24-IA-01' } },
    update: {},
    create: {
      tenantId: tenant.id,
      code: 'FY24-IA-01',
      name: 'Enterprise Risk Review',
      status: 'PLANNING',
      ownerId: user.id
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
