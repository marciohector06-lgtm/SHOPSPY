export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-spy-surface ${className}`} />;
}

/** Linha da tabela densa de /produtos: rank + thumb + nome/categoria + sparkline + métricas + score + ação. */
export function SkeletonProductRow() {
  return (
    <div className="flex items-center gap-3 border-b border-spy-border px-4 py-3">
      <Skeleton className="h-6 w-6 shrink-0 rounded-full" />
      <Skeleton className="h-12 w-12 shrink-0 rounded-lg" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Skeleton className="h-3.5 w-3/5" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <Skeleton className="hidden h-8 w-20 shrink-0 sm:block" />
      <Skeleton className="hidden h-3 w-12 shrink-0 md:block" />
      <Skeleton className="hidden h-3 w-14 shrink-0 md:block" />
      <Skeleton className="h-3 w-16 shrink-0" />
      <Skeleton className="h-2 w-16 shrink-0 rounded-full" />
      <Skeleton className="h-7 w-16 shrink-0 rounded-md" />
    </div>
  );
}

/** Card full-width de /oportunidades: thumb + nome + 3 métricas (score/gap/janela) + rodapé com ações. */
export function SkeletonProductCard() {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-spy-border bg-spy-card p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="h-16 w-16 shrink-0 rounded-lg" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/3" />
        </div>
        <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-14 rounded-lg" />
        <Skeleton className="h-14 rounded-lg" />
        <Skeleton className="h-14 rounded-lg" />
      </div>
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-3 w-2/5" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-28 rounded-md" />
          <Skeleton className="h-8 w-36 rounded-md" />
        </div>
      </div>
    </div>
  );
}

/** Card de /videos: thumbnail 16:9 + tags + stats + gancho (2 linhas) + botão. */
export function SkeletonVideoCard() {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-spy-border">
      <Skeleton className="aspect-video w-full rounded-none" />
      <div className="flex flex-col gap-2 p-3">
        <Skeleton className="h-3 w-2/5" />
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="mt-1 h-7 w-24 rounded-md" />
      </div>
    </div>
  );
}

/** Card de /criadores: avatar circular + handle + receita + seguidores + categoria, tudo centralizado. */
export function SkeletonCreatorCard() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-spy-border p-4 text-center">
      <Skeleton className="h-16 w-16 rounded-full" />
      <Skeleton className="h-3.5 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-3 w-2/5" />
      <Skeleton className="h-3 w-1/3" />
    </div>
  );
}
