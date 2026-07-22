import { describe, expect, it } from "vitest";
import { normalizeTikTokShopCard, type RawTikTokShopCard } from "../src/brazil/tiktok-shop-br";

describe("TikTok Shop BR scraper — normalizeTikTokShopCard", () => {
  it("converte preço em texto para número", () => {
    const card: RawTikTokShopCard = {
      id: "7123456",
      title: "Escova Alisadora Iônica",
      priceText: "R$ 1.249,90",
      soldText: "3,2 mil vendidos",
      imageUrl: "https://p16-oec-va.ibyteimg.com/abc.jpeg",
    };
    const result = normalizeTikTokShopCard(card, "HAIR_CARE");
    expect(result.priceBR).toBe(1249.9);
    expect(result.soldCountBR).toBe(3200);
    expect(result.platform).toBe("tiktokShop");
    expect(result.externalId).toBe("7123456");
  });

  it("lida com card sem contagem de vendidos", () => {
    const card: RawTikTokShopCard = {
      id: "7123457",
      title: "Mini Massageador Portátil",
      priceText: "R$ 39,90",
    };
    const result = normalizeTikTokShopCard(card, "FITNESS");
    expect(result.soldCountBR).toBeUndefined();
    expect(result.priceBR).toBe(39.9);
  });

  it("retorna preço undefined quando o texto não bate com o padrão esperado", () => {
    const card: RawTikTokShopCard = {
      id: "7123458",
      title: "Produto sem preço visível",
      priceText: "Indisponível",
    };
    const result = normalizeTikTokShopCard(card, "OTHER");
    expect(result.priceBR).toBeUndefined();
  });
});
