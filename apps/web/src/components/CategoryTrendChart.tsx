"use client";

import { Area, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CategoryTrendSeries } from "../lib/types";
import { formatCategory } from "../lib/format";

const AXIS_TICK = { fill: "#94A3B8", fontSize: 11 };
const MIN_WEEKS_FOR_TREND = 2; // linha/área precisam de 2+ pontos reais — com só 1, o Recharts não desenha nada

/** BR vs Global (8 semanas) de uma categoria — linha sólida Global, tracejada BR, área sombreada = gap de oportunidade. */
export function CategoryTrendChart({ series, color }: { series: CategoryTrendSeries; color: string }) {
  const data = series.series.map((point) => {
    const br = point.avgTrendsBR ?? 0;
    const global = point.avgTrendsUS ?? 0;
    return {
      week: point.week.split("-S")[1] ? `S${point.week.split("-S")[1]}` : point.week,
      br: point.avgTrendsBR,
      global: point.avgTrendsUS,
      gapBase: Math.min(br, global),
      gap: Math.abs(global - br),
    };
  });

  const weeksWithData = data.filter((point) => point.br !== null || point.global !== null).length;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-spy-border bg-spy-card p-4">
      <h3 className="text-sm font-medium text-spy-text">{formatCategory(series.category)}</h3>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <XAxis dataKey="week" tick={AXIS_TICK} />
            <YAxis domain={[0, 100]} tick={AXIS_TICK} width={28} />
            <Tooltip contentStyle={{ background: "#0F1117", border: "1px solid #1E2130", fontSize: 12, color: "#F1F5F9" }} />
            <Area dataKey="gapBase" stackId="gap" stroke="none" fill="transparent" />
            <Area dataKey="gap" stackId="gap" stroke="none" fill={color} fillOpacity={0.15} name="Gap" />
            <Line
              type="monotone"
              dataKey="global"
              stroke={color}
              strokeWidth={2}
              dot={{ r: 3, fill: color, strokeWidth: 0 }}
              name="Global"
            />
            <Line
              type="monotone"
              dataKey="br"
              stroke={color}
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={{ r: 3, fill: color, strokeWidth: 0 }}
              name="Brasil"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {weeksWithData < MIN_WEEKS_FOR_TREND && (
        <p className="text-center text-[11px] text-spy-muted">
          Comparação completa disponível após mais semanas de coleta
        </p>
      )}
      <div className="flex items-center gap-4 text-[11px] text-spy-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full" style={{ background: color }} /> Global
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full border-t-2 border-dashed" style={{ borderColor: color }} /> Brasil
        </span>
      </div>
    </div>
  );
}
