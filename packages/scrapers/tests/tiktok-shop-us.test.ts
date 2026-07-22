import { describe, expect, it } from "vitest";
import { normalizeTikTokShopUSCard, type RawTikTokShopUSCard } from "../src/global/tiktok-shop-us";

describe("TikTok Shop US scraper — normalizeTikTokShopUSCard", () => {
  it("converte preço em dólar e vendidos em K", () => {
    const card: RawTikTokShopUSCard = {
      id: "us-1",
      title: "Portable Neck Fan",
      priceText: "$24.99",
      soldText: "12.3K sold",
      imageUrl: "https://p16-oec-va.ibyteimg.com/abc.jpeg",
    };
    const result = normalizeTikTokShopUSCard(card, "ELECTRONICS_GADGETS");
    expect(result.priceUS).toBe(24.99);
    expect(result.soldCountUS).toBe(12300);
    expect(result.region).toBe("US");
    expect(result.platform).toBe("tiktokShopUS");
  });

  it("lida com preço sem cifrão", () => {
    const card: RawTikTokShopUSCard = { id: "us-2", title: "LED Strip", priceText: "19.99" };
    expect(normalizeTikTokShopUSCard(card, "HOME_DECOR").priceUS).toBe(19.99);
  });

  it("retorna soldCountUS undefined quando não informado", () => {
    const card: RawTikTokShopUSCard = { id: "us-3", title: "Yoga Mat", priceText: "$15.00" };
    expect(normalizeTikTokShopUSCard(card, "FITNESS").soldCountUS).toBeUndefined();
  });
});
