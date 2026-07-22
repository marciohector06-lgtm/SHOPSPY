import { describe, expect, it } from "vitest";
import { parseMercadoLivreResponse } from "../src/brazil/mercadolivre-br";
import fixture from "./fixtures/mercadolivre-search.json";

describe("Mercado Livre BR scraper — parseMercadoLivreResponse", () => {
  it("parseia a resposta da API oficial corretamente", () => {
    const items = parseMercadoLivreResponse(fixture as any, "ELECTRONICS_GADGETS");
    expect(items).toHaveLength(2); // o 3º item não tem price e deve ser descartado
    expect(items[0]).toMatchObject({
      name: "Fone De Ouvido Bluetooth Sem Fio Tws Com Estojo",
      category: "ELECTRONICS_GADGETS",
      platform: "mercadoLivre",
      externalId: "MLB3456789012",
      priceBR: 89.9,
      soldCountBR: 3200,
    });
  });

  it("lida com resposta vazia", () => {
    const items = parseMercadoLivreResponse({ results: [] }, "ELECTRONICS_GADGETS");
    expect(items).toEqual([]);
  });

  it("descarta itens sem preço (indisponíveis)", () => {
    const items = parseMercadoLivreResponse(fixture as any, "ELECTRONICS_GADGETS");
    expect(items.find((i) => i.externalId === "MLB3456789014")).toBeUndefined();
  });
});
