import type { ReferenceVideo } from "../lib/types";
import { formatCompactNumber } from "../lib/format";
import { VideoThumbnail } from "./VideoThumbnail";
import { HeartIcon, EyeIcon } from "./icons";

export function VideoCard({ video, productName }: { video: ReferenceVideo; productName: string }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-spy-border">
      <VideoThumbnail src={video.thumbnailUrl} alt={productName} />
      <div className="flex flex-col gap-2 p-3">
        <span className="text-xs font-medium uppercase tracking-wide text-spy-indigo-light">
          {video.platform} • {video.region}
        </span>
        <span className="line-clamp-1 text-xs text-spy-muted">{productName}</span>
        <div className="flex items-center gap-3 text-xs text-spy-muted">
          <span className="flex items-center gap-1">
            <HeartIcon className="h-3.5 w-3.5" /> {formatCompactNumber(video.likes)}
          </span>
          <span className="flex items-center gap-1">
            <EyeIcon className="h-3.5 w-3.5" /> {formatCompactNumber(video.views)}
          </span>
        </div>
        {video.hook && <p className="line-clamp-2 text-xs text-spy-text">{video.hook}</p>}
        <a
          href={video.url}
          target="_blank"
          rel="noreferrer"
          className="mt-1 self-start rounded-md border border-spy-border px-3 py-1.5 text-xs font-medium text-spy-text transition-colors hover:border-spy-indigo/40 hover:text-spy-indigo-light"
        >
          Ver vídeo →
        </a>
      </div>
    </div>
  );
}
