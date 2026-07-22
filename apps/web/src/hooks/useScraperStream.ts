"use client";

import { useEffect, useState } from "react";
import { streamUrl } from "../lib/api";
import type { ScraperStatusMessage } from "../lib/types";

export type StreamConnectionState = "connecting" | "open" | "error";

/**
 * Assina GET /api/v1/stream. O servidor manda `retry: 3000` no primeiro
 * evento — o próprio EventSource do navegador já reconecta sozinho quando
 * a conexão cai, sem lógica extra aqui.
 */
export function useScraperStream(): {
  statuses: Record<string, ScraperStatusMessage>;
  connectionState: StreamConnectionState;
} {
  const [statuses, setStatuses] = useState<Record<string, ScraperStatusMessage>>({});
  const [connectionState, setConnectionState] = useState<StreamConnectionState>("connecting");

  useEffect(() => {
    const source = new EventSource(streamUrl());

    source.onopen = () => setConnectionState("open");
    source.onerror = () => setConnectionState("error");
    source.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as ScraperStatusMessage;
        setStatuses((prev) => ({ ...prev, [message.source]: message }));
      } catch {
        // mensagem malformada: ignora, não derruba a conexão
      }
    };

    return () => source.close();
  }, []);

  return { statuses, connectionState };
}
