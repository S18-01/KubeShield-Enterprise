
"use client";
import { scanDockerfile } from "@/lib/dockerfile-scanner";
import { scanTerraform, scanIam, scanDependencies, scannerLabels, scannerNames, scannerAccept, type ScannerType } from "@/lib/extra-scanners";
import SecurityScanCharts from "../SecurityScanCharts";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import {
  scanKubernetesYaml,
  type Finding,
  type ScanResult,
} from "@/lib/kubernetes-scanner";

type SavedScan = {
  id: string;
  scan_name: string;
  resource_count: number;
  security_score: number;
  findings: Finding[];
  created_at: string;
};

const sample = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-web-app
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
      containers:
        - name: web
          image: nginx:latest
          securityContext:
            privileged: true
`;

export default function WorkspaceScanner() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [yaml, setYaml] = useState(sample);
  const [scanType, setScanType] = useState<ScannerType>("kubernetes");
  const [scanName, setScanName] = useState("Kubernetes Security Scan");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<SavedScan[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadHistory = useCallback(async () => {
    const { data, error: queryError } = await supabase
      .from("security_scans")
      .select("id, scan_name, resource_count, security_score, findings, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (queryError) {
      setError(queryError.message);
      return;
    }

    setHistory((data ?? []) as SavedScan[]);
  }, []);

  useEffect(() => {
    let active = true;

    async function initialize() {
      const { data, error: authError } = await supabase.auth.getUser();

      if (!active) return;

      if (authError || !data.user) {
        router.replace("/login");
        return;
      }

      setUser(data.user);
      setLoading(false);
      await loadHistory();
    }

    initialize();

    return () => {
      active = false;
    };
  }, [router, loadHistory]);

  async function scan() {
    setError("");
    setMessage("");

    try {
      const scanResult = scanType === "dockerfile" ? scanDockerfile(yaml) : scanType === "terraform" ? scanTerraform(yaml) : scanType === "iam" ? scanIam(yaml) : scanType === "dependencies" ? await scanDependencies(yaml) : scanKubernetesYaml(yaml);
      setResult(scanResult);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Scan failed.");
    }
  }

  async function saveScan() {
    if (!user || !result) return;

    setBusy(true);
    setError("");
    setMessage("");

    const { error: insertError } = await supabase
      .from("security_scans")
      .insert({
        user_id: user.id,
        scan_name: scanName.trim() || scannerNames[scanType],
        resource_count: result.resources,
        security_score: result.score,
        findings: result.findings,
      });

    if (insertError) {
      setError(insertError.message);
    } else {
      setMessage("Scan saved successfully to your private workspace.");
      await loadHistory();
    }

    setBusy(false);
  }

  async function deleteScan(id: string) {
    setBusy(true);
    setError("");

    const { error: deleteError } = await supabase
      .from("security_scans")
      .delete()
      .eq("id", id);

    if (deleteError) {
      setError(deleteError.message);
    } else {
      setMessage("Scan deleted.");
      await loadHistory();
    }

    setBusy(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  async function uploadFile(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 200_000) {
      setError("Maximum file size is 200 KB.");
      event.target.value = "";
      return;
    }

    const name = file.name.toLowerCase();

    const validFile = scanType === "dockerfile"
      ? name === "dockerfile" || name.startsWith("dockerfile.") || name.endsWith(".dockerfile") || name.endsWith(".txt")
      : scanType === "terraform" ? name.endsWith(".tf")
      : scanType === "iam" ? name.endsWith(".json")
      : scanType === "dependencies" ? name === "requirements.txt" || name === "package.json"
      : name.endsWith(".yaml") || name.endsWith(".yml");

    if (!validFile) {
      setError(
        `Please select a valid ${scannerLabels[scanType]} file.`
      );
      event.target.value = "";
      return;
    }

    const content = await file.text();
    setYaml(content);
    setResult(null);
    setScanName(file.name.slice(0, 150));
    setError("");
    setMessage(`Loaded ${file.name}`);
    event.target.value = "";
  }

  function downloadReport(scanResult: ScanResult | SavedScan) {
    const report =
      "resources" in scanResult
        ? {
            resources: scanResult.resources,
            score: scanResult.score,
            findings: scanResult.findings,
          }
        : {
            resources: scanResult.resource_count,
            score: scanResult.security_score,
            findings: scanResult.findings,
          };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "kubeshield-security-report.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <main className="flex min-h-48 items-center justify-center text-white">
        Verifying your account...
      </main>
    );
  }

  return (
    <main className="w-full text-white">
      <div className="w-full">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/" className="text-sm font-bold tracking-widest text-cyan-400">
              KUBESHIELD ENTERPRISE
            </Link>
            <h1 className="mt-3 text-3xl font-bold">My Security Workspace</h1>
            <p className="mt-2 text-sm text-slate-400">
              Signed in as {user?.email}
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/"
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm"
            >
              Dashboard
            </Link>
            <button
              onClick={signOut}
              className="rounded-lg border border-red-800 px-4 py-2 text-sm text-red-300"
            >
              Sign Out
            </button>
          </div>
        </header>

        {error && (
          <p role="alert" className="mb-5 rounded-lg bg-red-950 p-4 text-red-300">
            {error}
          </p>
        )}

        {message && (
          <p role="status" className="mb-5 rounded-lg bg-emerald-950 p-4 text-emerald-300">
            {message}
          </p>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-xl font-semibold">Security Configuration Scanner</h2>
            <label className="mt-5 block text-sm text-slate-400">
              Scanner Type
              <select
                value={scanType}
                onChange={(event) => {
                  const selectedType = event.target.value as ScannerType;
                  setScanType(selectedType);
                  setScanName(scannerNames[selectedType]);
                  setYaml("");
                  setResult(null);
                }}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white"
              >
                <option value="kubernetes">Kubernetes YAML</option>
                <option value="dockerfile">Dockerfile</option>
                <option value="terraform">Terraform (.tf)</option>
                <option value="iam">AWS IAM (.json)</option>
                <option value="dependencies">Dependencies (OSV)</option>
              </select>
            </label>

            <label className="mt-5 block text-sm text-slate-400">
              Scan name
              <input
                value={scanName}
                maxLength={150}
                onChange={(event) => setScanName(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white"
              />
            </label>

            <textarea
              value={yaml}
              onChange={(event) => {
                setYaml(event.target.value);
                setResult(null);
              }}
              spellCheck={false}
              className="mt-5 h-80 w-full rounded-lg border border-slate-700 bg-slate-950 p-4 font-mono text-sm"
            />

           <div className="mt-5 rounded-xl border-2 border-dashed border-cyan-500/30 bg-cyan-500/5 p-6 text-center transition-colors hover:border-cyan-400">
  <div className="mb-3 text-3xl">📁</div>

  <p className="text-sm font-semibold text-white">
    Upload Security Configuration
  </p>

  <p className="mt-2 text-xs text-slate-400">
    Select a file matching the scanner type
  </p>

  <label className="mt-4 inline-flex cursor-pointer rounded-lg bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300">
    Choose File
    <input
      type="file"
      accept={scannerAccept[scanType]}
      onChange={uploadFile}
      className="sr-only"
    />
  </label>

  <p className="mt-3 text-xs text-slate-500">
    Supported: YAML, Dockerfile, .tf, IAM .json, requirements.txt, package.json | Maximum 200 KB
  </p>
</div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={scan}
                className="rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950"
              >
                Run Security Scan
              </button>

              <button
                onClick={saveScan}
                disabled={!result || busy}
                className="rounded-lg border border-slate-600 px-5 py-3 disabled:opacity-40"
              >
                {busy ? "Please wait..." : "Save Scan"}
              </button>

              <button
                onClick={() => result && downloadReport(result)}
                disabled={!result}
                className="rounded-lg border border-slate-600 px-5 py-3 disabled:opacity-40"
              >
                Download Report
              </button>
            </div>

            <p className="mt-5 text-xs text-slate-500">
              Configuration scanning runs in your browser. Dependency scanning sends package names and versions to the server and OSV. Saving stores findings and scores, not the original file.
            </p>
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-xl font-semibold">Current Scan Results</h2>

            {!result ? (
              <p className="mt-6 text-slate-400">
                Choose a scanner and run a scan to see findings.
              </p>
            ) : (
              <>
                <div className="my-5 grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-slate-800 p-4 text-center">
                    <p className="text-2xl font-bold">{result.score}</p>
                    <p className="text-xs text-slate-400">Score</p>
                  </div>
                  <div className="rounded-lg bg-slate-800 p-4 text-center">
                    <p className="text-2xl font-bold">{result.resources}</p>
                    <p className="text-xs text-slate-400">Resources</p>
                  </div>
                  <div className="rounded-lg bg-slate-800 p-4 text-center">
                    <p className="text-2xl font-bold">{result.findings.length}</p>
                    <p className="text-xs text-slate-400">Findings</p>
                  </div>
                </div>

                <SecurityScanCharts score={result.score} findings={result.findings} />
                <div className="max-h-96 space-y-3 overflow-y-auto">
                  {result.findings.map((finding) => (
                    <article
                      key={finding.id}
                      className="rounded-lg border border-slate-700 bg-slate-950 p-4"
                    >
                      <p className="text-xs font-semibold text-cyan-400">
                        {finding.severity} | {finding.resource}
                      </p>
                      <p className="mt-2 text-sm">{finding.message}</p>
                      <p className="mt-2 text-xs text-slate-400">
                        Fix: {finding.recommendation}
                      </p>
                    </article>
                  ))}
                  {result.findings.length === 0 && (
                    <p className="text-emerald-400">
                      No issues detected by the current rules.
                    </p>
                  )}
                </div>
              </>
            )}
          </section>
        </div>

        <section className="mt-7 rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-xl font-semibold">My Scan History</h2>
          <p className="mt-2 text-sm text-slate-400">
            Your most recent 50 saved scans.
          </p>

          {history.length === 0 ? (
            <p className="mt-6 text-slate-400">No saved scans yet.</p>
          ) : (
            <div className="mt-5 space-y-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-700 bg-slate-950 p-4"
                >
                  <div>
                    <p className="font-semibold">{item.scan_name}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {new Date(item.created_at).toLocaleString()} |
                      Score: {item.security_score} |
                      Findings: {item.findings.length}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => downloadReport(item)}
                      className="rounded-lg border border-slate-600 px-3 py-2 text-sm"
                    >
                      Report
                    </button>
                    <button
                      onClick={() => deleteScan(item.id)}
                      disabled={busy}
                      className="rounded-lg border border-red-900 px-3 py-2 text-sm text-red-300 disabled:opacity-40"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
