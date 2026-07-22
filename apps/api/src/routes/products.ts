import { Router } from "express";
import { prisma } from "@shopspy/database";
import { streamUGCScript } from "@shopspy/ai";
import { withCache } from "../lib/cache";
import { validate } from "../lib/validate";
import { idParamSchema, productsListQuerySchema, type ProductsListQuery } from "../schemas";

export function createProductsRouter(): Router {
  const router = Router();

  /**
   * Paginação cursor-based (não offset/limit): o cursor é o id do último
   * item da página anterior. Buscamos `limit + 1` para saber se existe
   * próxima página sem precisar de um COUNT(*) separado.
   */
  router.get("/", validate(productsListQuerySchema, "query"), async (req, res) => {
    const query = req.query as unknown as ProductsListQuery;
    const cacheKey = `products:list:${query.category ?? "*"}:${query.status ?? "*"}:${query.cursor ?? "start"}:${query.limit}`;

    const page = await withCache(res, cacheKey, 30, async () => {
      const rows = await prisma.product.findMany({
        where: {
          ...(query.category ? { category: query.category } : {}),
          ...(query.status ? { status: query.status } : {}),
        },
        orderBy: { id: "asc" },
        take: query.limit + 1,
        ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
        include: {
          // desc + reverse (não asc+take direto): asc+take pegaria as 4
          // semanas MAIS ANTIGAS do histórico, não as mais recentes.
          scores: { orderBy: [{ year: "desc" }, { weekNumber: "desc" }], take: 4 },
          videos: { orderBy: { likes: "desc" }, take: 2 },
        },
      });

      const hasMore = rows.length > query.limit;
      const page = hasMore ? rows.slice(0, query.limit) : rows;
      const nextCursor = hasMore ? (page[page.length - 1]?.id ?? null) : null;
      const items = page.map((row) => ({ ...row, scores: [...row.scores].reverse() }));

      return { items, nextCursor };
    });

    res.json(page);
  });

  /** Um único fetch traz tudo que a tela de detalhe precisa: histórico de score (8 semanas) e vídeos de referência. */
  router.get("/:id", validate(idParamSchema, "params"), async (req, res) => {
    const { id } = req.params as unknown as { id: string };
    const product = await withCache(res, `product:${id}`, 60, async () => {
      const row = await prisma.product.findUnique({
        where: { id },
        include: {
          // desc + reverse: pega as 8 semanas mais RECENTES e devolve em
          // ordem cronológica (asc+take pegaria as mais antigas do histórico).
          scores: { orderBy: [{ year: "desc" }, { weekNumber: "desc" }], take: 8 },
          videos: { orderBy: { likes: "desc" }, take: 6 },
        },
      });
      return row ? { ...row, scores: [...row.scores].reverse() } : null;
    });

    if (!product) {
      res.status(404).json({ error: "produto não encontrado" });
      return;
    }
    res.json(product);
  });

  /**
   * Streaming direto da resposta do Gemini — sem cache: o usuário vê o
   * roteiro sendo escrito em vez de esperar 10s de loading.
   */
  router.get("/:id/script", validate(idParamSchema, "params"), async (req, res) => {
    const { id } = req.params as unknown as { id: string };
    const product = await prisma.product.findUnique({ where: { id } });

    if (!product) {
      res.status(404).json({ error: "produto não encontrado" });
      return;
    }

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.flushHeaders();

    try {
      for await (const chunk of streamUGCScript({
        name: product.name,
        priceBR: product.priceBR,
        commissionValueBR: product.commissionValueBR,
        ratingBR: product.ratingBR,
        soldCountBR: product.soldCountBR,
      })) {
        res.write(chunk);
      }
    } catch (error) {
      res.write(`\n[erro ao gerar roteiro: ${error instanceof Error ? error.message : String(error)}]`);
    } finally {
      res.end();
    }
  });

  return router;
}
