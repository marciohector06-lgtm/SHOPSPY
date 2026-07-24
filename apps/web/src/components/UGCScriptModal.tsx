"use client";

import { useEffect, useState } from "react";
import { streamScript } from "../lib/api";
import { WarningIcon } from "./icons";

interface UGCScriptModalProps {
  productId: string;
  productName: string;
  isOpen: boolean;
  onClose: () => void;
}

// Espelha SCRIPT_STREAM_SECTION_MARKERS (packages/ai/src/script-generator.ts)
// — duplicado de propósito, o bundle do browser não deve depender de
// @shopspy/ai (que carrega o SDK do Gemini).
const SECTION_LABELS: Record<string, string> = {
  HOOK: "Gancho (0-3s)",
  PROBLEMA: "Problema (3-8s)",
  PRODUTO: "Produto (8-18s)",
  PROVA: "Prova (18-28s)",
  CTA: "CTA (28-35s)",
};
const SCRIPT_MARKERS = ["HOOK", "PROBLEMA", "PRODUTO", "PROVA", "CTA"];
const FLOW_MARKER = "PROMPTS FLOW";
const ALL_MARKERS = [...SCRIPT_MARKERS, FLOW_MARKER];

// Case-sensitive de propósito: o prompt pede os marcadores em MAIÚSCULAS.
// Case-insensitive faria "problema"/"produto"/"prova"/"cta" dentro do texto
// normal do roteiro (ex.: "esse produto é incrível") virarem falsos limites
// de seção.
function splitSections(text: string): Record<string, string> {
  const pattern = new RegExp(`\\b(${ALL_MARKERS.map((m) => m.replace(" ", "\\s+")).join("|")})\\b`, "g");
  const matches = [...text.matchAll(pattern)];
  const sections: Record<string, string> = {};

  matches.forEach((match, i) => {
    const start = (match.index ?? 0) + match[0].length;
    const end = i + 1 < matches.length ? matches[i + 1]!.index ?? text.length : text.length;
    const marker = ALL_MARKERS.find((m) => m === match[0].replace(/\s+/g, " "));
    if (marker) sections[marker] = text.slice(start, end).replace(/^[:\-\s]+/, "").trim();
  });

  return sections;
}

function parseFlowPrompts(rawSection: string | undefined): string[] {
  if (!rawSection) return [];
  return rawSection
    .split("\n")
    .map((line) => line.replace(/^[-*\d.\s]+/, "").trim())
    .filter((line) => line.length > 0);
}

export function UGCScriptModal({ productId, productName, isOpen, onClose }: UGCScriptModalProps) {
  const [text, setText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    Object.fromEntries(SCRIPT_MARKERS.map((m) => [m, true]))
  );
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const controller = new AbortController();
    setText("");
    setError(null);
    setStreaming(true);

    streamScript(productId, (chunk) => setText((prev) => prev + chunk), controller.signal)
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Erro ao gerar roteiro.");
      })
      .finally(() => setStreaming(false));

    return () => controller.abort();
  }, [isOpen, productId]);

  if (!isOpen) return null;

  const sections = splitSections(text);
  const flowPrompts = parseFlowPrompts(sections[FLOW_MARKER]);
  // Sem seções reconhecidas depois que o streaming termina: ou o Gemini não
  // está configurado, ou a API respondeu algo fora do formato esperado — nos
  // dois casos, mostrar o texto cru é melhor que um acordeão vazio.
  const plainMessage = !streaming && Object.keys(sections).length === 0 ? text.trim() : null;

  function copyPrompt(prompt: string, index: number) {
    void navigator.clipboard.writeText(prompt);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-spy-border bg-spy-card shadow-xl">
        <header className="flex items-center justify-between border-b border-spy-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-spy-text">Roteiro UGC — {productName}</h2>
            {streaming && (
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-spy-indigo-light">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-spy-indigo-light" />
                gerando em tempo real…
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-11 w-11 items-center justify-center rounded-md text-spy-muted hover:bg-spy-hover hover:text-spy-text"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {error && (
            <p className="mb-3 flex items-center gap-1.5 text-sm text-spy-max">
              <WarningIcon className="h-4 w-4" />
              {error}
            </p>
          )}

          {plainMessage ? (
            <p className="rounded-lg border border-spy-border bg-spy-surface px-4 py-3 text-sm text-spy-muted">
              {plainMessage}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {SCRIPT_MARKERS.map((marker) => (
                <div key={marker} className="rounded-lg border border-spy-border">
                  <button
                    type="button"
                    onClick={() => setOpenSections((prev) => ({ ...prev, [marker]: !prev[marker] }))}
                    className="flex min-h-11 w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-spy-text"
                  >
                    {SECTION_LABELS[marker]}
                    <span className="text-spy-muted">{openSections[marker] ? "▾" : "▸"}</span>
                  </button>
                  {openSections[marker] && (
                    <p className="border-t border-spy-border px-3 py-2 text-sm leading-relaxed text-spy-muted">
                      {sections[marker] || (streaming ? "…" : "—")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {!plainMessage && (flowPrompts.length > 0 || streaming) && (
            <div className="mt-4 rounded-lg border border-spy-indigo/30 bg-spy-indigo-dim p-3">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-spy-indigo-light">
                Prompts Google Flow
              </h3>
              {flowPrompts.length === 0 ? (
                <p className="text-xs text-spy-muted">aguardando…</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {flowPrompts.map((prompt, index) => (
                    <li key={index} className="flex items-start justify-between gap-2 rounded-md bg-spy-surface p-2">
                      <span className="text-xs text-spy-muted">{prompt}</span>
                      <button
                        type="button"
                        onClick={() => copyPrompt(prompt, index)}
                        className="inline-flex h-11 shrink-0 items-center rounded-md bg-spy-indigo-dim px-3 text-[11px] font-medium text-spy-indigo-light hover:bg-spy-indigo/30"
                      >
                        {copiedIndex === index ? "copiado!" : "copiar"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
