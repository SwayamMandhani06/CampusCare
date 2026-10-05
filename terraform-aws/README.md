# CampusCare FA2 — AWS Infrastructure (Terraform)

This directory contains the Terraform configuration for provisioning the single-node AWS cloud foundation for **CampusCare FA2**. It is kept completely separate from `/terraform` (which retains the FA1 GCP configuration).

---

## Architecture Overview

**Current FA2 Target Pipeline:**
```text
GitHub
  ↓
Jenkins
  ↓
Docker
  ↓
Docker Hub
  ↓
AWS EC2 (ap-south-1)
  ↓
k3s Kubernetes
  ↓
Traefik Ingress
  ├── Frontend (:80 / :443)
  └── Backend (:5000)
        ↓
      MongoDB

Later Phases:
Prometheus → Grafana → Alerting
```

> [!NOTE]
> **Phase 1 Boundary:** This configuration provisions the underlying **AWS EC2 foundation only** (VM, Security Group, Key Pair, Root Storage).
> - Server configuration (Docker, kubectl, k3s, Helm) will be performed by **Ansible in Phase 2**.
> - Jenkins CI/CD controller will be configured in subsequent phases.
> - Application workloads and Kubernetes manifests will be deployed later.
> - Monitoring (Prometheus & Grafana) will be integrated later.

---

## Infrastructure Specification

| Attribute | Specification | Rationale / Detail |
|---|---|---|
| **Cloud Provider** | AWS | Migration from GCP (FA1) to AWS (FA2) |
| **Region** | `ap-south-1` (Mumbai) | Low latency, primary project region |
| **Instance Type** | `t3.small` (2 vCPU, 2 GB RAM) | CampusCare FA2 host instance type |
| **Operating System** | Ubuntu 22.04 LTS (Jammy Jellyfish) | Dynamic Canonical AMI query (`owner: 099720109477`, x86_64 HVM) |
| **Root Storage** | 30 GB `gp3` SSD | Ample capacity for OS, container images, build caches, and metric storage |
| **SSH Key Pair** | Dedicated `campuscare-fa2-key` | Key file: `~/.ssh/campuscare-aws-key` (public key imported via `~/.ssh/campuscare-aws-key.pub`) |

---

## Security Group Configuration

| Port | Protocol | Source | Purpose | Note |
|---|---|---|---|---|
| `22` | TCP | `var.allowed_ssh_cidr` (Default `0.0.0.0/0`) | Administrative SSH access | Restrict to your public IP in production |
| `80` | TCP | `0.0.0.0/0` | Inbound HTTP web traffic | Routed via k3s bundled Traefik ingress |
| `443` | TCP | `0.0.0.0/0` | Inbound HTTPS web traffic | Reserved for TLS/SSL ingress |
| `8080` | TCP | `0.0.0.0/0` | Jenkins CI/CD controller | **Intentional academic/demo decision** to receive GitHub webhook triggers without tunnel complexity |
| All | All | `0.0.0.0/0` | Outbound (Egress) | Package downloads, image pulls, repository access |

---

## Security Standards & Best Practices

- **Zero Hardcoded Credentials:** AWS credentials must come from your local AWS CLI configuration (`aws configure`) or IAM environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`).
- **Private Key Integrity:** The private SSH key `~/.ssh/campuscare-aws-key` stays exclusively on your local workstation with `chmod 600`. It is never stored or tracked in Git.
- **State Protection:** State files (`*.tfstate`), plan files (`*.tfplan`), and variables (`terraform.tfvars`) are ignored via `.gitignore`.

---

## Manual Execution Workflow (WSL / Local Shell)

Run these commands manually from the `/terraform-aws` directory:

```bash
# 1. Navigate to the AWS Terraform directory
cd /mnt/d/Projects/CampusCare/terraform-aws

# 2. Initialize provider plugins and backend
terraform init

# 3. Format and validate configuration files
terraform fmt
terraform validate

# 4. Preview resource provisioning
terraform plan

# 5. Apply the execution plan to provision the infrastructure
terraform apply
```

### Post-Apply Verification
Once `terraform apply` finishes, note the printed outputs:
- **`public_ip`**: The public IPv4 of your EC2 instance.
- **`ssh_command`**: Ready-to-run SSH command:
  ```bash
  ssh -i ~/.ssh/campuscare-aws-key ubuntu@<PUBLIC_IP>
  ```
