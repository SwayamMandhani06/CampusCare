# CampusCare FA2 — Phase 2: Ansible Server Configuration

This directory contains the Ansible automation for configuring the single-node AWS EC2 server for **CampusCare FA2**. It prepares a clean, production-ready, idempotent Ubuntu 22.04 base system equipped with Docker Engine, system optimizations, and swap space.

This configuration is completely decoupled from the FA1 GCP Ansible playbook located in `/ansible`.

---

## 1. Purpose of Phase 2

Phase 1 provisioned the bare EC2 virtual machine on AWS. Phase 2 transforms this bare OS instance into a reliable DevOps host ready to host containers, k3s Kubernetes, Jenkins CI/CD, and monitoring stacks in subsequent phases.

Phase 2 focuses strictly on:
- Baseline OS package dependencies.
- Swap allocation (essential for the 1 GB RAM node).
- Kernel and network parameters required for container runtimes.
- Official Docker CE and Docker Compose installation.
- Dedicated application directory `/opt/campuscare`.
- Non-root user privileges for `ubuntu`.

---

## 2. AWS Server Details

| Attribute | Specification |
|---|---|
| **Public IPv4** | `15.207.16.53` |
| **AWS Region** | `ap-south-1` (Mumbai) |
| **Instance Type** | `t3.micro` (2 vCPUs, 1 GiB RAM) |
| **Root Volume** | 30 GB `gp3` SSD |
| **Operating System** | Ubuntu 22.04.5 LTS (Jammy Jellyfish, x86_64) |
| **Remote User** | `ubuntu` (passwordless sudo) |
| **SSH Private Key** | `~/.ssh/campuscare-aws-key` |

---

## 3. Ansible Architecture

```text
[Control Node: WSL / Ubuntu]
       │
       │ SSH (port 22, ~/.ssh/campuscare-aws-key)
       ▼
[Target Node: 15.207.16.53 (t3.micro)]
       │
       ├── Apt Cache & Core Utilities (curl, git, python3-venv, etc.)
       ├── 2 GB Swapfile (/swapfile, swappiness=10, persistent in /etc/fstab)
       ├── Official Docker CE & Docker Compose (systemd cgroup, log-rotation)
       ├── User Permissions (ubuntu added to docker group)
       └── App Base Directory (/opt/campuscare, owner: ubuntu)
```

- **Pipelining:** Enabled in `ansible.cfg` to reduce SSH round-trips over WAN latency.
- **Privilege Escalation:** Automated `sudo` execution without interactive password prompts.
- **Idempotency:** Re-running the playbook produces `changed=0` once the desired state is reached.

---

## 4. Files Created

- **`inventory.ini`**: Defines the `campuscare-server` host entry pointing to `15.207.16.53` using the dedicated AWS deployment key `~/.ssh/campuscare-aws-key`.
- **`ansible.cfg`**: Configures default inventory, disables host key checking for non-interactive execution, enables YAML stdout formatting, task timing, and sudo privilege escalation.
- **`site.yml`**: The primary idempotent playbook configuring packages, swap, Docker CE, application directory, and diagnostics.
- **`README.md`**: Complete documentation, architectural rationale, manual execution instructions, and troubleshooting reference.

---

## 5. What the Playbook Installs & Configures

1. **System & Package Cache:** Updates `apt` cache and installs base CLI utilities (`curl`, `wget`, `git`, `unzip`, `ca-certificates`, `gnupg`, `lsb-release`, `apt-transport-https`, `software-properties-common`, `python3`, `python3-pip`, `python3-venv`).
2. **2 GB Swap Space:** Checks whether swap already exists. If missing, allocates `/swapfile` (2048 MB) using `dd`, applies strict `0600` permissions, formats via `mkswap` only if unformatted, enables with `swapon`, adds an entry to `/etc/fstab`, and sets `vm.swappiness = 10`.
3. **Docker Engine (Official Apt Repository):** Installs official `docker-ce`, `docker-ce-cli`, `containerd.io`, `docker-buildx-plugin`, and `docker-compose-plugin` (no snap).
4. **Docker Daemon Optimization:** Configures `/etc/docker/daemon.json` with systemd cgroup management (`native.cgroupdriver=systemd`), JSON file log rotation (`max-size: 10m`, `max-file: 3`), and `overlay2` storage driver.
5. **User Access:** Appends `ubuntu` to the `docker` group for rootless Docker CLI operations.
6. **Application Directory:** Creates `/opt/campuscare` owned by `ubuntu:ubuntu` (mode `0755`).
7. **Automated Verification:** Checks and prints Docker version, Compose version, system memory, disk usage, and swap status.

