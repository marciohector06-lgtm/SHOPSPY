import { describe, expect, it } from "vitest";
import { parseAliExpressHotProducts } from "../src/global/aliexpress-global";
import fixture from "./fixtures/aliexpress-hotproducts.json";

describe("AliExpress scraper — parseAliExpressHotProducts", () => {
  it("parseia a resposta da API oficial de afiliados", () => {
    const items = parseAliExpressHotProducts(fixture as any, "HOME_DECOR");
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      name: "Portable Mini Blender USB Rechargeable",
      category: "HOME_DECOR",
      platform: "aliexpress",
      externalId: "1005001234567890",
      priceUS: 12.99,
      soldCountUS: 3200,
    });
  });

  it("lida com resposta vazia (sem produtos)", () => {
    expect(parseAliExpressHotProducts({}, "HOME_DECOR")).toEqual([]);
  });

  it("descarta itens sem título", () => {
    const raw = {
      aliexpress_affiliate_hotproduct_query_response: {
        resp_result: { result: { products: { product: [{ product_id: 1, product_title: "" }] } } },
      },
    };
    expect(parseAliExpressHotProducts(raw as any, "OTHER")).toEqual([]);
  });
});
