
import { parseAllDocuments } from "yaml";

export type Finding = {
  id: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  resource: string;
  message: string;
  recommendation: string;
};

export type ScanResult = {
  resources: number;
  findings: Finding[];
  score: number;
};

export function scanKubernetesYaml(input: string): ScanResult {
  if (input.length > 200_000) {
    throw new Error("YAML exceeds the 200 KB limit.");
  }

  const documents = parseAllDocuments(input, {
    uniqueKeys: true,
  });

  const findings: Finding[] = [];
  let resources = 0;

  for (const document of documents) {
    if (document.errors.length > 0) {
      throw new Error(document.errors[0].message);
    }

    const resource = document.toJS({
    });

    if (!resource) continue;

    if (
      typeof resource !== "object" ||
      Array.isArray(resource) ||
      typeof resource.kind !== "string"
    ) {
      throw new Error("Expected a Kubernetes resource.");
    }

    resources++;

    const name =
      typeof resource.metadata?.name === "string"
        ? resource.metadata.name
        : "unnamed";

    const identifier = `${resource.kind}/${name}`;

    const addFinding = (
      id: string,
      severity: Finding["severity"],
      message: string,
      recommendation: string
    ) => {
      findings.push({
        id: `${identifier}:${id}`,
        severity,
        resource: identifier,
        message,
        recommendation,
      });
    };

    const spec = resource.spec ?? {};

    const podSpec =
      resource.kind === "Pod"
        ? spec
        : ["Deployment", "DaemonSet", "StatefulSet", "Job"].includes(
              resource.kind
            )
          ? spec.template?.spec
          : resource.kind === "CronJob"
            ? spec.jobTemplate?.spec?.template?.spec
            : null;

    if (podSpec) {
      const containers = [
        ...(podSpec.containers ?? []),
        ...(podSpec.initContainers ?? []),
      ];

      if (containers.length === 0) {
        addFinding(
          "NO_CONTAINERS",
          "Medium",
          "No containers found in the workload.",
          "Verify the pod specification."
        );
      }

      for (const container of containers) {
        const containerName = container.name ?? "unnamed";

        if (container.securityContext?.privileged === true) {
          addFinding(
            `PRIVILEGED:${containerName}`,
            "Critical",
            `${containerName} runs as a privileged container.`,
            "Remove privileged access unless strictly required."
          );
        }

        if (container.securityContext?.runAsNonRoot !== true) {
          addFinding(
            `NON_ROOT:${containerName}`,
            "High",
            `${containerName} does not explicitly require non-root execution.`,
            "Set securityContext.runAsNonRoot to true."
          );
        }

        if (
          container.securityContext?.allowPrivilegeEscalation !== false
        ) {
          addFinding(
            `PRIVILEGE_ESCALATION:${containerName}`,
            "High",
            `${containerName} does not explicitly disable privilege escalation.`,
            "Set allowPrivilegeEscalation to false."
          );
        }

        if (
          container.securityContext?.readOnlyRootFilesystem !== true
        ) {
          addFinding(
            `READ_ONLY_ROOT:${containerName}`,
            "Medium",
            `${containerName} does not explicitly use a read-only root filesystem.`,
            "Set readOnlyRootFilesystem to true where compatible."
          );
        }

        const droppedCapabilities =
          container.securityContext?.capabilities?.drop ?? [];

        if (!droppedCapabilities.includes("ALL")) {
          addFinding(
            `CAPABILITIES:${containerName}`,
            "Medium",
            `${containerName} does not drop all Linux capabilities.`,
            'Add securityContext.capabilities.drop: ["ALL"].'
          );
        }

        const image = container.image;

        if (
          typeof image === "string" &&
          (!image.includes(":") || image.endsWith(":latest"))
        ) {
          addFinding(
            `IMAGE_TAG:${containerName}`,
            "Medium",
            `${containerName} uses an unpinned or latest image tag.`,
            "Use an immutable image digest for reproducible deployments."
          );
        }
      }

      if (podSpec.hostNetwork === true) {
        addFinding(
          "HOST_NETWORK",
          "High",
          "Workload uses the host network.",
          "Disable hostNetwork unless specifically required."
        );
      }

      if (podSpec.hostPID === true) {
        addFinding(
          "HOST_PID",
          "High",
          "Workload shares the host PID namespace.",
          "Disable hostPID unless specifically required."
        );
      }
    }

    if (
      resource.kind === "Service" &&
      spec.type === "LoadBalancer"
    ) {
      addFinding(
        "PUBLIC_SERVICE",
        "Medium",
        "Service requests an external load balancer.",
        "Restrict exposure using appropriate network and access controls."
      );
    }

    if (
      resource.kind === "ClusterRoleBinding" &&
      (resource.roleRef?.name === "cluster-admin")
    ) {
      addFinding(
        "CLUSTER_ADMIN",
        "Critical",
        "Binding grants the cluster-admin role.",
        "Apply least privilege and use narrowly scoped roles."
      );
    }
  }

  if (resources === 0) {
    throw new Error("No Kubernetes resources found.");
  }

  const weights = {
    Critical: 20,
    High: 10,
    Medium: 5,
    Low: 2,
  };

  const deduction = findings.reduce(
    (sum, finding) => sum + weights[finding.severity],
    0
  );

  return {
    resources,
    findings,
    score: Math.max(0, 100 - deduction),
  };
}

