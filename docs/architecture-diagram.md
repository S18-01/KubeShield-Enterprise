

\# KubeShield Enterprise Architecture Diagram



This diagram represents the verified local Kubernetes deployment, monitoring stack, security scanning workflow, and public dashboard.



```mermaid

flowchart TB

&#x20;   User\["User / Browser"]



&#x20;   subgraph Public\["Public Dashboard"]

&#x20;       Vercel\["Vercel Hosting"]

&#x20;       NextPublic\["Next.js Dashboard"]

&#x20;       Offline\["Monitoring Offline Fallback"]

&#x20;       Vercel --> NextPublic --> Offline

&#x20;   end



&#x20;   subgraph Local\["Local Development Environment"]

&#x20;       NextLocal\["Next.js Dashboard"]

&#x20;       MetricsAPI\["Next.js Metrics API"]

&#x20;       Prometheus\["Prometheus"]

&#x20;       Grafana\["Grafana"]



&#x20;       subgraph Kubernetes\["Docker Desktop Kubernetes"]

&#x20;           Service\["Application ClusterIP Service"]

&#x20;           Pod1\["Flask API Pod 1"]

&#x20;           Pod2\["Flask API Pod 2"]

&#x20;           Pod3\["Flask API Pod 3"]

&#x20;           Monitor\["Monitoring Service / ServiceMonitor"]



&#x20;           Service --> Pod1

&#x20;           Service --> Pod2

&#x20;           Service --> Pod3



&#x20;           Pod1 --> Monitor

&#x20;           Pod2 --> Monitor

&#x20;           Pod3 --> Monitor

&#x20;       end



&#x20;       NextLocal --> MetricsAPI

&#x20;       MetricsAPI -->|"PromQL Queries"| Prometheus

&#x20;       Prometheus -->|"Scrapes Metrics"| Monitor

&#x20;       Grafana -->|"Queries"| Prometheus

&#x20;   end



&#x20;   subgraph Security\["DevSecOps Security Pipeline"]

&#x20;       GitHub\["GitHub Repository"]

&#x20;       Actions\["GitHub Actions"]

&#x20;       Tests\["pytest / Bandit / pip-audit"]

&#x20;       IaC\["Checkov Terraform Scan"]

&#x20;       ImageScan\["Docker Build / Trivy Scan"]



&#x20;       GitHub --> Actions

&#x20;       Actions --> Tests

&#x20;       Actions --> IaC

&#x20;       Actions --> ImageScan

&#x20;   end



&#x20;   User --> NextPublic

&#x20;   User --> NextLocal

```



\## Architecture Notes



\- The verified application deployment runs on local Docker Desktop Kubernetes.

\- The Flask application runs as three replicas behind an internal ClusterIP service.

\- Prometheus scrapes application metrics through the monitoring service.

\- Grafana queries Prometheus for operational dashboards.

\- The local Next.js dashboard retrieves Prometheus measurements through a server-side API.

\- The public Vercel dashboard uses an offline fallback instead of accessing local Prometheus.

\- GitHub Actions defines automated testing and security scanning.

\- Terraform defines a proposed AWS EKS infrastructure, which has not been deployed.

\- NetworkPolicy enforcement remains unverified in the local environment.
