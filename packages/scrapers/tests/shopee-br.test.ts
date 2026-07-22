import { describe, expect, it } from "vitest";
import { parseShopeeResponse } from "../src/brazil/shopee-br";
import fixture from "./fixtures/shopee-search.json";

describe("Shopee BR scraper — parseShopeeResponse", () => {
  it("parseia a resposta correta da API", () => {
    const items = parseShopeeResponse(fixture as any, "BEAUTY_SKINCARE");
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      name: "Kit Skincare Facial 5 Peças Hidratante",
      category: "BEAUTY_SKINCARE",
      platform: "shopee",
      externalId: "998877_22334455",
      priceBR: 89.9,
      soldCountBR: 14500,
      ratingBR: 4.8,
    });
    expect(items[0].imageUrl).toBe("https://cf.shopee.com.br/file/sg-11134201-abcd1234");
  });

  it("lida com resposta vazia (sem items)", () => {
    expect(parseShopeeResponse({}, "BEAUTY_SKINCARE")).toEqual([]);
    expect(parseShopeeResponse({ items: [] }, "BEAUTY_SKINCARE")).toEqual([]);
  });

  it("não duplica produto com mesmo nome normalizado ao gerar externalId estável", () => {
    const items = parseShopeeResponse(fixture as any, "BEAUTY_SKINCARE");
    const ids = items.map((i) => i.externalId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
