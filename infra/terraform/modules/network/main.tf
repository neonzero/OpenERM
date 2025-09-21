variable "project" {
  type = string
}

output "vpc_id" {
  value = "vpc-${var.project}"
}
