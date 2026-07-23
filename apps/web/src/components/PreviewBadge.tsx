/** `title` nativo é o tooltip — simples e acessível, sem lib extra pra isso. */
export function PreviewBadge() {
  return (
    <span
      title="Estes dados têm 48h de atraso. Assine PRO para ver em tempo real."
      className="inline-flex w-fit cursor-help items-center rounded-full bg-spy-medium/15 px-2.5 py-0.5 text-xs font-medium text-spy-medium ring-1 ring-inset ring-spy-medium/30"
    >
      PRÉVIA — 48h de atraso
    </span>
  );
}
