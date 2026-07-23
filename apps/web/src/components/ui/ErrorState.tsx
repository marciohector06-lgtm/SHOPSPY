import { WarningIcon } from "../icons";

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-red-900/40 bg-red-950/20 px-6 py-10 text-center">
      <p className="flex items-center gap-1.5 text-sm text-red-300">
        <WarningIcon className="h-4 w-4" />
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-md bg-red-900/50 px-4 py-1.5 text-sm font-medium text-red-100 transition-colors hover:bg-red-900/70"
      >
        Tentar de novo
      </button>
    </div>
  );
}
