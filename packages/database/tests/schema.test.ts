import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";

const modelNames = Prisma.dmmf.datamodel.models.map((m) => m.name).sort();
const enumNames = Prisma.dmmf.datamodel.enums.map((e) => e.name).sort();

describe("Prisma schema shape", () => {
  it("declares every model required by Phase 1", () => {
    expect(modelNames).toEqual(
      [
        "Alert",
        "Product",
        "ProductMatch",
        "ReferenceVideo",
        "ScraperLog",
        "Session",
        "TrendScore",
        "User",
      ].sort()
    );
  });

  it("declares every enum required by Phase 1", () => {
    expect(enumNames).toEqual(
      [
        "Category",
        "Plan",
        "ProductStatus",
        "ScoreClass",
        "ScraperSource",
      ].sort()
    );
  });

  it("Product has BR and Global metric fields side by side", () => {
    const product = Prisma.dmmf.datamodel.models.find((m) => m.name === "Product");
    const fieldNames = product?.fields.map((f) => f.name) ?? [];
    expect(fieldNames).toEqual(
      expect.arrayContaining([
        "priceBR",
        "soldCountBR",
        "priceUS",
        "amazonRankUS",
        "tiktokImpressions",
      ])
    );
  });

  it("TrendScore is unique per product per ISO week", () => {
    const trendScore = Prisma.dmmf.datamodel.models.find((m) => m.name === "TrendScore");
    const uniqueIndexFields = trendScore?.uniqueIndexes?.[0]?.fields ?? [];
    expect(uniqueIndexFields).toEqual(["productId", "weekNumber", "year"]);
  });

  it("ProductMatch allows a null matchedProduct (no BR equivalent found)", () => {
    const match = Prisma.dmmf.datamodel.models.find((m) => m.name === "ProductMatch");
    const matchedField = match?.fields.find((f) => f.name === "matchedProductId");
    expect(matchedField?.isRequired).toBe(false);
  });
});
