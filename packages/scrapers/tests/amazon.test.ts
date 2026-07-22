import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseAmazonBestSellersHtml } from "../src/shared/amazon";

const html = readFileSync(join(__dirname, "fixtures/amazon-bestsellers.html"), "utf-8");

describe("parseAmazonBestSellersHtml", () => {
  it("parseia rank, ASIN, título e preço em USD", () => {
    const items = parseAmazonBestSellersHtml(html, "BEAUTY_SKINCARE", "US");
    expect(items).toHaveLength(2); // o 3º item não tem título e deve ser descartado
    expect(items[0]).toMatchObject({
      name: "LED Face Mask Skincare Device",
      category: "BEAUTY_SKINCARE",
      platform: "amazonUS",
      region: "US",
      externalId: "B08XYZ1234",
      amazonRankUS: 1,
      priceUS: 49.99,
    });
    expect(items[1]).toMatchObject({ externalId: "B08XYZ5678", amazonRankUS: 2, priceUS: 18.5 });
  });

  it("descarta itens sem título (indisponíveis ou markup incompleto)", () => {
    const items = parseAmazonBestSellersHtml(html, "BEAUTY_SKINCARE", "US");
    expect(items.find((i) => i.externalId === "B08XYZ9999")).toBeUndefined();
  });

  it("usa o padrão de moeda correto para UK (£), não define priceUS e usa amazonRankUK", () => {
    const ukHtml = html.replace(/\$49\.99/, "£49.99");
    const items = parseAmazonBestSellersHtml(ukHtml, "BEAUTY_SKINCARE", "UK");
    expect(items[0]?.platform).toBe("amazonUK");
    expect(items[0]?.priceUS).toBeUndefined();
    expect(items[0]?.amazonRankUS).toBeUndefined();
    expect(items[0]?.amazonRankUK).toBe(1);
  });

  it("lida com HTML vazio", () => {
    expect(parseAmazonBestSellersHtml("<html></html>", "BEAUTY_SKINCARE", "US")).toEqual([]);
  });
});
