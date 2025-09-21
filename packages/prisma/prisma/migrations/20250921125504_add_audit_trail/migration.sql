-- CreateEnum
CREATE TYPE "AuditTrailScope" AS ENUM ('TENANT', 'RISK', 'CONTROL', 'ASSESSMENT', 'ENGAGEMENT', 'FINDING', 'REPORT', 'SYSTEM');

-- CreateTable
CREATE TABLE "AuditTrailEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "actorId" TEXT,
    "scope" "AuditTrailScope" NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditTrailEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditTrailEvent_tenantId_scope_idx" ON "AuditTrailEvent"("tenantId", "scope");
CREATE INDEX "AuditTrailEvent_tenantId_entityType_entityId_idx" ON "AuditTrailEvent"("tenantId", "entityType", "entityId");

-- AddForeignKey
ALTER TABLE "AuditTrailEvent" ADD CONSTRAINT "AuditTrailEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditTrailEvent" ADD CONSTRAINT "AuditTrailEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
