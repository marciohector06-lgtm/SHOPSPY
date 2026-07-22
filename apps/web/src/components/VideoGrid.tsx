import { formatCompactNumber } from "../lib/format";
import type { ReferenceVideo } from "../lib/types";

interface VideoGridProps {
  videos: ReferenceVideo[];
  variant?: "compact" | "detailed";
  limit?: number;
}

export function VideoGrid({ videos, variant = "detailed", limit }: VideoGridProps) {
  const items = limit ? videos.slice(0, limit) : videos;

  if (items.length === 0) {
    return <span className="text-xs text-zinc-500">sem vídeos ainda</span>;
  }

  if (variant === "compact") {
    return (
      <div className="flex gap-1.5">
        {items.map((video) => (
          <a
            key={video.id}
            href={video.url}
            target="_blank"
            rel="noreferrer"
            className="block h-10 w-10 overflow-hidden rounded-md border border-zinc-800 bg-zinc-800 transition-opacity hover:opacity-80"
            title={video.hook ?? undefined}
          >
            {video.thumbnailUrl ? (
              <img src={video.thumbnailUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-xs">🎬</span>
            )}
          </a>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {items.map((video) => (
        <a
          key={video.id}
          href={video.url}
          target="_blank"
          rel="noreferrer"
          className="flex flex-col overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/60 transition-colors hover:border-indigo-500/50"
        >
          <div className="aspect-video w-full bg-zinc-800">
            {video.thumbnailUrl ? (
              <img src={video.thumbnailUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-2xl">🎬</span>
            )}
          </div>
          <div className="flex flex-col gap-1 p-3">
            <div className="flex gap-3 font-mono text-xs text-zinc-400">
              <span>❤️ {formatCompactNumber(video.likes)}</span>
              <span>👁️ {formatCompactNumber(video.views)}</span>
            </div>
            {video.hook && <p className="text-xs leading-snug text-zinc-300">{video.hook}</p>}
          </div>
        </a>
      ))}
    </div>
  );
}
