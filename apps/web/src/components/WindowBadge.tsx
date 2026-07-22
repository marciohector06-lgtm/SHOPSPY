export function WindowBadge({ label }: { label: string | null }) {
  if (!label) {
    return <span className="text-xs text-zinc-500">—</span>;
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-zinc-300">
      <span aria-hidden>⏰</span>
      {label}
    </span>
  );
}
