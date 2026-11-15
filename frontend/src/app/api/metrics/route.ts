
import { NextResponse } from "next/server";


const PROMETHEUS_URL = "http://127.0.0.1:9090";
const SUPABASE_URL =
  "https://oshfktsokusmxkdxjnif.supabase.co";

const STALE_AFTER_MS = 3 * 60 * 1000;

const TRAFFIC_QUERY =
  'sum(rate(kubeshield_http_requests_total{job="kubeshield-metrics"}[5m]))';

const LATENCY_QUERY =
  '1000 * sum(rate(kubeshield_http_request_duration_seconds_sum{job="kubeshield-metrics"}[5m])) / sum(rate(kubeshield_http_request_duration_seconds_count{job="kubeshield-metrics"}[5m]))';

type HistoryPoint = {
  time: string;
  requests?: number;
  latency?: number;
};

type PrometheusResponse = {
  status: string;
  data?: {
    result?: {
      value?: [number, string];
      values?: [number, string][];
    }[];
  };
};

type SupabaseSnapshot = {
  healthy_replicas: number | null;
  requests_per_second: number | null;
  traffic_history: HistoryPoint[];
  latency_history: HistoryPoint[];
  collected_at: string;
};

const noStore = {
  "Cache-Control": "no-store",
};

function unavailable(message: string) {
  return NextResponse.json(
    {
      source: "unavailable",
      error: message,
    },
    {
      status: 503,
      headers: noStore,
    }
  );
}

async function fetchPrometheus(
  url: URL
): Promise<PrometheusResponse> {
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(
      `Prometheus request failed: ${response.status}`
    );
  }

  const data: PrometheusResponse =
    await response.json();

  if (data.status !== "success") {
    throw new Error("Invalid Prometheus response");
  }

  return data;
}

async function queryPrometheus(
  query: string
): Promise<number | null> {
  const url = new URL(
    "/api/v1/query",
    PROMETHEUS_URL
  );

  url.searchParams.set("query", query);

  const data = await fetchPrometheus(url);
  const value = data.data?.result?.[0]?.value?.[1];

  if (value == null) return null;

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

async function queryHistory(
  query: string,
  metric: "requests" | "latency"
): Promise<HistoryPoint[]> {
  const end = Math.floor(Date.now() / 1000);
  const start = end - 3600;

  const url = new URL(
    "/api/v1/query_range",
    PROMETHEUS_URL
  );

  url.searchParams.set("query", query);
  url.searchParams.set("start", String(start));
  url.searchParams.set("end", String(end));
  url.searchParams.set("step", "60");

  const data = await fetchPrometheus(url);

  const values =
    data.data?.result?.[0]?.values ?? [];

  return values
    .map(([timestamp, value]) => ({
      time: new Date(timestamp * 1000)
        .toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "UTC",
        }),
      [metric]: Number(value),
    }))
    .filter((point) =>
      Number.isFinite(point[metric])
    );
}

async function getSupabaseMetrics() {
  const key = process.env.KUBESHIELD_SUPABASE_KEY;

  if (!key) {
    throw new Error(
      "Supabase server credential missing"
    );
  }

  const url = new URL(
    "/rest/v1/kubeshield_metrics",
    SUPABASE_URL
  );

  url.searchParams.set(
    "select",
    "healthy_replicas,requests_per_second,traffic_history,latency_history,collected_at"
  );
  url.searchParams.set(
    "order",
    "collected_at.desc"
  );
  url.searchParams.set("limit", "1");

  const response = await fetch(url, {
    headers: {
      apikey: key,
      "User-Agent": "KubeShield-Dashboard/1.0",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(
      `Supabase request failed: ${response.status}`
    );
  }

  const snapshots: SupabaseSnapshot[] =
    await response.json();

  const latest = snapshots[0];

  if (!latest) {
    return unavailable(
      "No monitoring snapshots available"
    );
  }

  const collectedAt = Date.parse(
    latest.collected_at
  );

  if (
    !Number.isFinite(collectedAt) ||
    collectedAt > Date.now() + 60000 ||
    Date.now() - collectedAt > STALE_AFTER_MS
  ) {
    return unavailable(
      "Monitoring data is stale"
    );
  }

  return NextResponse.json(
    {
      source: "supabase",
      healthyReplicas: latest.healthy_replicas,
      requestsPerSecond: latest.requests_per_second,
      trafficHistory: latest.traffic_history ?? [],
      latencyHistory: latest.latency_history ?? [],
      timestamp: latest.collected_at,
    },
    { headers: noStore }
  );
}

export async function GET() {
  try {
    if (process.env.VERCEL === "1") {
      return await getSupabaseMetrics();
    }

    const [
      healthyReplicas,
      requestsPerSecond,
      trafficHistory,
      latencyHistory,
    ] = await Promise.all([
      queryPrometheus(
        'sum(up{job="kubeshield-metrics"})'
      ),
      queryPrometheus(TRAFFIC_QUERY),
      queryHistory(TRAFFIC_QUERY, "requests"),
      queryHistory(LATENCY_QUERY, "latency"),
    ]);

    return NextResponse.json(
      {
        source: "prometheus",
        healthyReplicas,
        requestsPerSecond,
        trafficHistory,
        latencyHistory,
        timestamp: new Date().toISOString(),
      },
      { headers: noStore }
    );
  } catch (error) {
    console.error(
      "Monitoring API error:",
      error instanceof Error
        ? error.message
        : "Unknown error"
    );

    return unavailable(
      "Monitoring data unavailable"
    );
  }
}
