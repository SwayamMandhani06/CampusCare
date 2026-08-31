variable "gcp_project_id" {
  description = "The GCP Project ID where CampusCare infrastructure will be provisioned."
  type        = string
  # No default value provided — must be explicitly supplied in terraform.tfvars or CLI
}

variable "gcp_region" {
  description = "The GCP region for provisioning resources (e.g. asia-south1 for Mumbai)."
  type        = string
  default     = "asia-south1"
}

variable "gcp_zone" {
  description = "The specific GCP zone within the selected region."
  type        = string
  default     = "asia-south1-a"
}

# Machine Type Selection:
# Note on Cost & Sizing: e2-micro (1 vCPU, 1GB RAM) is too constrained to comfortably host
# three simultaneous Docker containers (NGINX React Frontend, Express Node API, and MongoDB 7).
# We default to e2-medium (2 vCPUs, 4GB RAM) for stability and smooth execution during demonstration.
# With GCP Free Trial credits ($300), an e2-medium instance costs ~ $25/month (~ $0.80/day),
# making it well within credit budget while avoiding Out-Of-Memory (OOM) container crashes.
variable "machine_type" {
  description = "Compute Engine machine type for the CampusCare VM host."
  type        = string
  default     = "e2-medium"
}

variable "ssh_public_key_path" {
  description = "Path to the public SSH key file used for instance access."
  type        = string
  default     = "~/.ssh/campuscare-key.pub"
}

variable "ssh_user" {
  description = "The SSH username created on the Ubuntu instance."
  type        = string
  default     = "campuscare"
}

# Security Notice: 0.0.0.0/0 allows SSH from anywhere.
# In a hardened production environment, restrict this to your specific public IP (e.g. "<YOUR_IP>/32").
variable "allowed_ssh_cidr" {
  description = "CIDR range allowed for inbound SSH access (Port 22)."
  type        = string
  default     = "0.0.0.0/0"
}
