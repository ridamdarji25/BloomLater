resource "aws_iam_role" "ebs_csi" {
  name = "${var.cluster_name}-ebs-csi-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"

    Statement = [
      {
        Effect = "Allow"

        Principal = {
          Service = "pods.eks.amazonaws.com"
        }

        Action = [
          "sts:AssumeRole",
          "sts:TagSession"
        ]
      }
    ]
  })

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_iam_role_policy_attachment" "ebs_csi" {
  role = aws_iam_role.ebs_csi.name

  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy"
}

resource "aws_iam_role_policy" "ebs_csi_describe_az" {
  name = "${var.cluster_name}-ebs-csi-describe-az"
  role = aws_iam_role.ebs_csi.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "ec2:DescribeAvailabilityZones"
        Resource = "*"
      }
    ]
  })
}

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 21.0"

  name               = var.cluster_name
  kubernetes_version = var.cluster_version

  vpc_id = module.vpc.vpc_id

  subnet_ids = module.vpc.public_subnets

  enable_cluster_creator_admin_permissions = true

  endpoint_public_access  = true
  endpoint_private_access = true

  addons = {
    vpc-cni = {
      most_recent    = true
      before_compute = true
    }

    kube-proxy = {
      most_recent = true
    }

    coredns = {
      most_recent = true
    }

    eks-pod-identity-agent = {
      most_recent = true
    }

    aws-ebs-csi-driver = {
      most_recent = true

      pod_identity_association = [
        {
          role_arn        = aws_iam_role.ebs_csi.arn
          service_account = "ebs-csi-controller-sa"
        }
      ]
    }
  }

  eks_managed_node_groups = {
    default = {
      instance_types = [var.node_instance_type]
      min_size       = var.node_min_size
      max_size       = var.node_max_size
      desired_size   = var.node_desired_size
      subnet_ids     = module.vpc.public_subnets
      labels = {
        role = "general"
      }
    }
  }

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}