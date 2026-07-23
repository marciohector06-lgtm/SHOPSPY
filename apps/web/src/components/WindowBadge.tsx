import { ClockIcon } from "./icons";

type WindowConfidence = "low" | "medium" | "high";

// Nota: a API do componente aceita `label` pré-formatado (não `weeks`
// isolado) porque é isso que o backend manda de verdade
// (windowLabel: "2-3 semanas" | "1-2 meses" | "Chegou tarde" — nem
// sempre é um número único de semanas).
interface WindowBadgeProps {
  label: string | null;
  confidence?: WindowConfidence;
}

const CONFIDENCE_BORDER: Record<WindowConfidence, string> = {
  high: "border-spy-high/40 text-spy-text",
  medium: "border-spy-medium/40 text-spy-text",
  low: "border-spy-border text-spy-muted",
};

const CONFIDENCE_LABEL: Record<WindowConfidence, string> = {
  high: "Alta confiança",
  medium: "Confiança média",
  low: "Estimativa inicial",
};

export function WindowBadge({ label, confidence }: WindowBadgeProps) {
  if (!label) {
    return <span className="text-xs text-spy-muted">—</span>;
  }

  const borderClass = confidence ? CONFIDENCE_BORDER[confidence] : "border-spy-border text-spy-text";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border bg-spy-surface px-2.5 py-0.5 text-xs font-medium ${borderClass}`}>
      <ClockIcon className="h-3 w-3" />
      {label}
      {confidence && <span className="text-spy-muted"> • {CONFIDENCE_LABEL[confidence]}</span>}
    </span>
  );
}
