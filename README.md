# KubeShield Enterprise

### Cloud-Native Kubernetes Security, DevSecOps and Observability

A security-focused Kubernetes engineering project combining container hardening, automated vulnerability scanning, infrastructure as code, workload security, and real-time application observability.

**[Live Dashboard](https://kube-shield-enterprise.vercel.app)** | **[GitHub Repository](https://github.com/S18-01/KubeShield-Enterprise)**

## Overview

KubeShield Enterprise demonstrates the design, deployment, monitoring, and security validation of a containerized Python application running on Kubernetes.

The project combines application security, cloud infrastructure design, DevSecOps automation, and observability into a single engineering environment.

The Flask application is deployed locally with three Kubernetes replicas. Prometheus collects application metrics, Grafana provides monitoring dashboards, and a Next.js frontend visualizes operational and security information.

The public dashboard is hosted on Vercel. Live Prometheus telemetry is available in the local environment, while the public deployment displays an offline monitoring state because it cannot access the local Kubernetes cluster.

## Project Highlights

- Deployed a hardened Flask application with three Kubernetes replicas.
- Implemented non-root containers, read-only root filesystems, restricted capabilities, and seccomp controls.
- Configured Kubernetes RBAC, dedicated ServiceAccounts, Pod Security Standards, and NetworkPolicy manifests.
- Integrated Prometheus and Grafana for application monitoring.
- Built a Next.js monitoring interface displaying real HTTP traffic and latency history locally.
- Automated testing and security scanning using GitHub Actions, pytest, Bandit, pip-audit, Checkov, and Trivy.
- Developed Terraform configurations for a security-focused AWS EKS architecture.
- Published an interactive frontend using Vercel.
- Added five security scanners, a public read-only Demo Lab, and an authenticated Security Portal with saved scan history.

## Interactive Security Scanning Platform

The Next.js dashboard includes a public **Demo Lab** with predefined, read-only examples and an authenticated **Security Portal** for scanning user-supplied configuration files. Scan results include a rule-based security score from 0 to 100, severity breakdowns, findings, and remediation guidance. The Security Portal supports private scan history through Supabase.

| Scanner | Input | Analysis |
|---|---|---|
| Kubernetes configuration | `.yaml`, `.yml` | Workload and container configuration risks |
| Dockerfile | `Dockerfile`, `.dockerfile` | Unsafe build instructions, root execution, unpinned base images |
| Terraform | `.tf` | Selected infrastructure misconfigurations and exposure patterns |
| AWS IAM | `.json` | Overly broad permissions and risky policy patterns |
| Dependencies | `requirements.txt`, `package.json` | Known vulnerability lookups through the OSV service for supported pinned dependencies |

### Scan Workflow

1. Choose a scanner in the Demo Lab or authenticated Security Portal.
2. Review the read-only example, or supply a supported configuration file in the Security Portal.
3. Run the relevant scanner and review its score, severity charts, findings, and suggested remediations.
4. In the Security Portal, save results to private scan history for later review.

### Scanner Limitations

- Configuration scanning is rule-based and does not prove a workload or infrastructure is secure.
- A score of 100 means no issues were detected by the implemented checks, not that a resource is vulnerability-free.
- Dependency scanning depends on OSV availability and supported package/version information. A failed lookup or unsupported dependency is not evidence of safety.
- The public Demo Lab runs on predefined examples and does not deploy workloads or modify infrastructure.
- The AWS EKS architecture described below is Terraform-defined and has not been deployed.

## Technology Stack

| Category | Technologies |
|---|---|
| Application | Python, Flask, Gunicorn |
| Frontend | Next.js, React, TypeScript, Tailwind CSS, Recharts |
| Containers | Docker, Alpine Linux |
| Orchestration | Kubernetes, Helm |
| Observability | Prometheus, Grafana, ServiceMonitor |
| Infrastructure as Code | Terraform |
| AWS Infrastructure Design | EKS, ECR, VPC, IAM, KMS, CloudWatch |
| Security | RBAC, NetworkPolicies, Pod Security Standards, Trivy, Bandit, pip-audit, Checkov |
| CI/CD | GitHub Actions |
| Testing | pytest |
| Hosting | Vercel |
| Authentication and scan storage | Supabase |
| Dependency vulnerability data | OSV |

## System Architecture

### Architecture Diagram

[View KubeShield Enterprise Architecture Diagram](docs/architecture-diagram.md)

The diagram illustrates the local Kubernetes deployment, three Flask API replicas, Prometheus and Grafana monitoring, Next.js dashboard, Vercel deployment, and DevSecOps security pipeline.

### Technical Architecture Documentation

[View Detailed Architecture and Security Design](docs/architecture.md)

This document covers application architecture, Kubernetes security controls, monitoring data flows, CI/CD security scanning, AWS infrastructure design, and known security limitations.

KubeShield Enterprise consists of four main components.

**1. Application Layer**

A Python Flask REST API runs inside a hardened Docker container.

The application is deployed to Kubernetes with three replicas and exposed internally through a ClusterIP service.

**2. Kubernetes Security Layer**

The Kubernetes deployment applies container and workload security controls, including non-root execution, restricted privileges, seccomp, RBAC, and network security manifests.

**3. Observability Layer**

Prometheus discovers application metrics through a Kubernetes ServiceMonitor.

Grafana visualizes application performance, error rates, and replica availability.

**4. Dashboard Layer**

A Next.js frontend displays monitoring and security information.

In the local environment, a Next.js API route queries Prometheus and provides historical HTTP request throughput and average response latency measurements.

The public Vercel deployment intentionally does not connect to local Prometheus services.

### Architecture Flow

```text
                    User / Browser
                          |
                          v
                  Next.js Dashboard
                    (Local / Vercel)
                          |
                    Local Metrics API
                          |
                          v
                       Prometheus
                          |
                     ServiceMonitor
                          |
                          v
                 Kubernetes Cluster
                          |
                    ClusterIP Service
                          |
               +----------+----------+
               |          |          |
            Flask API  Flask API  Flask API
              Pod 1      Pod 2      Pod 3

                 Prometheus Metrics
                          |
                          v
                        Grafana
```

This diagram represents the local monitoring architecture. The public Vercel deployment does not have access to the local Prometheus instance.

## Kubernetes Security Architecture

The Kubernetes manifests implement the following security controls.

### Container Security

- Non-root container execution
- Read-only root filesystem
- Linux capabilities dropped
- Privilege escalation disabled
- Seccomp RuntimeDefault
- Hardened container configuration

### Workload Security

- Restricted Pod Security Standards
- Dedicated Kubernetes ServiceAccount
- Service account token automount disabled
- Least-privilege RBAC configuration
- Three application replicas

### Network Security

- Default-deny NetworkPolicy manifests
- Explicit application traffic rules
- DNS access rules
- Monitoring traffic rules
- Internal ClusterIP services

**Important limitation:** NetworkPolicy enforcement has not been fully validated in Docker Desktop Kubernetes using a policy-enforcing CNI. Configured policies should not be interpreted as verified network isolation.

## Monitoring and Observability

Prometheus and Grafana are deployed locally using the `kube-prometheus-stack` Helm chart in the `monitoring` namespace.

Three application monitoring targets were verified as UP.

### Prometheus

The application exposes metrics through a dedicated monitoring endpoint and service.

Configuration files:

- `k8s/monitoring/servicemonitor.yaml`
- `k8s/monitoring/values.yaml`

### Grafana

The Grafana dashboard, **KubeShield Enterprise Security Monitoring**, includes:

1. HTTP Requests per Second
2. HTTP Response Latency (P95)
3. HTTP Error Rate
4. Healthy Replicas

Dashboard export:

`k8s/monitoring/grafana-dashboard.json`

The exported dashboard uses Grafana Dashboard API v2. Importing it into another Grafana environment may require compatible provisioning and datasource configuration.

### Next.js Monitoring Dashboard

The Next.js frontend includes:

- Live HTTP traffic metrics
- Historical request throughput chart
- Historical average response latency chart
- Monitoring connection status
- Kubernetes and security information
- CI/CD pipeline overview

The local monitoring API retrieves approximately 60 minutes of historical Prometheus measurements at one-minute intervals.

**Deployment behavior**

| Environment | Monitoring |
|---|---|
| Local development | Live Prometheus integration |
| Public Vercel deployment | Offline fallback |
| AWS EKS | Infrastructure defined but not deployed |

The public dashboard does not expose Prometheus or Kubernetes administration endpoints.


### Public Monitoring with Supabase and Vercel

KubeShield Enterprise provides a public monitoring dashboard hosted on Vercel.

**Monitoring data flow:**

1. Kubernetes runs the KubeShield API using three replicas.
2. Prometheus collects application metrics from the Kubernetes workloads.
3. A PowerShell publisher queries Prometheus and prepares monitoring snapshots.
4. The publisher uploads snapshots to a Supabase PostgreSQL table.
5. The Vercel-hosted Next.js API retrieves the latest snapshot.
6. The public dashboard displays HTTP traffic, response latency, replica health, and monitoring status.

**Live monitoring behavior:**

- The publisher runs approximately every 60 seconds.
- The dashboard refreshes its monitoring data every 15 seconds.
- Snapshots older than three minutes are treated as unavailable.
- The public dashboard remains accessible when local monitoring is offline.
- Fresh monitoring requires the local Kubernetes cluster, Prometheus connection, and publisher to be running.

**Automated Windows startup:**

The `scripts/start-monitoring.ps1` launcher is configured through Windows Task Scheduler to start at user sign-in.

The launcher reads `KUBESHIELD_SUPABASE_KEY` from the Windows User environment variables and executes `scripts/publish-metrics.ps1` repeatedly.

The Supabase secret key must also be configured securely in Vercel as a server-side environment variable.

Never commit credentials or environment-variable values to GitHub.

**Deployment architecture:**

- Kubernetes: Docker Desktop local cluster
- Application monitoring: Prometheus
- Metrics visualization: Grafana and Next.js
- Monitoring data storage: Supabase PostgreSQL
- Public dashboard hosting: Vercel
- Metrics publishing automation: Windows Task Scheduler

The AWS EKS infrastructure is defined separately using Terraform and has not been deployed as part of the public demonstration.

## DevSecOps and CI/CD

The GitHub Actions workflow is defined in:

`.github/workflows/security-ci.yml`

The configured pipeline includes:

1. Python dependency installation
2. Automated pytest testing
3. Bandit static application security analysis
4. pip-audit dependency vulnerability scanning
5. Checkov Terraform security scanning
6. Docker image build
7. Trivy container vulnerability scanning

The workflow supports pushes and pull requests targeting `main`, as well as manual execution.

Successful local verification does not independently confirm the status of every GitHub Actions run.

## Security Verification Results

The following results were obtained during local project verification.

| Security Check | Verified Result |
|---|---|
| Python automated tests | 16 passed |
| Bandit | 0 reported issues |
| pip-audit | No known vulnerabilities found |
| Checkov | 125 passed, 0 failed, 4 skipped |
| Trivy | 0 HIGH or CRITICAL vulnerabilities detected in the local v7 image |
| Prometheus | 3 application targets UP |
| Grafana | 4 monitoring panels verified |
| Next.js | Production build passed |

The four skipped Checkov checks have documented justifications and should be reviewed before production deployment.

These results are verification snapshots, not guarantees that future dependency versions or builds will remain vulnerability-free.

## Run Locally

### Prerequisites

- Python
- Docker Desktop
- Kubernetes enabled in Docker Desktop
- kubectl
- Helm
- Node.js and npm
- Terraform, for infrastructure validation

### Install Python Dependencies

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
```

### Run Tests

```powershell
.\.venv\Scripts\python.exe -m pytest -v
```

### Run Security Scans

```powershell
.\.venv\Scripts\python.exe -m bandit -r app -ll
.\.venv\Scripts\python.exe -m pip_audit -r requirements.txt
```

### Build the Docker Image

```powershell
docker build -t kubeshield-enterprise:local .
```

### Verify Kubernetes

```powershell
kubectl get nodes
kubectl get pods -n kubeshield
kubectl get services -n kubeshield
```

### Access Prometheus Locally

```powershell
kubectl port-forward -n monitoring svc/kubeshield-monitoring-kube-prometheus 9090:9090
```

Prometheus is then accessible at:

`http://localhost:9090`

### Start the Frontend

From the repository root:

```powershell
cd frontend
npm install
npm run dev -- --port 3005
```

Open:

`http://localhost:3005`

Live metrics require the Kubernetes application, Prometheus, and the port-forward connection to be running.

These instructions cover verification and access to an existing local deployment. Initial Kubernetes and monitoring installation requires the project's manifests and Helm configuration.

## AWS Infrastructure Design

Terraform configurations define a security-focused AWS environment.

Components include:

- Two-availability-zone VPC architecture
- Public and private subnets
- Private EKS worker nodes
- Private EKS API endpoint
- Amazon ECR repository
- IAM roles and policies
- NAT networking
- VPC Flow Logs
- CloudWatch logging
- KMS encryption

**Deployment status:** AWS infrastructure is defined and statically scanned but has not been deployed.

### Terraform Validation

```powershell
terraform -chdir=terraform init -backend=false
terraform -chdir=terraform validate
```

### Checkov Scanning

```powershell
.\.venv\Scripts\python.exe -c "from checkov.main import Checkov; Checkov().run()" -d terraform --framework terraform --compact
```

AWS infrastructure deployment can incur charges. Local Kubernetes is used for the verified runtime environment.

## Future Enhancements

- Deploy and validate the Terraform AWS EKS infrastructure when appropriate.
- Verify worker node bootstrap and VPC CNI configuration.
- Validate NetworkPolicy enforcement with a compatible CNI.
- Implement image provenance and admission controls.
- Review GitHub Actions execution results for the latest commits.
- Evaluate secure remote telemetry for the public dashboard.

## Security Considerations

This project is intended for educational and authorized security engineering environments.

Never commit credentials, private keys, access tokens, or other secrets.

The local Kubernetes monitoring services are not publicly exposed by the Vercel frontend.

Infrastructure and security configurations should be independently validated before use in production.

## Author

**Siddharth Muragundla**

Master of Engineering in Cybersecurity

University of Maryland, College Park
