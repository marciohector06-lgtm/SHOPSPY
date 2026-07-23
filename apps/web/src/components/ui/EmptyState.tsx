import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  message: string;
}

/** Estado "sem dado ainda" — diferente de erro: nada quebrou, só não chegou. */
export function EmptyState({ icon, title, message }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-spy-border px-6 py-10 text-center">
      <span className="text-spy-faint" aria-hidden>
        {icon}
      </span>
      <p className="text-sm font-medium text-spy-text">{title}</p>
      <p className="text-xs text-spy-muted">{message}</p>
    </div>
  );
}
