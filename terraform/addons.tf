
resource "aws_eks_addon" "pod_identity_agent" {
  cluster_name = aws_eks_cluster.kubeshield.name
  addon_name   = "eks-pod-identity-agent"

  depends_on = [
    aws_iam_role_policy_attachment.eks_cluster_policy
  ]
}

resource "aws_eks_addon" "vpc_cni" {
  cluster_name = aws_eks_cluster.kubeshield.name
  addon_name   = "vpc-cni"

  pod_identity_association {
    role_arn        = aws_iam_role.vpc_cni.arn
    service_account = "aws-node"
  }

  depends_on = [
    aws_eks_addon.pod_identity_agent,
    aws_iam_role_policy_attachment.vpc_cni
  ]
}

resource "aws_eks_addon" "coredns" {
  cluster_name = aws_eks_cluster.kubeshield.name
  addon_name   = "coredns"

  depends_on = [
    aws_eks_node_group.kubeshield
  ]
}

resource "aws_eks_addon" "kube_proxy" {
  cluster_name = aws_eks_cluster.kubeshield.name
  addon_name   = "kube-proxy"

  depends_on = [
    aws_eks_node_group.kubeshield
  ]
}
