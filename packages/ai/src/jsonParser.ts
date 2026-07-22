/**
 * Parser defensivo: o Gemini quase sempre respeita responseMimeType=json,
 * mas às vezes envolve a resposta em blocos de markdown ou deixa vírgulas
 * penduradas. Tenta progressivamente corrigir antes de desistir.
 */
export function parseJsonDefensive<T = unknown>(rawText: string): T {
  const attempts = [
    rawText,
    stripMarkdownFences(rawText),
    extractOutermostJson(rawText),
    removeTrailingCommas(stripMarkdownFences(rawText)),
  ];

  for (const candidate of attempts) {
    if (!candidate) continue;
    try {
      return JSON.parse(candidate) as T;
    } catch {
      continue;
    }
  }

  throw new Error("Não foi possível parsear a resposta do Gemini como JSON");
}

function stripMarkdownFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

function extractOutermostJson(text: string): string | null {
  const stripped = stripMarkdownFences(text);
  const firstBrace = Math.min(
    ...[stripped.indexOf("{"), stripped.indexOf("[")].filter((i) => i !== -1)
  );
  if (!Number.isFinite(firstBrace) || firstBrace === -1) return null;

  const opening = stripped[firstBrace];
  const closing = opening === "{" ? "}" : "]";
  const lastClosing = stripped.lastIndexOf(closing);
  if (lastClosing === -1 || lastClosing < firstBrace) return null;

  return stripped.slice(firstBrace, lastClosing + 1);
}

function removeTrailingCommas(text: string): string {
  return text.replace(/,(\s*[}\]])/g, "$1");
}
