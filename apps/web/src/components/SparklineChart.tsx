"use client";

import { Line, LineChart, ResponsiveContainer } from "recharts";

export function SparklineChart({ values, width = 96, height = 28 }: { values: number[]; width?: number; height?: number }) {
  if (values.length === 0) {
    return <span className="text-xs text-zinc-500">sem dados</span>;
  }

  const data = values.map((value, index) => ({ index, value }));
  const trendingUp = values.length > 1 && values[values.length - 1]! >= values[0]!;
  const stroke = trendingUp ? "#34d399" : "#f87171";

  return (
    <div style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line type="monotone" dataKey="value" stroke={stroke} strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
