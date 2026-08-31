# ==============================================================================
# CampusCare Infrastructure — Compute Engine & Networking
# ==============================================================================

# Query latest official Ubuntu 22.04 LTS Image from Google Cloud
data "google_compute_image" "ubuntu_2204" {
  family  = "ubuntu-2204-lts"
  project = "ubuntu-os-cloud"
}

# ------------------------------------------------------------------------------
# Firewall Rules
# ------------------------------------------------------------------------------

# Allow Inbound Web (Port 80) and Backend API (Port 5000) from anywhere
resource "google_compute_firewall" "allow_http_app" {
  name        = "campuscare-allow-http-app"
  network     = "default"
  description = "Allow inbound HTTP (80) and Backend REST API (5000) to CampusCare server"

  allow {
    protocol = "tcp"
    ports    = ["80", "5000"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["campuscare-server"]
}

# Allow Inbound SSH (Port 22) restricted to allowed_ssh_cidr
resource "google_compute_firewall" "allow_ssh" {
  name        = "campuscare-allow-ssh"
  network     = "default"
  description = "Allow inbound SSH (22) to CampusCare server"

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = [var.allowed_ssh_cidr]
  target_tags   = ["campuscare-server"]
}

# ------------------------------------------------------------------------------
# Compute Engine VM Instance
# ------------------------------------------------------------------------------

resource "google_compute_instance" "campuscare_vm" {
  name         = "campuscare-vm"
  machine_type = var.machine_type
  zone         = var.gcp_zone

  # 30 GB Balanced Persistent Disk with Ubuntu 22.04 LTS
  boot_disk {
    initialize_params {
      image = data.google_compute_image.ubuntu_2204.self_link
      size  = 30
      type  = "pd-balanced"
    }
  }

  # Attach to default VPC with an ephemeral public NAT IP
  network_interface {
    network = "default"

    access_config {
      // Ephemeral public IP assigned automatically
    }
  }

  # Target network tag matching firewall rules
  tags = ["campuscare-server"]

  # Inject SSH Public Key for the configured administrative user
  metadata = {
    ssh-keys = "${var.ssh_user}:${file(pathexpand(var.ssh_public_key_path))}"
  }

  # Resource labeling
  labels = {
    project = "campuscare"
  }
}
