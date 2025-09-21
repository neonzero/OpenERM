terraform {
  required_version = ">= 1.5.0"
  required_providers {
    random = {
      source  = "hashicorp/random"
      version = ">= 3.5.1"
    }
  }
}

provider "random" {}

module "network" {
  source  = "../../modules/network"
  project = var.project
}

module "postgres" {
  source  = "../../modules/postgres"
  project = var.project
  region  = var.region
}

module "redis" {
  source  = "../../modules/redis"
  project = var.project
}

variable "project" {
  type    = string
  default = "open-erm"
}

variable "region" {
  type    = string
  default = "us-east-1"
}

output "database_url" {
  value = module.postgres.connection_uri
}

output "redis_url" {
  value = module.redis.connection_string
}