> [!NOTE]
> **Kubernetes Kernel & Networking Settings:** Kernel modules (`overlay`, `br_netfilter`) and sysctl parameters (`net.ipv4.ip_forward`, bridge iptables) have been deliberately moved to **Phase 3 (k3s installation)** to maintain strict phase separation.

---

## 6. Why Docker is Installed

- Docker Engine provides the container runtime foundation for building, packaging, and running containerized workloads.
- Even though Kubernetes (k3s) will be installed in a later phase, having Docker Engine and the Docker CLI on the host enables:
  - Building application images locally if needed.
  - Interacting with Docker Hub registries.
  - Consistent developer testing across environments.

---

## 7. Why Swap is Configured

- The AWS instance is a **`t3.micro`** with **1 GiB of physical RAM**.
- Modern DevOps services (container runtimes, background daemons, package managers) frequently encounter momentary memory spikes.
- Without swap space, any burst exceeding 1 GB triggers the Linux Out-Of-Memory (OOM) killer, which abruptly kills processes (like Docker or SSH).
- A **2 GB swapfile** provides a 300% effective memory buffer (1 GB RAM + 2 GB Swap = 3 GB total addressable memory) while using only ~6.6% of the 30 GB root volume.
- Setting `vm.swappiness = 10` ensures Linux aggressively uses physical RAM first and uses swap solely as an emergency safety net.

---

## 8. Why Jenkins, Kubernetes, Prometheus, and Grafana are NOT Installed in this Phase

Following the project's strict phase-wise implementation methodology (PLAN.md):
- **Phase separation:** Infrastructure and base server configuration must be proven solid and verified before deploying orchestration software.
- **Resource conservation:** Running Kubernetes (k3s), Jenkins CI/CD controller, Prometheus, and Grafana simultaneously on a 1 GB node requires careful sequential resource budgeting and tuning.
- **Troubleshooting isolation:** Installing everything in one monolithic step creates cascading failure points where networking, container runtimes, and application code cannot be debugged independently.

---

## 9. Exact Commands to Run the Playbook

Execute these commands manually from your WSL terminal:

```bash
# 1. Navigate to the Phase 2 directory
cd /mnt/d/Projects/CampusCare/ansible-aws

# 2. Verify Ansible CLI version
ansible --version

# 3. Test SSH connectivity and authentication
ansible all -i inventory.ini -m ping

# 4. Execute the idempotent server provisioning playbook
ansible-playbook -i inventory.ini site.yml
```

---

## 10. Verification Commands

After `site.yml` completes successfully (`failed=0`), run these ad-hoc Ansible commands to verify the remote state:

```bash
# Verify Docker CLI version
ansible all -i inventory.ini -m shell -a "docker --version"

# Verify Docker Compose plugin version
ansible all -i inventory.ini -m shell -a "docker compose version"

# Check available memory and swap allocation
ansible all -i inventory.ini -m shell -a "free -h"

# Confirm active swap device
ansible all -i inventory.ini -m shell -a "swapon --show"

# Check root filesystem disk space
ansible all -i inventory.ini -m shell -a "df -h /"

# Verify application directory existence and permissions
ansible all -i inventory.ini -m shell -a "ls -ld /opt/campuscare"
```

---

## 11. Troubleshooting Notes

1. **SSH Permission Denied (`publickey`):**
   - Confirm your private key permissions are restricted:
     ```bash
     chmod 600 ~/.ssh/campuscare-aws-key
     ```
   - Test manual SSH directly:
     ```bash
     ssh -i ~/.ssh/campuscare-aws-key ubuntu@15.207.16.53
     ```
2. **`docker: Got permission denied while trying to connect to the Docker daemon socket`:**
   - Group membership changes in Linux take effect upon new login sessions. If you SSH directly into the instance as `ubuntu`, log out and log back in, or run `newgrp docker`.
3. **APT Lock Contention:**
   - On freshly booted Ubuntu EC2 instances, `cloud-init` or `unattended-upgrades` may briefly hold the APT lock. If apt fails with `Could not get lock /var/lib/dpkg/lock-frontend`, wait 30 seconds and rerun `ansible-playbook -i inventory.ini site.yml`.
