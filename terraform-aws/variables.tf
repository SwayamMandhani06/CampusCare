variable "aws_region" {
  description = "Target AWS region for deploying CampusCare FA2 infrastructure."
  type        = string
  default     = "ap-south-1"
}

variable "instance_type" {
  description = "EC2 instance type for the CampusCare FA2 host."
  type        = string
  default     = "t3.small"
}

variable "ssh_public_key_path" {
  description = "Local filesystem path to the SSH public key for the EC2 instance."
  type        = string
  default     = "~/.ssh/campuscare-aws-key.pub"
}

# NOTE: Allowing 0.0.0.0/0 for SSH is an intentional academic/demo convenience.
# In a production environment, this CIDR block should be restricted to the
# administrator's real public IP address or VPN bastion.
variable "allowed_ssh_cidr" {
  description = "CIDR block permitted to initiate SSH connections (demo default: 0.0.0.0/0)."
  type        = string
  default     = "0.0.0.0/0"
}
