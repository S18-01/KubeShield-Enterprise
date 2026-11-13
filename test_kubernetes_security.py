
from pathlib import Path
import yaml

SECURITY_DIR = Path(__file__).parent / "k8s" / "security"


def load_yaml(filename):
    with open(SECURITY_DIR / filename, encoding="utf-8") as f:
        return list(yaml.safe_load_all(f))


def test_restricted_namespace():
    namespace = load_yaml("namespace.yaml")[0]
    labels = namespace["metadata"]["labels"]

    assert labels["pod-security.kubernetes.io/enforce"] == "restricted"


def test_hardened_deployment():
    deployment = load_yaml("deployment.yaml")[0]
    pod = deployment["spec"]["template"]["spec"]
    container = pod["containers"][0]
    security = container["securityContext"]

    assert deployment["spec"]["replicas"] == 3
    assert pod["securityContext"]["runAsNonRoot"] is True
    assert pod["securityContext"]["seccompProfile"]["type"] == "RuntimeDefault"
    assert pod["automountServiceAccountToken"] is False

    assert security["allowPrivilegeEscalation"] is False
    assert security["readOnlyRootFilesystem"] is True
    assert "ALL" in security["capabilities"]["drop"]

    assert any(
        mount["mountPath"] == "/tmp"
        for mount in container["volumeMounts"]
    )


def test_service_account_security():
    account = load_yaml("serviceaccount.yaml")[0]

    assert account["automountServiceAccountToken"] is False


def test_default_deny_network_policy():
    policies = load_yaml("networkpolicy.yaml")
    default_deny = next(
        p for p in policies
        if p["metadata"]["name"] == "kubeshield-default-deny"
    )

    assert default_deny["spec"]["podSelector"] == {}
    assert set(default_deny["spec"]["policyTypes"]) == {
        "Ingress", "Egress"
    }
    assert "ingress" not in default_deny["spec"]
    assert "egress" not in default_deny["spec"]


def test_readonly_rbac():
    resources = load_yaml("rbac.yaml")
    role = next(r for r in resources if r["kind"] == "Role")

    assert role["metadata"]["namespace"] == "kubeshield"

    for rule in role["rules"]:
        assert set(rule["verbs"]).issubset({
            "get", "list", "watch"
        })


def test_internal_service():
    service = load_yaml("service.yaml")[0]

    assert service["spec"]["type"] == "ClusterIP"
    assert service["spec"]["ports"][0]["targetPort"] == 8080
