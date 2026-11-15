

\# KubeShield Enterprise

\## Technical Architecture and Security Design



\### 1. System Overview



KubeShield Enterprise is a cloud-native security engineering project combining Kubernetes workload hardening, automated security testing, infrastructure as code, and observability.



The verified runtime uses Docker Desktop Kubernetes. AWS EKS infrastructure is defined in Terraform but has not been deployed.



The system consists of:



\- Python Flask REST API

\- Docker container runtime

\- Kubernetes application deployment

\- Prometheus monitoring

\- Grafana visualization

\- Next.js security dashboard

\- GitHub Actions DevSecOps pipeline

\- Terraform AWS infrastructure definitions



\[View Architecture Diagram](architecture-diagram.md)



\### 2. Application Architecture



The application is developed using Python Flask and runs with Gunicorn inside an Alpine Linux container.



The Kubernetes deployment uses three application replicas behind a ClusterIP service.



The application exposes an HTTP API on port 8080 and a separate monitoring endpoint on port 9090.



Separating application and monitoring traffic supports more controlled service access and observability.



\### 3. Container Security Architecture



The container and Kubernetes workload configurations include:



\- Non-root execution

\- Read-only root filesystem

\- Disabled privilege escalation

\- Dropped Linux capabilities

\- Seccomp RuntimeDefault

\- Restricted Pod Security Standards



These controls reduce unnecessary privileges and limit potential container attack surfaces.



They do not eliminate application vulnerabilities or guarantee isolation from the host.



\### 4. Kubernetes Access and Network Security



The Kubernetes configuration includes a dedicated ServiceAccount with token automount disabled.



Least-privilege RBAC and NetworkPolicy manifests are defined to restrict access and network communication.



The networking configuration includes default-deny policies and explicit rules for application, DNS, and monitoring traffic.



\*\*Validation limitation:\*\* NetworkPolicy enforcement has not been verified with a policy-enforcing CNI in the local Docker Desktop environment.



\### 5. Observability Architecture



Prometheus and Grafana run in the Kubernetes monitoring namespace.



The monitoring integration uses the kube-prometheus-stack Helm chart and a ServiceMonitor.



The application monitoring service provides metrics to Prometheus.



Three application monitoring targets were verified as UP.



Grafana queries Prometheus to visualize:



\- HTTP requests per second

\- P95 response latency

\- HTTP error rate

\- Healthy application replicas



The Grafana dashboard export is stored at:



`k8s/monitoring/grafana-dashboard.json`



\### 6. Next.js Monitoring Architecture



The frontend uses Next.js, React, TypeScript, Tailwind CSS, and Recharts.



The local dashboard requests monitoring information from:



`/api/metrics`



The server-side API queries the local Prometheus service.



The dashboard supports:



\- HTTP request throughput

\- Historical response latency

\- Monitoring connection status

\- Kubernetes workload information

\- Security and CI/CD information



The frontend periodically refreshes monitoring information.



Historical charts display measurements retrieved from Prometheus rather than fabricated live telemetry.



\### 7. Public Deployment Boundary



The public frontend is deployed on Vercel.



The public deployment does not have direct access to the local Kubernetes cluster or Prometheus service.



When monitoring is unavailable, the dashboard displays an offline state.



This avoids presenting unavailable public telemetry as live monitoring.



The public frontend is a demonstration interface, not a remotely accessible Kubernetes administration console.



\### 8. DevSecOps Pipeline



The configured GitHub Actions pipeline performs:



1\. Python dependency installation

2\. pytest automated tests

3\. Bandit static analysis

4\. pip-audit dependency scanning

5\. Checkov Terraform scanning

6\. Docker image build

7\. Trivy vulnerability scanning



The workflow is defined at:



`.github/workflows/security-ci.yml`



Local test results and CI execution results must be verified independently.



\### 9. Infrastructure as Code



Terraform defines a proposed AWS architecture containing:



\- VPC with public and private subnets

\- Private EKS worker nodes

\- Private EKS API endpoint

\- ECR container registry

\- IAM roles and policies

\- VPC Flow Logs

\- CloudWatch logging

\- KMS encryption

\- NAT networking



Terraform configurations have been statically scanned but the AWS infrastructure has not been deployed.



\### 10. Verified Security Results



| Verification | Local Result |

|---|---|

| pytest | 16 passed |

| Bandit | 0 reported issues |

| pip-audit | No known vulnerabilities found |

| Checkov | 125 passed, 0 failed, 4 skipped |

| Trivy | 0 HIGH or CRITICAL vulnerabilities in the local v7 image |

| Prometheus | 3 targets UP |

| Grafana | 4 panels verified |

| Next.js | Production build successful |



These results are point-in-time observations and may change with dependency updates, configuration changes, or subsequent builds.



\### 11. Known Limitations



\- AWS EKS deployment has not been performed.

\- NetworkPolicy enforcement is not fully verified.

\- Image provenance and admission controls are not implemented.

\- Public live monitoring is not configured.

\- The latest GitHub Actions execution results require verification.



\### 12. Future Security Improvements



\- Validate NetworkPolicy enforcement using a compatible CNI.

\- Implement container image signing and provenance.

\- Add Kubernetes admission policies.

\- Validate AWS EKS infrastructure in an authorized environment.

\- Improve automated security regression testing.

\- Evaluate secure remote monitoring architecture.



\### 13. Security Design Principles



The project follows several security engineering principles:



\- Least privilege

\- Defense in depth

\- Secure-by-default workload configuration

\- Automated vulnerability detection

\- Separation of application and monitoring traffic

\- Infrastructure validation before deployment

\- Explicit documentation of unverified controls



\### 14. Conclusion



KubeShield Enterprise demonstrates practical experience integrating container security, Kubernetes workload configuration, security automation, and observability.



Its verified local deployment provides a reproducible environment for security engineering experiments, while Terraform defines a potential future AWS deployment.



The project distinguishes implemented controls from verified enforcement and future infrastructure work.
