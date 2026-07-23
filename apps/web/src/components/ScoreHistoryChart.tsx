"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TrendScoreEntry } from "../lib/types";
import { EmptyState } from "./ui/EmptyState";
import { ClockIcon } from "./icons";

const AXIS_TICK = { fill: "#94A3B8", fontSize: 11 };

/** Histórico de score (Recharts). Com 1 ponto só, mostra o ponto isolado + aviso — nunca inventa semanas vazias. */
export function ScoreHistoryChart({ scores }: { scores: TrendScoreEntry[] }) {
  if (scores.length === 0) {
    return (
      <EmptyState
        icon={<ClockIcon className="h-6 w-6" />}
        title="Sem histórico de score ainda"
        message="Aparece assim que o Score Calculator rodar pela primeira vez pra esse produto."
      />
    );
  }

  const data = scores.map((s) => ({ week: `S${s.weekNumber}`, score: s.scoreTotal }));

  return (
    <div className="flex flex-col gap-2">
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="week" tick={AXIS_TICK} />
            <YAxis domain={[0, 100]} tick={AXIS_TICK} />
            <Tooltip contentStyle={{ background: "#0F1117", border: "1px solid #1E2130", fontSize: 12, color: "#F1F5F9" }} />
            <Line type="monotone" dataKey="score" stroke="#6366F1" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {scores.length === 1 && (
        <p className="text-center text-xs text-spy-muted">
          Histórico completo disponível após a segunda semana de coleta
        </p>
      )}
    </div>
  );
}
