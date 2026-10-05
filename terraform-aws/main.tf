# ==============================================================================
# CampusCare FA2 — AWS Infrastructure Provisioning
# ==============================================================================

# ------------------------------------------------------------------------------
# Ubuntu 22.04 LTS AMI Data Source (Canonical)
# ------------------------------------------------------------------------------
# Dynamically queries the latest official Ubuntu 22.04 LTS (Jammy Jellyfish)
# 64-bit (x86_64) HVM SSD image provided by Canonical for the selected region.
data "aws_ami" "ubuntu_2204" {
  most_recent = true
  owners      = ["099720109477"] # Canonical's official AWS account ID

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# ------------------------------------------------------------------------------
# SSH Key Pair
# ------------------------------------------------------------------------------
# Registers the administrator's existing dedicated public key on AWS.
# The corresponding private key is maintained locally at ~/.ssh/campuscare-aws-key.
# No private keys are generated, managed, or exposed by Terraform.
resource "aws_key_pair" "campuscare_key" {
  key_name   = "campuscare-fa2-key"
  public_key = trimspace(file(pathexpand(var.ssh_public_key_path)))

  tags = {
    Name    = "campuscare-fa2-key"
    Project = "CampusCare"
    Phase   = "FA2"
  }
}

# ------------------------------------------------------------------------------
# Security Group
# ------------------------------------------------------------------------------
resource "aws_security_group" "campuscare_sg" {
  name        = "campuscare-fa2-sg"
  description = "CampusCare FA2 Security Group - SSH, HTTP, HTTPS, and Jenkins CI/CD"

  # Port 22: Administrative SSH access
  # Default CIDR: var.allowed_ssh_cidr (restricted to admin IP in production)
  ingress {
    description = "SSH access"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.allowed_ssh_cidr]
  }

  # Port 80: Inbound HTTP traffic
  # Used by the k3s bundled Traefik reverse proxy/ingress controller
  ingress {
    description = "HTTP access (Traefik ingress)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Port 443: Inbound HTTPS traffic
  # Reserved for TLS termination / secure web access in planned architecture
  ingress {
    description = "HTTPS access"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Port 8080: Jenkins CI/CD Controller
  # NOTE: Exposing Jenkins port 8080 publicly is an intentional academic/demo decision
  # for the GitHub webhook requirement, not an oversight. The FA2 plan explicitly
  # chose port 8080 exposure as the simplest webhook approach.
  ingress {
    description = "Jenkins CI/CD webhook and dashboard access"
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Egress: Allow unrestricted outbound network access
  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name    = "campuscare-fa2-sg"
    Project = "CampusCare"
    Phase   = "FA2"
  }
}

# ------------------------------------------------------------------------------
# EC2 Virtual Machine Instance
# ------------------------------------------------------------------------------
# Single-node host for CampusCare FA2.
# Software provisioning (Docker, k3s, Jenkins, Helm, Prometheus, Grafana)
# will be executed via Ansible in subsequent phases (not via user_data).
resource "aws_instance" "campuscare_vm" {
  ami                    = data.aws_ami.ubuntu_2204.id
  instance_type          = var.instance_type
  key_name               = aws_key_pair.campuscare_key.key_name
  vpc_security_group_ids = [aws_security_group.campuscare_sg.id]

  root_block_device {
    volume_size           = 30
    volume_type           = "gp3"
    delete_on_termination = true

    tags = {
      Name    = "campuscare-fa2-root-volume"
      Project = "CampusCare"
      Phase   = "FA2"
    }
  }

  tags = {
    Name    = "campuscare-fa2-vm"
    Project = "CampusCare"
    Phase   = "FA2"
  }
}
