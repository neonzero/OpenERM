# Workflow Alignment

This document connects the platform's data flow, persistence model, and user interfaces to the functional workflow for
Risk Management, Internal Audit, and Governance.

## Data flow alignment

### Risk Management lane
1. **Risk identification** – New register entries are created through the risk service (API or CSV import) which applies
tenant appetite settings and records audit events, while questionnaires capture periodic disclosures tied back to risks.
   【F:apps/api/src/risk/risk.service.ts†L286-L417】【F:apps/api/src/risk/risk.service.ts†L585-L640】
2. **Risk assessment** – Matrix scoring updates residual values, appetite breaches, and the audit trail when assessments
are submitted, ensuring prioritisation data is shared downstream.【F:apps/api/src/risk/risk.service.ts†L326-L389】
3. **Risk evaluation & prioritisation** – Key risks and appetite breaches are surfaced through prioritised rankings and
register reports that include owner, treatment, and indicator context for governance reviews.【F:apps/api/src/risk/risk.service.ts†L698-L871】
4. **Risk treatment / mitigation** – Action plans with task breakdowns enforce workflow transitions, propagate verified
residual scores back to the risk, and emit lifecycle events for monitoring.【F:apps/api/src/risk/risk.service.ts†L468-L582】
5. **Monitoring & KRIs/KPIs** – Indicators store thresholds, capture readings, mark breaches, and feed the tenant heat
map used by dashboards and alerts.【F:apps/api/src/risk/risk.service.ts†L748-L995】

### Internal Audit lane
1. **Audit universe & plan** – Universe entities maintain risk linkages, while audit plans materialise risk-weighted
engagements using deterministic enrichment of residual scores and criticality.【F:apps/api/src/audit/audit.service.ts†L48-L235】【F:apps/api/src/audit/audit.service.ts†L1059-L1099】
2. **Engagement planning** – Draft scopes leverage linked risks and knowledge base items, and audit programmes maintain
versioned steps aligned to the RACM structure.【F:apps/api/src/audit/audit.service.ts†L237-L347】【F:apps/api/src/audit/audit.service.ts†L736-L804】【F:apps/api/src/audit/planning/planning.provider.ts†L1-L115】
3. **RACM & working papers** – RACM versions are snapshotted per update, while evidence uploads capture checksums and
signatures for integrity.【F:apps/api/src/audit/audit.service.ts†L298-L413】
4. **Fieldwork, findings, and follow-up** – Findings, recommendations, follow-up actions, and timesheet utilisation are
captured with immutable events to support closure tracking and capacity analytics.【F:apps/api/src/audit/audit.service.ts†L415-L666】
5. **Reporting** – Report templates, PDF generation, and engagement listings expose the same datasets for governance
consumption and close-out reviews.【F:apps/api/src/audit/audit.service.ts†L813-L938】

### Governance, reporting & feedback
1. **Dashboards & heatmaps** – The audit dashboard aggregates risk heat maps, plan progress, utilisation, findings ageing,
and follow-up metrics for executive monitoring.【F:apps/api/src/audit/audit.service.ts†L940-L1052】
2. **Reports (PDF)** – Generated reports reuse audit plan, engagement, finding, and risk data, storing checksums and
object references for assurance evidence.【F:apps/api/src/audit/audit.service.ts†L850-L909】
3. **Continuous improvement** – Engagement enrichment feeds risk scores and linked risk identifiers back into planning,
ensuring updated taxonomies drive the next identification cycle.【F:apps/api/src/audit/audit.service.ts†L1059-L1099】

## Database alignment

| Workflow stage | Primary Prisma models | Purpose |
| --- | --- | --- |
| Risk identification & assessment | `Risk`, `Assessment`, `Questionnaire`, `QuestionnaireResponse` | Store register entries, scoring outcomes, and periodic disclosure responses per tenant.【F:packages/prisma/prisma/schema.prisma†L66-L164】 |
| Treatment & monitoring | `Treatment`, `TreatmentTask`, `RiskIndicator`, `IndicatorReading` | Persist mitigation plans, task workflows, KPI definitions, and readings with breach flags.【F:packages/prisma/prisma/schema.prisma†L112-L190】 |
| Audit planning & universe | `AuditUniverse`, `AuditPlan`, `Engagement` | Maintain entity catalogue, period plans, and risk-weighted engagements linked to tenants.【F:packages/prisma/prisma/schema.prisma†L206-L254】 |
| Fieldwork execution | `RACMLine`, `WorkingPaper`, `AuditProgram`, `AuditProgramStep` | Version RACM structures, capture signed evidence, and manage engagement programme revisions.【F:packages/prisma/prisma/schema.prisma†L256-L380】 |
| Findings, follow-up & utilisation | `Finding`, `FollowUp`, `Timesheet`, `LibraryItem` | Track remediation status, verification details, time entries, and supporting knowledge assets.【F:packages/prisma/prisma/schema.prisma†L284-L349】 |
| Governance & reporting | `ReportTemplate`, `Report`, `Event` | Generate templated outputs and maintain audit-trail events for every workflow action.【F:packages/prisma/prisma/schema.prisma†L382-L417】 |

## Screen flow alignment

- **Risk workspace** – The risk register page surfaces appetite breaches, heat maps, top residual risks, and the detailed
table sourced from the risk service, matching the RM swimlane stages.【F:apps/web/src/app/(app)/risk/page.tsx†L1-L286】
- **Audit workspace** – The audit hub highlights plan execution, findings ageing, follow-ups, utilisation, and engagement
timelines aligned with the IA swimlane activities.【F:apps/web/src/app/(app)/audit/page.tsx†L1-L155】
- **Executive dashboard** – The cross-lane dashboard blends risk metrics, audit progress, and follow-up status to mirror the
governance lane outputs.【F:apps/web/src/app/(app)/dashboard/page.tsx†L1-L359】

## Closed-loop interactions

- Risk indicators and residual scores feed the audit dashboard and executive overview through shared heat-map and top-risk
data sources.【F:apps/api/src/risk/risk.service.ts†L931-L995】【F:apps/api/src/audit/audit.service.ts†L940-L1052】【F:apps/web/src/app/(app)/dashboard/page.tsx†L254-L359】
- Audit planning enriches engagement priority with linked risk scores, ensuring governance updates loop back into the next
risk identification cycle.【F:apps/api/src/audit/audit.service.ts†L1059-L1099】
- Generated reports and events provide immutable artefacts for closing treatments and audit issues, aligning governance
outputs with remediation monitoring.【F:apps/api/src/audit/audit.service.ts†L850-L909】【F:packages/prisma/prisma/schema.prisma†L382-L417】
