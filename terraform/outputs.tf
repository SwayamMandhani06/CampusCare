# ==============================================================================
# CampusCare Infrastructure Outputs
# ==============================================================================

output "public_ip" {
  description = "The public IPv4 address assigned to the CampusCare VM instance."
  value       = google_compute_instance.campuscare_vm.network_interface[0].access_config[0].nat_ip
}

output "ssh_command" {
  description = "Formatted SSH connection command to log into the CampusCare VM host."
  value       = "ssh -i ~/.ssh/campuscare-key ${var.ssh_user}@${google_compute_instance.campuscare_vm.network_interface[0].access_config[0].nat_ip}"
}
