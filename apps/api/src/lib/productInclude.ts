/**
 * Include padrão de scores+vídeos usado em /products (lista e detalhe) e
 * /opportunities/top — centralizado pra não duplicar o desc+take+reverse
 * (asc+take pegaria as semanas mais ANTIGAS do histórico, não as recentes).
 */
export function scoresVideosInclude(scoresTake: number, videosTake: number) {
  return {
    scores: { orderBy: [{ year: "desc" as const }, { weekNumber: "desc" as const }], take: scoresTake },
    videos: { orderBy: { likes: "desc" as const }, take: videosTake },
  };
}

export function reverseScores<T extends { scores: unknown[] }>(row: T): T {
  return { ...row, scores: [...row.scores].reverse() };
}
