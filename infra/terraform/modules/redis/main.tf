variable "project" {
  type = string
}

resource "random_password" "redis" {
  length  = 32
  special = false
}

output "connection_string" {
  value = "redis://default:${random_password.redis.result}@example.com:6379"
}
