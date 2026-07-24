import { WarningIcon } from "../icons";

/** `onRetry` fica de fora em Server Components (sem handler de clique disponível) — o botão só aparece se vier. */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-rose-900/40 bg-rose-950/20 px-6 py-10 text-center">
      <p className="flex items-center gap-1.5 text-sm text-rose-300">
        <WarningIcon className="h-4 w-4" />
        {message}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex h-11 items-center rounded-md bg-rose-900/50 px-4 text-sm font-medium text-rose-100 transition-colors hover:bg-rose-900/70"
        >
          Tentar de novo
        </button>
      )}
    </div>
  );
}
