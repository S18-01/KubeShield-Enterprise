
data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

data "aws_iam_policy_document" "flow_logs_kms" {
  # checkov:skip=CKV_AWS_109:KMS account-root statement enables IAM delegation.
  # checkov:skip=CKV_AWS_111:KMS administrative access follows AWS key policy requirements.
  # checkov:skip=CKV_AWS_356:KMS key policy wildcard resource refers to this key.

  statement {
    sid     = "EnableAccountIAMPermissions"
    effect  = "Allow"
    actions = ["kms:*"]

    principals {
      type = "AWS"
      identifiers = [
        "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
      ]
    }

    resources = ["*"]
  }

  statement {
    sid    = "AllowCloudWatchLogs"
    effect = "Allow"

    principals {
      type = "Service"
      identifiers = [
        "logs.${data.aws_region.current.region}.amazonaws.com"
      ]
    }

    actions = [
      "kms:Encrypt",
      "kms:Decrypt",
      "kms:ReEncrypt*",
      "kms:GenerateDataKey*",
      "kms:DescribeKey"
    ]

    resources = ["*"]

    condition {
      test     = "ArnEquals"
      variable = "kms:EncryptionContext:aws:logs:arn"
      values = [
        "arn:aws:logs:${data.aws_region.current.region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/vpc/${local.name}/flow-logs"
      ]
    }
  }
}

resource "aws_kms_key" "flow_logs" {
  description         = "KMS key for KubeShield VPC flow logs"
  enable_key_rotation = true
  policy              = data.aws_iam_policy_document.flow_logs_kms.json

  tags = {
    Name = "${local.name}-flow-logs-kms"
  }
}
