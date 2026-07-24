import { LockIcon } from "../icons";

export function UpgradeState({ message, upgradeUrl }: { message: string; upgradeUrl: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-spy-indigo/30 bg-spy-indigo-dim px-6 py-10 text-center">
      <p className="flex items-center gap-1.5 text-sm text-spy-indigo-light">
        <LockIcon className="h-4 w-4" />
        {message}
      </p>
      <a
        href={upgradeUrl}
        className="flex h-11 items-center rounded-md bg-spy-indigo px-4 text-sm font-medium text-white transition-colors hover:bg-spy-indigo-light"
      >
        Assinar PRO
      </a>
    </div>
  );
}
