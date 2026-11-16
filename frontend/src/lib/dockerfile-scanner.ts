import type { ScanResult, Finding } from "./kubernetes-scanner";

export function scanDockerfile(input: string): ScanResult {
  if (input.length > 200_000) {
    throw new Error("Dockerfile exceeds the 200 KB limit.");
  }

  if (!input.trim()) {
    throw new Error("Dockerfile is empty.");
  }

  const findings: Finding[] = [];
  const lines = input.split(/\r?\n/);

  const add = (
    severity: Finding["severity"],
    resource: string,
    message: string,
    recommendation: string
  ) => {
    findings.push({
      id: `docker-${findings.length + 1}`,
      severity,
      resource,
      message,
      recommendation,
    });
  };

  const instructions = lines
    .map((line, index) => ({
      text: line.trim(),
      number: index + 1,
    }))
    .filter((line) => line.text && !line.text.startsWith("#"));

  const from = instructions.filter((line) => /^FROM\s+/i.test(line.text));

  if (from.length === 0) {
    throw new Error("No FROM instruction found. Enter a valid Dockerfile.");
  }

  for (const line of instructions) {
    const resource = `Dockerfile line ${line.number}`;

    if (/^FROM\s+\S+:latest(?:\s|$)/i.test(line.text)) {
      add(
        "Medium",
        resource,
        "Base image uses the latest tag.",
        "Pin the base image to a specific version or immutable digest."
      );
    }

    if (/^FROM\s+\S+(?:\s+AS\s+\S+)?$/i.test(line.text)) {
      const image = line.text.split(/\s+/)[1];

      if (!image.includes(":") && !image.includes("@")) {
        add(
          "Medium",
          resource,
          "Base image version is not pinned.",
          "Use a specific image version or digest."
        );
      }
    }

    if (/^RUN\s+.*(?:curl|wget).*?\|\s*(?:sh|bash)/i.test(line.text)) {
      add(
        "High",
        resource,
        "Remote script executed directly in the image build.",
        "Download and verify scripts before executing them."
      );
    }

    if (/^ADD\s+https?:\/\//i.test(line.text)) {
      add(
        "Medium",
        resource,
        "Remote URL used in ADD instruction.",
        "Use verified artifacts and validate checksums."
      );
    }

    if (/^ENV\s+.*(?:PASSWORD|SECRET|TOKEN|API_KEY)\s*=/i.test(line.text)) {
      add(
        "Critical",
        resource,
        "Potential secret embedded in an ENV instruction.",
        "Use runtime secret management instead of embedding credentials."
      );
    }

    if (/^USER\s+root(?:\s|$)/i.test(line.text)) {
      add(
        "High",
        resource,
        "Container explicitly configured to run as root.",
        "Create and use a non-root user."
      );
    }

    if (/^RUN\s+.*chmod\s+777(?:\s|$)/i.test(line.text)) {
      add(
        "High",
        resource,
        "World-writable file permissions detected.",
        "Apply restrictive file permissions."
      );
    }
  }

  const lastUser = instructions
    .filter((line) => /^USER\s+/i.test(line.text))
    .at(-1);

  if (!lastUser) {
    add(
      "High",
      "Dockerfile",
      "No USER instruction found.",
      "Configure the final container stage to run as a non-root user."
    );
  }

  const weights = {
    Critical: 25,
    High: 15,
    Medium: 7,
    Low: 3,
  };

  const penalty = findings.reduce(
    (sum, finding) => sum + weights[finding.severity],
    0
  );

  return {
    resources: from.length,
    findings,
    score: Math.max(0, 100 - penalty),
  };
}
