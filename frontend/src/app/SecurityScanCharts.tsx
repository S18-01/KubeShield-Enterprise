"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Finding = {
  severity: "Critical" | "High" | "Medium" | "Low";
};

type Props = {
  score: number;
  findings: Finding[];
};

const levels = [
  { name: "Critical", color: "#ef4444" },
  { name: "High", color: "#f97316" },
  { name: "Medium", color: "#eab308" },
  { name: "Low", color: "#22c55e" },
];

export default function SecurityScanCharts({ score, findings }: Props) {
  const data = levels.map((level) => ({
    name: level.name,
    count: findings.filter((f) => f.severity === level.name).length,
    color: level.color,
  }));

  const pieData = data.filter((item) => item.count > 0);
  const scoreColor =
    score >= 80 ? "#22c55e" : score >= 50 ? "#eab308" : "#ef4444";

  return (
    <div className="mt-5 space-y-5">
      <div className="rounded-xl border border-slate-700 bg-slate-950 p-5">
        <p className="mb-3 text-sm font-semibold text-white">
          Security Score
        </p>
        <div className="flex items-center gap-4">
          <span
            className="text-4xl font-bold"
            style={{ color: scoreColor }}
          >
            {score}/100
          </span>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.max(0, Math.min(100, score))}%`,
                backgroundColor: scoreColor,
              }}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="min-w-0 rounded-xl border border-slate-700 bg-slate-950 p-4">
          <h3 className="mb-4 text-sm font-semibold">
            Findings by Severity
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fill: "#cbd5e1", fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fill: "#cbd5e1" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "1px solid #334155",
                    color: "#fff",
                  }}
                />
                <Bar dataKey="count" name="Findings" radius={[5, 5, 0, 0]}>
                  {data.map((item) => (
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="min-w-0 rounded-xl border border-slate-700 bg-slate-950 p-4">
          <h3 className="mb-4 text-sm font-semibold">
            Vulnerability Distribution
          </h3>
          {pieData.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-emerald-400">
              No findings detected
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="count"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {pieData.map((item) => (
                      <Cell key={item.name} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="flex flex-wrap justify-center gap-3 text-xs">
            {data.map((item) => (
              <span key={item.name} className="flex items-center gap-1">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                {item.name}: {item.count}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
