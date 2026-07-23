/** Placeholder honesto pras telas ainda não construídas — nada de dado fake, só avisa quando chega. */
export function PhaseStub({ title, phase }: { title: string; phase: number }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-spy-border text-center">
      <h1 className="font-display text-lg font-semibold text-spy-text">{title}</h1>
      <p className="text-sm text-spy-muted">🚧 Conteúdo chega na Fase {phase} do redesign.</p>
    </div>
  );
}
