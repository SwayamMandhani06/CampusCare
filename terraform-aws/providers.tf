terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# AWS Provider Configuration
# Region is defined via variable (default: ap-south-1).
# Credentials must NOT be hardcoded. They are loaded automatically
# from the AWS CLI profile, environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY),
# or standard IAM configuration.
provider "aws" {
  region = var.aws_region
}
