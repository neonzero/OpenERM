variable "project" {
  type        = string
  description = "Project name"
}

variable "region" {
  type        = string
  description = "Cloud region"
}

resource "random_password" "postgres" {
  length  = 32
  special = true
}

output "connection_uri" {
  value = "postgresql://postgres:${random_password.postgres.result}@example.com:5432/${var.project}"
}
