const METALLIC_GRADIENT: Record<1 | 2 | 3, string> = {
  1: "linear-gradient(135deg, #FFD700, #FFA500)",
  2: "linear-gradient(135deg, #C0C0C0, #A8A8A8)",
  3: "linear-gradient(135deg, #CD7F32, #A0522D)",
};

export function RankBadge({ position }: { position: number }) {
  if (position === 1 || position === 2 || position === 3) {
    return (
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-black/75"
        style={{ background: METALLIC_GRADIENT[position] }}
      >
        {position}
      </div>
    );
  }

  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-spy-border text-xs font-semibold text-spy-muted">
      {position}
    </div>
  );
}
