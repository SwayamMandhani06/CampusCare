output "public_ip" {
  description = "Public IPv4 address of the CampusCare FA2 EC2 instance."
  value       = aws_instance.campuscare_vm.public_ip
}

output "ssh_command" {
  description = "Ready-to-use SSH connection command for connecting to the EC2 instance."
  value       = "ssh -i ~/.ssh/campuscare-aws-key ubuntu@${aws_instance.campuscare_vm.public_ip}"
}

output "instance_id" {
  description = "EC2 Instance ID for AWS CLI or console management."
  value       = aws_instance.campuscare_vm.id
}

output "public_dns" {
  description = "Public DNS hostname assigned to the EC2 instance."
  value       = aws_instance.campuscare_vm.public_dns
}
