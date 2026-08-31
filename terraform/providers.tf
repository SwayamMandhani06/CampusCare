terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

# Google Cloud Provider Configuration
# Authentication is managed automatically via Application Default Credentials (ADC).
# Run `gcloud auth application-default login` before executing Terraform.
# Do NOT reference service account JSON keys directly in code.
provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region
  zone    = var.gcp_zone
}
