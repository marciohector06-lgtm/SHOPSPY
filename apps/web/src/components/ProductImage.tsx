"use client";

import { useState } from "react";
import Image from "next/image";

function initialsFor(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0]!.charAt(0);
  const second = words.length > 1 ? words[1]!.charAt(0) : "";
  return (first + second).toUpperCase();
}

interface ProductImageProps {
  src: string | null;
  name: string;
  size: number;
  className?: string;
}

/**
 * `src` nulo cobre o caso "scraper não achou imagem"; `onError` cobre o
 * caso "achou, mas a URL apodreceu depois" (CDN de terceiro expira link)
 * — os dois viram o mesmo placeholder de iniciais, nunca uma imagem
 * quebrada ou uma tela em branco.
 */
export function ProductImage({ src, name, size, className = "" }: ProductImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex items-center justify-center bg-zinc-800 font-mono text-zinc-400 ${className}`}
        style={{ width: size, height: size, fontSize: size / 2.8 }}
        title={name}
      >
        {initialsFor(name)}
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={name}
      width={size}
      height={size}
      className={`object-cover ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
