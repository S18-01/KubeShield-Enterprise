
"use client";

import { useState } from "react";
import Link from "next/link";
import { stringify, parseAllDocuments } from "yaml";
import {
  scanKubernetesYaml,
  type Finding,
  type ScanResult,
} from "@/lib/kubernetes-scanner";

const sample = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: vulnerable-web-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      hostNetwork: true
      containers:
        - name: web
          image: nginx:latest
          securityContext:
            privileged: true
`;

function applyFixes(source: string) {
  const documents = parseAllDocuments(source, {
    uniqueKeys: true,
  });

  const fixed = documents.map((document) => {
    if (document.errors.length) {
      throw new Error(document.errors[0].message);
    }

    const resource = document.toJS({ maxAliasCount: 50 });
    if (!resource || typeof resource !== "object") {
      throw new Error("Invalid Kubernetes resource.");
    }

    const spec = resource.spec;

    const podSpec =
      resource.kind === "Pod"
        ? spec
        : ["Deployment", "DaemonSet", "StatefulSet", "Job"].includes(
              resource.kind
            )
          ? spec?.template?.spec
          : resource.kind === "CronJob"
            ? spec?.jobTemplate?.spec?.template?.spec
            : null;

    if (podSpec) {
      podSpec.hostNetwork = false;
      podSpec.hostPID = false;

      for (const container of [
        ...(podSpec.containers ?? []),
        ...(podSpec.initContainers ?? []),
      ]) {
        container.securityContext ??= {};
        container.securityContext.privileged = false;
        container.securityContext.runAsNonRoot = true;
        container.securityContext.allowPrivilegeEscalation = false;
        container.securityContext.readOnlyRootFilesystem = true;
        container.securityContext.capabilities ??= {};
        container.securityContext.capabilities.drop = ["ALL"];
      }
    }

    return stringify(resource);
  });

  return fixed.join("---\n");
}

export default function DemoPage() {
  const [yaml, setYaml] = useState(sample);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  function scan() {
    setError("");
    setStatus("");

    try {
      const scanResult = scanKubernetesYaml(yaml);
      setResult(scanResult);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Scan failed.");
    }
  }

  function fix() {
    setError("");
    setStatus("");

    try {
      const updated = applyFixes(yaml);
      setYaml(updated);
      setResult(scanKubernetesYaml(updated));
      setStatus(
        "Suggested security settings applied. Review compatibility before deployment."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fix failed.");
    }
  }

  function downloadReport() {
    if (!result) return;

    const report = {
      application: "KubeShield Enterprise",
      generatedAt: new Date().toISOString(),
      resources: result.resources,
      score: result.score,
      findings: result.findings,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "kubeshield-scan-report.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  const severityStyle: Record<Finding["severity"], string> = {
    Critical: "text-red-400",
    High: "text-orange-400",
    Medium: "text-yellow-400",
    Low: "text-blue-400",
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-cyan-400">
              KUBESHIELD ENTERPRISE
            </p>
            <h1 className="mt-2 text-3xl font-bold">
              Interactive Security Demo Lab
            </h1>
            <p className="mt-3 text-slate-400">
              Explore Kubernetes security scanning with a sample manifest.
              No account required.
            </p>
          </div>
          <Link
            href="/"
            className="rounded-lg border border-slate-700 px-4 py-2 hover:bg-slate-800"
          >
            Back to Dashboard
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="mb-4 text-lg font-semibold">
              Kubernetes YAML
            </h2>

            <textarea
              value={yaml}
              onChange={(event) => {
                setYaml(event.target.value);
                setResult(null);
              }}
              spellCheck={false}
              className="h-96 w-full resize-y rounded-lg border border-slate-700 bg-slate-950 p-4 font-mono text-sm text-slate-200 outline-none focus:border-cyan-500"
            />

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={scan}
                className="rounded-lg bg-cyan-500 px-5 py-2 font-semibold text-slate-950 hover:bg-cyan-400"
              >
                Scan YAML
              </button>

              <button
                onClick={fix}
                className="rounded-lg border border-slate-600 px-4 py-2 hover:bg-slate-800"
              >
                Apply Suggested Fixes
              </button>

              <button
                onClick={() => {
                  setYaml(sample);
                  setResult(null);
                  setError("");
                  setStatus("Sample restored.");
                }}
                className="rounded-lg border border-slate-600 px-4 py-2 hover:bg-slate-800"
              >
                Reset Sample
              </button>
            </div>

          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="mb-4 text-lg font-semibold">
              Security Scan Results
            </h2>

            {error && (
              <p className="mb-4 rounded-lg border border-red-800 bg-red-950 p-3 text-red-300">
                {error}
              </p>
            )}

            {status && (
              <p className="mb-4 rounded-lg border border-cyan-900 bg-slate-800 p-3 text-cyan-300">
                {status}
              </p>
            )}

            {!result ? (
              <div className="rounded-lg border border-dashed border-slate-700 p-8 text-center text-slate-400">
                Click Scan YAML to inspect the manifest.
              </div>
            ) : (
              <>
                <div className="mb-5 grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-slate-800 p-4 text-center">
                    <p className="text-2xl font-bold">{result.score}</p>
                    <p className="text-xs text-slate-400">
                      Heuristic Score
                    </p>
                  </div>

                  <div className="rounded-lg bg-slate-800 p-4 text-center">
                    <p className="text-2xl font-bold">
                      {result.resources}
                    </p>
                    <p className="text-xs text-slate-400">
                      Resources
                    </p>
                  </div>

                  <div className="rounded-lg bg-slate-800 p-4 text-center">
                    <p className="text-2xl font-bold">
                      {result.findings.length}
                    </p>
                    <p className="text-xs text-slate-400">
                      Findings
                    </p>
                  </div>
                </div>

                <div className="max-h-[500px] space-y-3 overflow-y-auto">
                  {result.findings.length === 0 ? (
                    <p className="text-emerald-400">
                      No issues detected by the current rules.
                    </p>
                  ) : (
                    result.findings.map((finding) => (
                      <article
                        key={finding.id}
                        className="rounded-lg border border-slate-700 bg-slate-950 p-4"
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="text-sm text-slate-400">
                            {finding.resource}
                          </span>
                          <span
                            className={`text-sm font-bold ${severityStyle[finding.severity]}`}
                          >
                            {finding.severity}
                          </span>
                        </div>

                        <p className="font-medium">{finding.message}</p>
                        <p className="mt-2 text-sm text-slate-400">
                          Fix: {finding.recommendation}
                        </p>
                      </article>
                    ))
                  )}
                </div>

                <button
                  onClick={downloadReport}
                  className="mt-5 rounded-lg border border-slate-600 px-4 py-2 hover:bg-slate-800"
                >
                  Download JSON Report
                </button>
              </>
            )}
          </section>
        </div>

        <p className="mt-6 text-sm text-slate-500">
          Scanning runs in your browser. Demo YAML is not sent to
          a server by this demo. Suggested fixes may require
          application-specific adjustments.
        </p>
      </div>
    </main>
  );
}
