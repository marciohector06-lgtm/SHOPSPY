import { describe, expect, it, vi } from "vitest";

const { scrapeTikTokCreativeRegionsMock, withScraperLogMock } = vi.hoisted(() => ({
  scrapeTikTokCreativeRegionsMock: vi.fn().mockResolvedValue({ itemsFound: 1, itemsNew: 1, itemsUpdated: 0, errors: [] }),
  withScraperLogMock: vi.fn((_source: string, _region: string, run: () => Promise<unknown>) => run()),
}));

vi.mock("../src/global/tiktok-creative-us", () => ({
  scrapeTikTokCreativeRegions: scrapeTikTokCreativeRegionsMock,
}));

vi.mock("../src/shared/runLog", () => ({
  withScraperLog: withScraperLogMock,
}));

import {
  runTikTokCreativeMXScraper,
  runTikTokCreativeJPScraper,
  runTikTokCreativeITScraper,
  INTERNATIONAL_CREATIVE_COUNTRIES,
} from "../src/global/tiktok-creative-international";

describe("INTERNATIONAL_CREATIVE_COUNTRIES", () => {
  it("tem exatamente os 11 países novos, sem repetir US/UK/AU (já cobertos por tiktok-creative-us.ts)", () => {
    expect(INTERNATIONAL_CREATIVE_COUNTRIES).toHaveLength(11);
    const sources = INTERNATIONAL_CREATIVE_COUNTRIES.map((c) => c.source);
    expect(sources).not.toContain("TIKTOK_CREATIVE_US");
    expect(new Set(sources).size).toBe(11); // sem duplicata
  });
});

describe("runners internacionais", () => {
  it("runTikTokCreativeMXScraper loga com a fonte certa e raspa só a região MX", async () => {
    scrapeTikTokCreativeRegionsMock.mockClear();
    withScraperLogMock.mockClear();

    await runTikTokCreativeMXScraper();

    expect(withScraperLogMock).toHaveBeenCalledWith("TIKTOK_CREATIVE_MX", "GLOBAL", expect.any(Function));
    expect(scrapeTikTokCreativeRegionsMock).toHaveBeenCalledWith([{ region: "MX", geo: "MX" }]);
  });

  it("runTikTokCreativeJPScraper usa a fonte e o geo do Japão", async () => {
    scrapeTikTokCreativeRegionsMock.mockClear();
    withScraperLogMock.mockClear();

    await runTikTokCreativeJPScraper();

    expect(withScraperLogMock).toHaveBeenCalledWith("TIKTOK_CREATIVE_JP", "GLOBAL", expect.any(Function));
    expect(scrapeTikTokCreativeRegionsMock).toHaveBeenCalledWith([{ region: "JP", geo: "JP" }]);
  });

  it("runTikTokCreativeITScraper usa a fonte e o geo da Itália", async () => {
    scrapeTikTokCreativeRegionsMock.mockClear();
    withScraperLogMock.mockClear();

    await runTikTokCreativeITScraper();

    expect(withScraperLogMock).toHaveBeenCalledWith("TIKTOK_CREATIVE_IT", "GLOBAL", expect.any(Function));
    expect(scrapeTikTokCreativeRegionsMock).toHaveBeenCalledWith([{ region: "IT", geo: "IT" }]);
  });
});
