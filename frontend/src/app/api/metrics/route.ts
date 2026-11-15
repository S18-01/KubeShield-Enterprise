
import { NextRequest, NextResponse } from "next/server";


const PROMETHEUS_URL = "http://127.0.0.1:9090";

const TRAFFIC_QUERY =
  'sum(rate(kubeshield_http_requests_total{job="kubeshield-metrics"}[5m]))';

const LATENCY_QUERY =
  '1000 * sum(rate(kubeshield_http_request_duration_seconds_sum{job="kubeshield-metrics"}[5m])) / sum(rate(kubeshield_http_request_duration_seconds_count{job="kubeshield-metrics"}[5m]))';

type PrometheusResponse = {
  status: string;
  data?: {
    result?: {
      value?: [number, string];
      values?: [number, string][];
    }[];
  };
};

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

  const data: PrometheusResponse = await response.json();

  if (data.status !== "success") {
    throw new Error("Invalid Prometheus response");
  }

  return data;
}

async function queryPrometheus(
  query: string
): Promise<number | null> {
  const url = new URL("/api/v1/query", PROMETHEUS_URL);

  url.searchParams.set("query", query);

  const data = await fetchPrometheus(url);

  const value = data.data?.result?.[0]?.value?.[1];

  if (value == null) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

async function queryHistory(
  query: string,
  metric: "requests" | "latency"
): Promise<
  {
    time: string;
    requests?: number;
    latency?: number;
  }[]
> {
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
    .map(([timestamp, value]) => {
      const numericValue = Number(value);

      return {
        time: new Date(
          timestamp * 1000
        ).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "UTC",
        }),
        [metric]: numericValue,
      };
    })
    .filter((point) =>
      Number.isFinite(point[metric])
    );
}



export async function GET(request: NextRequest) {
  request.headers.get("host");

  if (process.env.VERCEL === "1") {
    return NextResponse.json(
      {
        source: "unavailable",
        error: "Local Prometheus monitoring is not available on the public deployment",
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  try {
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

    return NextResponse.json({
      source: "prometheus",
      healthyReplicas,
      requestsPerSecond,
      trafficHistory,
      latencyHistory,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      "Prometheus monitoring error:",
      error
    );

    return NextResponse.json(
      {
        source: "unavailable",
        error: "Monitoring data unavailable",
      },
      { status: 503 }
    );
  }
}
