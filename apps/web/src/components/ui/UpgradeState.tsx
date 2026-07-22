export function UpgradeState({ message, upgradeUrl }: { message: string; upgradeUrl: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-indigo-800/40 bg-indigo-950/20 px-6 py-10 text-center">
      <p className="text-sm text-indigo-200">🔒 {message}</p>
      <a
        href={upgradeUrl}
        className="rounded-md bg-indigo-500 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-400"
      >
        Assinar PRO
      </a>
    </div>
  );
}
