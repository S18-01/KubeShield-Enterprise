# KubeShield Enterprise

A hands-on Kubernetes and DevSecOps security engineering portfolio project.

## Phase 1
- Flask health, readiness and information endpoints
- Non-root Docker container
- Kubernetes restricted Pod Security configuration
- GitHub Actions security checks

## Run locally
```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements-dev.txt
python -m pytest -q
python -m flask --app app.main run --port 8080
```

Visit `http://127.0.0.1:8080/healthz`.

## Container
```powershell
docker build -t kubeshield-enterprise:local .
docker run --rm -p 8080:8080 kubeshield-enterprise:local
```

## Kubernetes
The `k8s` directory contains initial hardened deployment manifests. Apply them to a cluster after loading or publishing the container image. The container uses a read-only root filesystem, drops Linux capabilities and runs without root privileges.

## Roadmap
Terraform-managed EKS and ECR, image provenance, admission policies, network policies, runtime detection, observability, and reproducible threat simulations.

## Security note
Run security tests only in infrastructure you own or have permission to assess. No AWS credentials or secrets should be committed.
