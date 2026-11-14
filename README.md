# KubeShield Enterprise

**Cloud-Native Kubernetes Security, DevSecOps and Observability**

KubeShield Enterprise is a cybersecurity portfolio project demonstrating secure container development, Kubernetes workload hardening, infrastructure as code, automated vulnerability scanning, and application observability.

## Project Status

| Component | Status |
|---|---|
| Flask REST API | Implemented and tested |
| Docker security hardening | Implemented and tested |
| Local Kubernetes deployment | 3 replicas tested |
| Kubernetes security manifests | Implemented and tested |
| Prometheus monitoring | 3 application targets verified UP |
| Grafana dashboard | 4 panels implemented and exported |
| Python automated tests | 16 passed |
| Terraform AWS infrastructure | Defined and statically scanned, not deployed |
| GitHub Actions CI | Configured, latest changes pending verification |

## Technology Stack

- **Application:** Python, Flask, Gunicorn
- **Containers:** Docker, Alpine Linux
- **Orchestration:** Kubernetes, Helm
- **Cloud and Infrastructure:** AWS EKS, ECR, VPC, IAM, KMS, CloudWatch, Terraform
- **Observability:** Prometheus, Grafana, ServiceMonitor
- **Security:** Kubernetes RBAC, NetworkPolicies, Pod Security Standards, Bandit, pip-audit, Checkov, Trivy
- **Automation:** GitHub Actions, pytest

## Architecture

The application runs as three Kubernetes replicas with a dedicated ClusterIP service.

- Application API listens on port 8080.
- A separate monitoring endpoint listens on port 9090.
- Prometheus discovers the monitoring service through a ServiceMonitor.
- Grafana visualizes HTTP request rates, response latency, error rates, and healthy replicas.

Application metrics are not exposed through the public API endpoint.

## Kubernetes Security

The Kubernetes manifests configure:

- Non-root container execution
- Read-only root filesystem
- Dropped Linux capabilities
- Privilege escalation disabled
- Seccomp RuntimeDefault
- Restricted Pod Security Standards
- Dedicated ServiceAccount with token automount disabled
- Least-privilege RBAC
- Default-deny NetworkPolicy
- Explicit application, DNS, and monitoring network rules
- Three application replicas

**Security limitation:** The local Kubernetes environment uses Docker Desktop. NetworkPolicy enforcement has not been fully validated with a policy-enforcing CNI. The existence of NetworkPolicy manifests alone does not prove traffic isolation.

## Prometheus Monitoring

Prometheus was installed using the kube-prometheus-stack Helm chart in the `monitoring` namespace.

The application exposes Prometheus metrics through a dedicated monitoring service.

The ServiceMonitor configuration is located at:

`k8s/monitoring/servicemonitor.yaml`

The Helm values are located at:

`k8s/monitoring/values.yaml`

Three application monitoring targets were verified as UP.

## Grafana Dashboard

Dashboard: **KubeShield Enterprise Security Monitoring**

The dashboard includes four panels:

1. HTTP Requests per Second
2. HTTP Response Latency (P95)
3. HTTP Error Rate
4. Healthy Replicas

The exported Grafana Dashboard API v2 configuration is stored at:

`k8s/monitoring/grafana-dashboard.json`

The dashboard was verified locally. Importing this API v2 export into another Grafana instance may require compatible Grafana provisioning or API support and datasource configuration.

## Automated Security Testing

The GitHub Actions workflow is defined in:

`.github/workflows/security-ci.yml`

The pipeline includes:

1. Python dependency installation
2. Automated pytest tests
3. Bandit static security analysis
4. pip-audit dependency vulnerability scanning
5. Checkov Terraform security scanning
6. Docker image build
7. Trivy image vulnerability scanning

The workflow is configured to run on pushes and pull requests targeting `main`, and supports manual execution.

## Local Verification Results

| Verification | Result |
|---|---|
| pytest | 16 passed |
| Bandit | 0 reported issues |
| pip-audit | No known vulnerabilities found |
| Checkov | 125 passed, 0 failed, 4 skipped |
| Trivy | 0 HIGH or CRITICAL vulnerabilities detected in local v7 image |
| Prometheus | 3 application targets UP |
| Grafana | 4 panels verified |

The four skipped Checkov checks have documented justifications. These exceptions should be reviewed before production deployment.

These results represent local verification. GitHub Actions must be checked separately after the updated code is pushed.

## Run Tests Locally

Create a Python virtual environment and install the development dependencies:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
```

Run the tests:

```powershell
.\.venv\Scripts\python.exe -m pytest -v
```

Run static security checks:

```powershell
.\.venv\Scripts\python.exe -m bandit -r app -ll
.\.venv\Scripts\python.exe -m pip_audit -r requirements.txt
```

## Docker

Build the application image:

```powershell
docker build -t kubeshield-enterprise:local .
```

The container uses a non-root runtime configuration and exposes separate application and monitoring ports.

## Terraform Infrastructure

The Terraform configuration defines AWS infrastructure including:

- Two-availability-zone VPC architecture
- Public and private subnets
- Private EKS worker nodes
- Private EKS API endpoint
- Amazon ECR image repository
- IAM roles and policies
- NAT networking
- VPC Flow Logs
- CloudWatch logging
- KMS encryption

The AWS infrastructure has **not yet been deployed**.

Validate Terraform:

```powershell
terraform -chdir=terraform init -backend=false
terraform -chdir=terraform validate
```

Scan Terraform with Checkov:

```powershell
.\.venv\Scripts\python.exe -c "from checkov.main import Checkov; Checkov().run()" -d terraform --framework terraform --compact
```

## Remaining Work

- Deploy and validate the AWS EKS infrastructure
- Verify worker node bootstrap and VPC CNI configuration
- Validate NetworkPolicy enforcement using a compatible CNI
- Add image provenance and admission controls
- Verify the updated GitHub Actions workflow

## Security Notes

Use this project only in authorized environments.

Never commit credentials, private keys, access tokens, or other secrets.

AWS infrastructure deployment may incur charges.

## Author

**Siddharth Muragundla**

Master of Engineering in Cybersecurity

University of Maryland, College Park
