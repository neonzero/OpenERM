# Terraform Infrastructure Scaffolding

This directory contains Terraform modules and an example environment configuration to provision the
OpenERM platform. The modules are intentionally lightweight for the MVP milestone and should be
extended with provider-specific resources when deploying to production.

## Modules

- `network`: defines foundational networking primitives (e.g., VPC, subnets, security groups).
- `postgres`: provisions a managed PostgreSQL cluster with secrets suitable for Prisma + RLS.
- `redis`: provisions a cache layer used for session storage, rate limiting, and queue backpressure.

## Usage

```sh
cd infra/terraform/envs/dev
terraform init
terraform apply
```

Outputs provide connection strings consumed by the NestJS API and Next.js frontend via environment
variables.
