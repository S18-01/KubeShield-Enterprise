"use client";
import SecurityScanCharts from "./SecurityScanCharts";
import { scanKubernetesYaml, type ScanResult } from "../lib/kubernetes-scanner";

import { useEffect, useState, type ReactNode } from "react";
import {
  Activity,
  ArrowUpRight,
  Box,
  CheckCircle2,
  ChevronRight,
  Cloud,
  ExternalLink,
  GitBranch,
  Globe2,
  Layers3,
  Menu,
  Play,
  Server,
  Shield,
  ShieldCheck,
  Terminal,
  Workflow,
  X,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const DEMO_YAML = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: vulnerable-nginx
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      hostNetwork: true
      containers:
        - name: nginx
          image: nginx:latest
          securityContext:
            privileged: true`;

const repositoryUrl =
  "https://github.com/S18-01/KubeShield-Enterprise";

type Section =
  | "Overview"
  | "Kubernetes"
  | "Monitoring"
  | "Security Center"
  | "CI/CD Pipeline"
  | "Demo Lab"
  | "Security Portal";

type HistoryPoint = {
  time: string;
  requests?: number;
  latency?: number;
};

type MetricsResponse = {
  source?: "supabase" | "prometheus" | "unavailable";
  status?: "live" | "offline";
  isLive?: boolean;
  healthyReplicas: number | null;
  requestsPerSecond: number | null;
  trafficHistory: HistoryPoint[];
  latencyHistory: HistoryPoint[];
  timestamp: string;
};

const navigation = [
  { name: "Overview", icon: Layers3 },
  { name: "Kubernetes", icon: Box },
  { name: "Monitoring", icon: Activity },
  { name: "Security Center", icon: ShieldCheck },
  { name: "CI/CD Pipeline", icon: Workflow },
  { name: "Demo Lab", icon: Terminal },
  { name: "Security Portal", icon: ShieldCheck },
] as const;

const scanResults = [
  {
    name: "Pytest",
    description: "Application unit tests",
    result: "16 passed",
  },
  {
    name: "Bandit",
    description: "Python static security analysis",
    result: "0 findings",
  },
  {
    name: "pip-audit",
    description: "Dependency vulnerability analysis",
    result: "0 known vulnerabilities",
  },
  {
    name: "Checkov",
    description: "Infrastructure-as-code security",
    result: "125 passed, 4 skipped",
  },
  {
    name: "Trivy",
    description: "Container image vulnerability scan",
    result: "0 HIGH / CRITICAL",
  },
];

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#111827] p-5 shadow-lg shadow-black/10">
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-white">
          {title}
        </h3>
        {subtitle && (
          <p className="mt-1 text-xs leading-5 text-slate-400">
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

function Metric({
  label,
  value,
  description,
  icon: Icon,
}: {
  label: string;
  value: string;
  description: string;
  icon: typeof Activity;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111827] p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-slate-400">
          {label}
        </span>
        <Icon size={19} className="shrink-0 text-cyan-400" />
      </div>
      <div className="mt-4 break-words text-2xl font-semibold tracking-tight text-white md:text-3xl">
        {value}
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-400">
        {description}
      </p>
    </div>
  );
}

function MonitoringChart({
  dataKey,
  color,
  data,
}: {
  dataKey: "requests" | "latency";
  color: string;
  data: HistoryPoint[];
}) {
  const gradientId = `chart-gradient-${dataKey}`;

  if (!data.length) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-400">
        No recorded measurements available
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient
              id={gradientId}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor={color}
                stopOpacity={0.3}
              />
              <stop
                offset="95%"
                stopColor={color}
                stopOpacity={0}
              />
            </linearGradient>
          </defs>

          <CartesianGrid
            stroke="#263244"
            strokeDasharray="3 5"
            vertical={false}
          />

          <XAxis
            dataKey="time"
            stroke="#64748b"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />

          <YAxis
            stroke="#64748b"
            fontSize={10}
            tickLine={false}
            axisLine={false}
          />

          <Tooltip
            formatter={(value) => {
              const number = Number(value);
              if (!Number.isFinite(number)) {
                return ["N/A", dataKey];
              }
              return dataKey === "requests"
                ? [`${number.toFixed(3)} req/s`, "HTTP Traffic"]
                : [`${number.toFixed(3)} ms`, "Average Latency"];
            }}
            contentStyle={{
              backgroundColor: "#0f172a",
              border: "1px solid #334155",
              borderRadius: 12,
              color: "#ffffff",
            }}
            labelStyle={{ color: "#cbd5e1" }}
          />

          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2.5}
            fill={`url(#${gradientId})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function formatTimestamp(timestamp?: string) {
  if (!timestamp) return "N/A";

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export default function Home() {
  const [active, setActive] = useState<Section>("Overview");
  const [demoResult, setDemoResult] = useState<ScanResult | null>(null);

useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const section = params.get("section");

  const validSection = navigation.find(
    (item) => item.name === section
  );

  if (validSection) {
    setActive(validSection.name);
  }
}, []);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [scenario, setScenario] = useState("Normal traffic");

  const [events, setEvents] = useState<string[]>([
    "Demo environment initialized",
    "Security configuration loaded",
    "Monitoring dataset ready",
  ]);

  const [liveMetrics, setLiveMetrics] =
    useState<MetricsResponse | null>(null);

  const [metricsStatus, setMetricsStatus] = useState<
    "loading" | "live" | "offline"
  >("loading");

  useEffect(() => {
    let mounted = true;

    async function loadMetrics() {
      try {
        const response = await fetch("/api/metrics", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Monitoring API unavailable");
        }

        const data: MetricsResponse = await response.json();

        if (!mounted) return;

        setLiveMetrics(data);

        const timestamp = Date.parse(data.timestamp);
        const fresh =
          Number.isFinite(timestamp) &&
          timestamp <= Date.now() + 60000 &&
          Date.now() - timestamp <= 3 * 60 * 1000;

        setMetricsStatus(
          data.isLive === false ||
            data.status === "offline" ||
            !fresh
            ? "offline"
            : "live"
        );
      } catch {
        if (!mounted) return;

        setMetricsStatus("offline");
      }
    }

    void loadMetrics();

    const interval = setInterval(() => {
      void loadMetrics();
    }, 15000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const hasSnapshot = Boolean(liveMetrics?.timestamp);
  const isLive = metricsStatus === "live";
  const isOffline = metricsStatus === "offline";

  const trafficHistory = liveMetrics?.trafficHistory ?? [];
  const latencyHistory = liveMetrics?.latencyHistory ?? [];

  const monitoringSubtitle = isLive
    ? "Live measurements from the last recorded hour"
    : hasSnapshot
      ? "Historical measurements from the last saved snapshot"
      : "Monitoring data unavailable";

  function navigate(section: Section) {
    setActive(section);
    setSidebarOpen(false);

    const url = new URL(window.location.href);

    if (section === "Overview") {
      url.searchParams.delete("section");
    } else {
      url.searchParams.set("section", section);
    }

    window.history.pushState({}, "", url.toString());
  }
  function runScenario() {
    const messages: Record<string, string> = {
      "Normal traffic":
        "Normal traffic simulation completed successfully.",
      "Traffic spike":
        "Simulated traffic spike detected. Request rate increased.",
      "Suspicious request":
        "Simulated suspicious request detected. Security event recorded.",
      "Pod restart":
        "Simulated pod restart completed. Replica count restored.",
    };

    setEvents((previous) => [
      messages[scenario] ?? "Simulation completed.",
      ...previous.slice(0, 5),
    ]);
  }

  const trafficChart = (
    <MonitoringChart
      dataKey="requests"
      color="#22d3ee"
      data={trafficHistory}
    />
  );

  const latencyChart = (
    <MonitoringChart
      dataKey="latency"
      color="#a78bfa"
      data={latencyHistory}
    />
  );

  return (
    <div className="min-h-screen bg-[#080d17] text-slate-200">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation overlay"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/70 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-white/10 bg-[#0c1423] transition-transform lg:translate-x-0 ${
          sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
          <div className="rounded-xl bg-cyan-500/15 p-2.5">
            <ShieldCheck
              className="text-cyan-400"
              size={24}
            />
          </div>

          <div>
            <div className="text-base font-bold tracking-tight text-white">
              KubeShield
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-400">
              Enterprise
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-4 pt-7">
          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Workspace
          </p>

          <nav className="space-y-1">
            {navigation.map(({ name, icon: Icon }) => (
              <button
                type="button"
                key={name}
                onClick={() => navigate(name)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${
                  active === name
                    ? "bg-cyan-500/10 font-medium text-cyan-300 ring-1 ring-cyan-500/20"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon size={18} />
                {name}
                {active === name && (
                  <ChevronRight
                    size={15}
                    className="ml-auto"
                  />
                )}
              </button>
            ))}
            <div className="my-3 border-t border-white/10" />

            
          </nav>
        </div>

        <div className="mt-auto p-4">
          <a
            href={repositoryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 hover:text-white"
          >
            <GitBranch size={17} />
            View Source Code
            <ExternalLink size={13} className="ml-auto" />
          </a>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-white/10 bg-[#080d17]/95 px-5 backdrop-blur-xl md:px-9">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden"
              aria-label="Open navigation"
            >
              <Menu size={22} />
            </button>

            <div>
              <div className="text-xs text-slate-500">
                KubeShield Enterprise / Workspace
              </div>
              <h1 className="mt-1 text-lg font-semibold text-white">
                {active}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`hidden rounded-full border px-3 py-1.5 text-xs sm:inline-flex ${
                isLive
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                  : isOffline
                    ? "border-amber-500/20 bg-amber-500/10 text-amber-300"
                    : "border-white/10 bg-white/5 text-slate-300"
              }`}
            >
              {isLive
                ? "Monitoring Live"
                : isOffline
                  ? "Monitoring Offline"
                  : "Checking Monitoring"}
            </span>

            <a
              href={repositoryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-white/10 p-2.5 hover:bg-white/5"
              aria-label="Open GitHub repository"
            >
              <GitBranch size={18} />
            </a>
          </div>
        </header>

        <main className="mx-auto max-w-7xl space-y-7 p-5 md:p-9">
          {active === "Overview" && (
            <>
              <div className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-[#102b42] via-[#111d34] to-[#111827] p-7 md:p-9">
                <div className="pointer-events-none absolute -right-12 -top-16 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />

                <div className="relative">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs text-cyan-300">
                    <Zap size={13} />
                    Cloud-Native Security Platform
                  </div>

                  <h2 className="max-w-2xl text-3xl font-bold tracking-tight text-white md:text-4xl">
                    Secure infrastructure.
                    <span className="mt-1 block text-cyan-400">
                      Visible by design.
                    </span>
                  </h2>

                  <p className="mt-4 max-w-xl text-sm leading-7 text-slate-400">
                    Explore Kubernetes workload security,
                    automated DevSecOps checks, security
                    insights, and application observability
                    through an interactive security dashboard.
                  </p>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => navigate("Demo Lab")}
                      className="flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
                    >
                      <Play size={16} />
                      Explore Demo
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate("Kubernetes")}
                      className="flex items-center gap-2 rounded-xl border border-white/20 px-5 py-3 text-sm font-medium text-white hover:bg-white/10"
                    >
                      View Architecture
                      <ArrowUpRight size={16} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Metric
                  label="Healthy Replicas"
                  value={
                    liveMetrics?.healthyReplicas != null
                      ? String(liveMetrics.healthyReplicas)
                      : "N/A"
                  }
                  description={
                    isLive
                      ? "Latest Kubernetes replica count"
                      : hasSnapshot
                        ? "Last recorded count (historical)"
                        : "Monitoring data unavailable"
                  }
                  icon={Layers3}
                />

                <Metric
                  label="Unit Tests"
                  value="16/16"
                  description="Verified project test run"
                  icon={CheckCircle2}
                />

                <Metric
                  label="Checkov Checks"
                  value="125"
                  description="Passed in verified local scan"
                  icon={ShieldCheck}
                />

                <Metric
                  label="High / Critical CVEs"
                  value="0"
                  description="Verified local Trivy scan result"
                  icon={Shield}
                />
              </div>

              <div className="grid gap-5 xl:grid-cols-2">
                <Panel
                  title="Application Traffic"
                  subtitle={monitoringSubtitle}
                >
                  {trafficChart}
                </Panel>

                <Panel
                  title="Response Latency"
                  subtitle={monitoringSubtitle}
                >
                  {latencyChart}
                </Panel>
              </div>

              <div className="grid gap-5 xl:grid-cols-2">
                <Panel
                  title="Security Controls"
                  subtitle="Controls implemented in the project"
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      "Non-root container",
                      "Read-only filesystem",
                      "Kubernetes RBAC",
                      "NetworkPolicy manifests",
                      "Dropped capabilities",
                      "Automated CI scans",
                    ].map((name) => (
                      <div
                        key={name}
                        className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.025] p-3"
                      >
                        <ShieldCheck
                          size={17}
                          className="shrink-0 text-cyan-400"
                        />
                        <span className="text-xs text-slate-300">
                          {name}
                        </span>
                      </div>
                    ))}
                  </div>
                </Panel>

                <Panel
                  title="Project Architecture"
                  subtitle="Technology stack and deployment components"
                >
                  <div className="space-y-3">
                    {[
                      ["Application", "Python / Flask / Docker"],
                      ["Orchestration", "Kubernetes / 3 replicas"],
                      ["Monitoring", "Prometheus / Grafana"],
                      ["Automation", "GitHub Actions"],
                      [
                        "Infrastructure",
                        "Terraform / AWS EKS configuration",
                      ],
                    ].map(([name, value]) => (
                      <div
                        key={name}
                        className="flex items-center justify-between gap-4 border-b border-white/5 pb-3"
                      >
                        <span className="text-xs text-slate-400">
                          {name}
                        </span>
                        <span className="text-right text-xs font-medium text-slate-200">
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>
            </>
          )}

          {active === "Kubernetes" && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <Metric
                  label="Desired Replicas"
                  value="3"
                  description="Deployment specification"
                  icon={Box}
                />

                <Metric
                  label="Workload Type"
                  value="Flask"
                  description="Containerized Python application"
                  icon={Server}
                />

                <Metric
                  label="Deployment"
                  value="Local"
                  description="Docker Desktop Kubernetes"
                  icon={Cloud}
                />
              </div>

              <Panel
                title="Kubernetes Workload Explorer"
                subtitle="Project configuration, not live cluster status"
              >
                <div className="grid gap-4 md:grid-cols-3">
                  {[1, 2, 3].map((pod) => (
                    <div
                      key={pod}
                      className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5"
                    >
                      <div className="mb-5 flex items-center justify-between">
                        <Box
                          size={24}
                          className="text-cyan-400"
                        />
                        <span className="rounded-full bg-cyan-500/10 px-2 py-1 text-[10px] text-cyan-300">
                          Configured
                        </span>
                      </div>

                      <h3 className="font-semibold text-white">
                        Replica {pod}
                      </h3>
                      <p className="mt-2 text-xs text-slate-400">
                        KubeShield Flask API
                      </p>
                      <p className="mt-4 text-xs text-slate-500">
                        Container security hardened
                      </p>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel
                title="Security Architecture"
                subtitle="Implemented controls and verification limitations"
              >
                <div className="space-y-4">
                  {[
                    [
                      "RBAC",
                      "Role-based access configuration",
                    ],
                    [
                      "NetworkPolicies",
                      "Default-deny and explicit allowances. Enforcement not verified with local CNI.",
                    ],
                    [
                      "Container Security",
                      "Non-root user, dropped capabilities, read-only filesystem",
                    ],
                    [
                      "Observability",
                      "Prometheus metrics and Grafana dashboard",
                    ],
                  ].map(([name, detail]) => (
                    <div
                      key={name}
                      className="flex gap-4 rounded-xl border border-white/5 p-4"
                    >
                      <ShieldCheck
                        className="shrink-0 text-cyan-400"
                        size={20}
                      />
                      <div>
                        <div className="text-sm font-medium text-white">
                          {name}
                        </div>
                        <div className="mt-1 text-xs leading-5 text-slate-400">
                          {detail}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            </>
          )}

          {active === "Monitoring" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <Metric
                  label="HTTP Traffic"
                  value={
                    liveMetrics?.requestsPerSecond != null
                      ? liveMetrics.requestsPerSecond.toFixed(3)
                      : "N/A"
                  }
                  description={
                    isLive
                      ? "Latest HTTP requests per second"
                      : hasSnapshot
                        ? "Last recorded traffic (historical)"
                        : "Monitoring data unavailable"
                  }
                  icon={Activity}
                />

                <Metric
                  label="Monitoring Status"
                  value={
                    isLive
                      ? "Live"
                      : metricsStatus === "loading"
                        ? "Loading"
                        : "Offline"
                  }
                  description="Kubernetes monitoring freshness"
                  icon={ShieldCheck}
                />

                <Metric
                  label="Last Updated"
                  value={formatTimestamp(liveMetrics?.timestamp)}
                  description={
                    isLive
                      ? "Latest monitoring snapshot"
                      : hasSnapshot
                        ? "Last recorded snapshot (historical)"
                        : "No monitoring snapshot available"
                  }
                  icon={Activity}
                />
              </div>

              <div
                className={`rounded-xl border p-4 text-xs leading-6 ${
                  isLive
                    ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-200"
                    : "border-amber-500/20 bg-amber-500/5 text-amber-200"
                }`}
              >
                {isLive
                  ? "Monitoring is live. Kubernetes measurements are collected by Prometheus and delivered to this dashboard."
                  : metricsStatus === "loading"
                    ? "Checking monitoring data freshness..."
                    : hasSnapshot
                      ? "Live monitoring is offline. The charts display the last recorded Kubernetes metrics. The Last Updated timestamp shows when these measurements were collected. Live updates resume when the Kubernetes cluster and monitoring publisher are running."
                      : "Monitoring is currently unavailable. The dashboard remains accessible, but no saved monitoring snapshot could be retrieved."}
              </div>

              <div className="grid gap-5 xl:grid-cols-2">
                <Panel
                  title="Request Throughput"
                  subtitle={monitoringSubtitle}
                >
                  {trafficChart}
                </Panel>

                <Panel
                  title="Response Latency"
                  subtitle={monitoringSubtitle}
                >
                  {latencyChart}
                </Panel>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Metric
                  label="Configured Replicas"
                  value="3"
                  description="From Kubernetes manifests"
                  icon={Layers3}
                />

                <Metric
                  label="Monitoring Stack"
                  value="2"
                  description="Prometheus and Grafana"
                  icon={Activity}
                />

                <Metric
                  label="Data Source"
                  value={
                    liveMetrics?.source === "supabase"
                      ? "Supabase"
                      : liveMetrics?.source === "prometheus"
                        ? "Prometheus"
                        : metricsStatus === "loading"
                          ? "Loading"
                          : "Unavailable"
                  }
                  description={
                    isLive
                      ? "Live Kubernetes monitoring data"
                      : hasSnapshot
                        ? "Historical monitoring snapshot"
                        : "No monitoring data available"
                  }
                  icon={Globe2}
                />
              </div>
            </>
          )}

          {active === "Security Center" && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <Metric
                  label="Bandit Findings"
                  value="0"
                  description="Verified scan result"
                  icon={ShieldCheck}
                />

                <Metric
                  label="Checkov Passed"
                  value="125"
                  description="4 checks skipped"
                  icon={CheckCircle2}
                />

                <Metric
                  label="High / Critical CVEs"
                  value="0"
                  description="Verified local image scan"
                  icon={Shield}
                />
              </div>

              <Panel
                title="Security Validation Results"
                subtitle="Recorded project checks, not live production scans"
              >
                <div className="space-y-3">
                  {scanResults.map((scan) => (
                    <div
                      key={scan.name}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-4"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle2
                          size={19}
                          className="text-emerald-400"
                        />
                        <div>
                          <div className="text-sm font-semibold text-white">
                            {scan.name}
                          </div>
                          <div className="mt-1 text-xs text-slate-400">
                            {scan.description}
                          </div>
                        </div>
                      </div>

                      <span className="rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                        {scan.result}
                      </span>
                    </div>
                  ))}
                </div>
              </Panel>
            </>
          )}

          {active === "CI/CD Pipeline" && (
            <>
              <Panel
                title="DevSecOps Pipeline"
                subtitle="Security workflow implemented using GitHub Actions"
              >
                <div className="grid gap-3 md:grid-cols-5">
                  {[
                    ["01", "Unit Tests", "pytest"],
                    ["02", "SAST", "Bandit"],
                    ["03", "Dependencies", "pip-audit"],
                    ["04", "IaC Security", "Checkov"],
                    ["05", "Image Scan", "Trivy"],
                  ].map(([number, name, tool]) => (
                    <div
                      key={number}
                      className="rounded-xl border border-cyan-500/15 bg-cyan-500/5 p-4"
                    >
                      <div className="text-xs text-cyan-400">
                        {number}
                      </div>
                      <CheckCircle2
                        className="my-4 text-emerald-400"
                        size={23}
                      />
                      <div className="text-sm font-semibold text-white">
                        {name}
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        {tool}
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel
                title="GitHub Actions"
                subtitle="Inspect actual workflow execution history"
              >
                <p className="mb-5 text-sm leading-7 text-slate-400">
                  Open GitHub Actions to inspect real workflow
                  runs, build logs, and current CI status.
                </p>

                <a
                  href={`${repositoryUrl}/actions`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
                >
                  <GitBranch size={17} />
                  View GitHub Actions
                  <ExternalLink size={15} />
                </a>
              </Panel>
            </>
          )}

          {active === "Security Portal" && (
            <section className="mb-5 rounded-2xl border border-cyan-500/20 bg-[#101827] p-5">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-white">
                  My Security Workspace
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Sign in to scan Kubernetes YAML, save results, and manage your private scan history.
                </p>
              </div>
              <a
  href="/workspace"
  className="inline-flex items-center justify-center rounded-xl bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
>
  Open Security Scanner
</a>
            </section>
          )}
          {active === "Demo Lab" && (
            <section className="mb-5 rounded-2xl border border-cyan-500/20 bg-[#101827] p-6">
              <h2 className="text-xl font-semibold text-white">
                Kubernetes YAML Security Scanner
              </h2>

              <p className="mt-3 text-sm text-slate-400">
                Explore a fixed Kubernetes deployment example.
                Click Scan Kubernetes YAML to view illustrative security findings.
              </p>

              <div className="mt-6 grid gap-5 xl:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-slate-950 p-5">
                  <h3 className="mb-4 font-semibold text-cyan-300">
                    Sample Kubernetes YAML (Read Only)
                  </h3>

                  <pre className="overflow-x-auto rounded-lg bg-[#080d18] p-4 text-xs leading-6 text-slate-300">
                    <code>{`apiVersion: apps/v1
kind: Deployment
metadata:
  name: vulnerable-nginx
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      hostNetwork: true
      containers:
        - name: nginx
          image: nginx:latest
          securityContext:
            privileged: true`}</code>
                  </pre>

                  <button
                    type="button"
                    onClick={() => setDemoResult(scanKubernetesYaml(DEMO_YAML))}
                    className="mt-5 rounded-xl bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
                  >
                    Scan Kubernetes YAML
                  </button>
                </div>

                <div className="rounded-xl border border-white/10 bg-slate-950 p-5">
                  <h3 className="mb-4 font-semibold text-white">
                    Security Scan Results
                  </h3>

                  {!demoResult ? (
                    <p className="text-sm text-slate-400">
                      Click Scan Kubernetes YAML to run the security scanner.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg border border-white/10 p-3">
                          <p className="text-xs text-slate-400">Security Score</p>
                          <p className="mt-1 text-2xl font-bold text-cyan-300">
                            {demoResult.score}/100
                          </p>
                        </div>
                        <div className="rounded-lg border border-white/10 p-3">
                          <p className="text-xs text-slate-400">Resources Scanned</p>
                          <p className="mt-1 text-2xl font-bold text-white">
                            {demoResult.resources}
                          </p>
                        </div>
                      </div>

                      <p className="text-sm text-slate-300">
                        {demoResult.findings.length} security findings detected
                      </p>

                      <SecurityScanCharts score={demoResult.score} findings={demoResult.findings} />
                      {demoResult.findings.map((finding) => (
                        <div
                          key={finding.id}
                          className="rounded-lg border border-white/10 bg-white/[0.03] p-4"
                        >
                          <p className="font-semibold text-orange-300">
                            {finding.severity}: {finding.message}
                          </p>
                          <p className="mt-2 text-xs text-slate-400">
                            Resource: {finding.resource}
                          </p>
                          <p className="mt-2 text-xs text-slate-300">
                            Fix: {finding.recommendation}
                          </p>
                        </div>
                      ))}

                      {demoResult.findings.length === 0 && (
                        <p className="text-sm text-emerald-300">
                          No security findings detected.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                </div>
            </section>
          )}
          {active === "Demo Lab" && (
            <>
              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-xs leading-6 text-cyan-200">
                Safe simulation environment. Scenarios update
                the demonstration event log only. No real
                infrastructure or Kubernetes workloads are
                modified.
              </div>

              <div className="grid gap-5 xl:grid-cols-2">
                <Panel
                  title="Interactive Scenario Runner"
                  subtitle="Explore simulated operational security events"
                >
                  <label
                    htmlFor="scenario"
                    className="mb-2 block text-xs font-medium text-slate-400"
                  >
                    Select a scenario
                  </label>

                  <select
                    id="scenario"
                    value={scenario}
                    onChange={(event) =>
                      setScenario(event.target.value)
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#0b1220] p-3 text-sm text-white outline-none focus:border-cyan-400"
                  >
                    <option>Normal traffic</option>
                    <option>Traffic spike</option>
                    <option>Suspicious request</option>
                    <option>Pod restart</option>
                  </select>

                  <button
                    type="button"
                    onClick={runScenario}
                    className="mt-5 flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
                  >
                    <Play size={16} />
                    Run Simulation
                  </button>

                  <p className="mt-5 text-xs leading-6 text-slate-400">
                    These scenarios illustrate operational
                    concepts and do not represent real detections
                    or remediation actions.
                  </p>
                </Panel>

                <Panel
                  title="Simulated Event Log"
                  subtitle="Recent demonstration events"
                >
                  <div className="space-y-3">
                    {events.map((event, index) => (
                      <div
                        key={`${index}-${event}`}
                        className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.025] p-3"
                      >
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                        <div className="text-xs leading-5 text-slate-300">
                          {event}
                        </div>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>
            </>
          )}

          <footer className="py-4 text-center text-xs text-slate-500">
            Copyright 2026 KubeShield Enterprise. All rights reserved.
          </footer>
        </main>
      </div>
    </div>
  );
}

