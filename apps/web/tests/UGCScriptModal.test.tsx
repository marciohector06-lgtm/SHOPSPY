// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const SCRIPT_TEXT =
  "HOOK: texto do gancho " +
  "PROBLEMA: texto do problema " +
  "PRODUTO: texto do produto " +
  "PROVA: texto da prova " +
  "CTA: texto do cta " +
  "PROMPTS FLOW: prompt um\nprompt dois\nprompt tres\nprompt quatro";

vi.mock("../src/lib/api", () => ({
  streamScript: vi.fn(async (_id: string, onChunk: (chunk: string) => void) => {
    onChunk(SCRIPT_TEXT);
  }),
}));

import { UGCScriptModal } from "../src/components/UGCScriptModal";
import { streamScript } from "../src/lib/api";

describe("<UGCScriptModal />", () => {
  it("renderiza as 5 seções do roteiro (gancho, problema, produto, prova, cta)", async () => {
    render(<UGCScriptModal productId="p1" productName="Produto X" isOpen onClose={() => {}} />);

    expect(await screen.findByText(/Gancho \(0-3s\)/)).toBeTruthy();
    expect(screen.getByText(/Problema \(3-8s\)/)).toBeTruthy();
    expect(screen.getByText(/Produto \(8-18s\)/)).toBeTruthy();
    expect(screen.getByText(/Prova \(18-28s\)/)).toBeTruthy();
    expect(screen.getByText(/CTA \(28-35s\)/)).toBeTruthy();
  });

  it("preenche o conteúdo de cada seção a partir do texto em streaming", async () => {
    render(<UGCScriptModal productId="p1" productName="Produto X" isOpen onClose={() => {}} />);

    expect(await screen.findByText("texto do gancho")).toBeTruthy();
    expect(screen.getByText("texto do problema")).toBeTruthy();
    expect(screen.getByText("texto do cta")).toBeTruthy();
  });

  it("mostra os prompts do Google Flow prontos para copiar", async () => {
    render(<UGCScriptModal productId="p1" productName="Produto X" isOpen onClose={() => {}} />);

    expect(await screen.findByText("prompt um")).toBeTruthy();
    expect(screen.getByText("prompt quatro")).toBeTruthy();
    expect(screen.getAllByText("copiar").length).toBe(4);
  });

  it("fechado (isOpen=false) não renderiza nada", () => {
    const { container } = render(
      <UGCScriptModal productId="p1" productName="Produto X" isOpen={false} onClose={() => {}} />
    );
    expect(container.textContent).toBe("");
  });
});

describe("<UGCScriptModal /> sem GEMINI_API_KEY configurada", () => {
  it("mostra a mensagem informativa em vez de um acordeão vazio", async () => {
    vi.mocked(streamScript).mockImplementationOnce(async (_id, onChunk) => {
      onChunk("Roteiro UGC disponível após configurar a API do Gemini.");
    });

    render(<UGCScriptModal productId="p1" productName="Produto X" isOpen onClose={() => {}} />);

    expect(await screen.findByText("Roteiro UGC disponível após configurar a API do Gemini.")).toBeTruthy();
    expect(screen.queryByText(/Gancho \(0-3s\)/)).toBeNull();
  });
});
