import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseRobotsTxt, isPathAllowedForGroups } from "../src/shared/robots";

const shopeeRobots = readFileSync(join(__dirname, "fixtures/shopee-robots.txt"), "utf-8");

describe("robots.txt parser (fixture real da Shopee)", () => {
  const groups = parseRobotsTxt(shopeeRobots);

  it("encontra o grupo genérico User-agent: *", () => {
    const wildcard = groups.find((g) => g.userAgents.includes("*"));
    expect(wildcard).toBeDefined();
  });

  it("permite o endpoint de busca usado pelo scraper", () => {
    expect(isPathAllowedForGroups(groups, "/api/v4/search/search_items")).toBe(true);
  });

  it("bloqueia paths sensíveis (carrinho, checkout, conta)", () => {
    expect(isPathAllowedForGroups(groups, "/cart/")).toBe(false);
    expect(isPathAllowedForGroups(groups, "/checkout/")).toBe(false);
    expect(isPathAllowedForGroups(groups, "/user/")).toBe(false);
  });

  it("não bloqueia paths ausentes do grupo genérico", () => {
    expect(isPathAllowedForGroups([], "/anything")).toBe(true);
  });
});
