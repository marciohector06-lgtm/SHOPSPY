import { EXPLOSIVE_GROWTH_THRESHOLD } from "@shopspy/shared";

/** Só aparece quando o crescimento semanal passa do limiar (packages/shared/src/constants.ts). */
export function ExplosiveBadge({ weeklyGrowth }: { weeklyGrowth: number }) {
  if (weeklyGrowth < EXPLOSIVE_GROWTH_THRESHOLD) return null;

  return (
    <span className="inline-flex items-center rounded-full bg-spy-max/15 px-2.5 py-0.5 font-data text-xs font-bold text-spy-max ring-1 ring-inset ring-spy-max/30">
      +{Math.round(weeklyGrowth)}% esta semana
    </span>
  );
}
