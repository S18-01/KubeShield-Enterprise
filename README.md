# KubeShield Enterprise

**Cloud-Native Kubernetes Security and DevSecOps Engineering**

KubeShield Enterprise is a cybersecurity portfolio project demonstrating container security, Kubernetes workload hardening, infrastructure as code, and automated security testing.

## Project Status

| Component | Status |
|---|---|
| Flask API | Implemented and tested |
| Docker security hardening | Implemented and tested |
| Local Kubernetes deployment | Tested with three replicas |
| Kubernetes security controls | Implemented and tested |
| Terraform AWS infrastructure | Validated, not deployed |
| GitHub Actions CI | Passing |

## Technologies

Python, Flask, Gunicorn, Docker, Kubernetes, Terraform, AWS EKS, ECR, VPC, IAM, CloudWatch, KMS, GitHub Actions, pytest, Bandit, pip-audit, Checkov, Trivy.

## AWS Architecture

Terraform defines a two-availability-zone VPC with public and private subnets, private EKS worker nodes, a private EKS API endpoint, ECR image scanning, IAM roles, NAT networking, VPC Flow Logs, CloudWatch logging, and KMS encryption.

The AWS environment has not yet been deployed.

## Kubernetes Security

\- Non-root container execution

\- Read-only root filesystem

\- Linux capabilities dropped

\- Privilege escalation disabled

\- Seccomp RuntimeDefault

\- Restricted Pod Security Standards

\- Dedicated ServiceAccount with token automount disabled

\- Least-privilege RBAC

\- Default-deny NetworkPolicy with limited ingress

\- Three application replicas

NetworkPolicy enforcement has not been fully validated.

## CI/CD Security Pipeline

GitHub Actions runs Python tests, Kubernetes security tests, Bandit, pip-audit, Checkov, Docker builds, and Trivy scanning.

The latest workflow passed successfully.

## Terraform Security Results

| Checkov result | Count |
|---|---:|
| Passed | 125 |
| Failed | 0 |
| Skipped | 4 |

The skipped checks are documented exceptions. Terraform validation passed.

## Run Locally

Create and activate a Python virtual environment, install requirements-dev.txt, and run pytest.

Start the Flask application using:

&#x20;   python -m flask --app app.main run --port 8080

Health endpoint: http://127.0.0.1:8080/healthz

Readiness endpoint: http://127.0.0.1:8080/readyz

Build the Docker image using:

&#x20;   docker build -t kubeshield-enterprise:local .

Validate Terraform using:

&#x20;   terraform -chdir=terraform validate

Scan Terraform using:

&#x20;   checkov -d terraform --framework terraform --compact

## Remaining Work

\- Deploy and validate AWS EKS

\- Verify VPC CNI and worker node bootstrap

\- Test effective NetworkPolicy enforcement

\- Add runtime monitoring and observability

\- Implement image provenance and admission policies

## Security Notes

Use this project only in authorized environments. Never commit credentials or secrets. AWS infrastructure can incur charges.

## Author

Siddharth Muragundla

Master of Engineering in Cybersecurity

University of Maryland, College Park

