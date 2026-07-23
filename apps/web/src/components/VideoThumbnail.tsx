"use client";

import { useState } from "react";
import Image from "next/image";
import { PlayIcon } from "./icons";

/** Separado de ProductImage (que assume thumb quadrado) — vídeo é 16:9 e o fallback é um ícone, não iniciais. */
export function VideoThumbnail({ src, alt }: { src: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="flex aspect-video w-full items-center justify-center bg-spy-surface text-spy-faint">
        <PlayIcon className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="relative aspect-video w-full">
      <Image src={src} alt={alt} fill className="object-cover" onError={() => setFailed(true)} />
    </div>
  );
}
