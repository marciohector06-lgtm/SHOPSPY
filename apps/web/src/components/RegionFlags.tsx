interface RegionFlagsProps {
  latamScore: number | null;
  asiaScore: number | null;
  europeScore: number | null;
}

const GROUP_LABELS: Record<"latam" | "asia" | "europe", string> = {
  latam: "LATAM",
  asia: "Ásia",
  europe: "Europa",
};

const MIN_SCORE_TO_SHOW = 30;

/**
 * Mostra os 3 grupos regionais agregados (Product.latamScore/asiaScore/europeScore,
 * populados pelo SCORE_CALCULATOR a partir do RegionalScore por país — ver
 * packages/queue/src/scoreCalculator.ts). Não quebra por país individual: a
 * API não expõe RegionalScore por produto hoje, só os 3 agregados.
 */
export function RegionFlags({ latamScore, asiaScore, europeScore }: RegionFlagsProps) {
  const groups: Array<{ key: keyof typeof GROUP_LABELS; score: number | null }> = [
    { key: "latam", score: latamScore },
    { key: "asia", score: asiaScore },
    { key: "europe", score: europeScore },
  ];

  const visible = groups.filter((g) => (g.score ?? 0) > MIN_SCORE_TO_SHOW);
  if (visible.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map(({ key, score }) => (
        <span
          key={key}
          className="rounded-full bg-spy-surface px-1.5 py-0.5 font-data text-xs text-spy-muted ring-1 ring-inset ring-spy-border"
        >
          {GROUP_LABELS[key]} {Math.round(score ?? 0)}
        </span>
      ))}
    </div>
  );
}
