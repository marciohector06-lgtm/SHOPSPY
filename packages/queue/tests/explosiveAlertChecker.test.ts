import { beforeEach, describe, expect, it, vi } from "vitest";

const { regionalScoreFindManyMock, alertFindManyMock, alertUpdateMock, scraperLogCreateMock, sendEmailMock } =
  vi.hoisted(() => ({
    regionalScoreFindManyMock: vi.fn(),
    alertFindManyMock: vi.fn(),
    alertUpdateMock: vi.fn(),
    scraperLogCreateMock: vi.fn(),
    sendEmailMock: vi.fn(),
  }));

vi.mock("@shopspy/database", () => ({
  prisma: {
    regionalScore: { findMany: regionalScoreFindManyMock },
    alert: { findMany: alertFindManyMock, update: alertUpdateMock },
    scraperLog: { create: scraperLogCreateMock },
  },
}));

vi.mock("../src/resend", () => ({ sendEmail: sendEmailMock }));

import { runExplosiveAlertChecker, toExplosiveAlerts } from "../src/explosiveAlertChecker";

function fakeRegionalScore(overrides: Record<string, unknown> = {}) {
  return {
    productId: "p1",
    product: { name: "Produto Explosivo" },
    region: "MX",
    weeklyGrowth: 250,
    trendScore: 88,
    createdAt: new Date(),
    ...overrides,
  };
}

function fakeUserAlert(overrides: Record<string, unknown> = {}) {
  return {
    id: "alert1",
    productId: "p1",
    lastFiredAt: null,
    user: { email: "pro@x.com" },
    ...overrides,
  };
}

describe("toExplosiveAlerts", () => {
  it("converte o shape do Prisma pro shape público ExplosiveAlert", () => {
    const result = toExplosiveAlerts([fakeRegionalScore()]);
    expect(result).toEqual([
      {
        productId: "p1",
        productName: "Produto Explosivo",
        region: "MX",
        weeklyGrowth: 250,
        currentScore: 88,
        detectedAt: expect.any(Date),
      },
    ]);
  });
});

describe("runExplosiveAlertChecker", () => {
  beforeEach(() => {
    regionalScoreFindManyMock.mockReset().mockResolvedValue([]);
    alertFindManyMock.mockReset().mockResolvedValue([]);
    alertUpdateMock.mockReset().mockResolvedValue({});
    scraperLogCreateMock.mockReset().mockResolvedValue({});
    sendEmailMock.mockReset();
  });

  it("crescimento explosivo + alerta PRO ativo sem cooldown: manda e-mail e atualiza lastFiredAt/fireCount", async () => {
    regionalScoreFindManyMock.mockResolvedValue([fakeRegionalScore()]);
    alertFindManyMock.mockResolvedValue([fakeUserAlert()]);
    sendEmailMock.mockResolvedValue({ ok: true });

    const result = await runExplosiveAlertChecker();

    expect(alertFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { productId: "p1", active: true, user: { plan: "PRO" } } })
    );
    expect(sendEmailMock).toHaveBeenCalledWith(
      "pro@x.com",
      expect.stringContaining("Produto Explosivo"),
      expect.stringContaining("Produto Explosivo")
    );
    expect(alertUpdateMock).toHaveBeenCalledWith({
      where: { id: "alert1" },
      data: { lastFiredAt: expect.any(Date), fireCount: { increment: 1 } },
    });
    expect(result.itemsFound).toBe(1);
    expect(result.itemsUpdated).toBe(1);
    expect(result.errors).toHaveLength(0);
  });

  it("cooldown: alerta disparado há menos de 24h não dispara de novo", async () => {
    regionalScoreFindManyMock.mockResolvedValue([fakeRegionalScore()]);
    alertFindManyMock.mockResolvedValue([fakeUserAlert({ lastFiredAt: new Date(Date.now() - 60 * 60 * 1000) })]);

    const result = await runExplosiveAlertChecker();

    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(result.itemsUpdated).toBe(0);
  });

  it("nenhum RegionalScore explosivo nas últimas 2h: não busca alertas nem manda e-mail", async () => {
    regionalScoreFindManyMock.mockResolvedValue([]);

    const result = await runExplosiveAlertChecker();

    expect(alertFindManyMock).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(result.itemsFound).toBe(0);
  });

  it("falha do Resend: não atualiza lastFiredAt, erro fica registrado", async () => {
    regionalScoreFindManyMock.mockResolvedValue([fakeRegionalScore()]);
    alertFindManyMock.mockResolvedValue([fakeUserAlert()]);
    sendEmailMock.mockResolvedValue({ ok: false, error: "Resend indisponível" });

    const result = await runExplosiveAlertChecker();

    expect(alertUpdateMock).not.toHaveBeenCalled();
    expect(result.itemsUpdated).toBe(0);
    expect(result.errors).toEqual([expect.stringContaining("alert1")]);
  });

  it("grava ScraperLog com source EXPLOSIVE_DETECTOR ao terminar", async () => {
    regionalScoreFindManyMock.mockResolvedValue([fakeRegionalScore()]);
    alertFindManyMock.mockResolvedValue([fakeUserAlert()]);
    sendEmailMock.mockResolvedValue({ ok: true });

    await runExplosiveAlertChecker();

    expect(scraperLogCreateMock).toHaveBeenCalledTimes(1);
    const log = scraperLogCreateMock.mock.calls[0]![0].data;
    expect(log.source).toBe("EXPLOSIVE_DETECTOR");
    expect(log.status).toBe("success");
  });

  it("se o cálculo lançar antes de terminar, grava ScraperLog com status error e propaga o erro", async () => {
    regionalScoreFindManyMock.mockRejectedValue(new Error("banco indisponível"));

    await expect(runExplosiveAlertChecker()).rejects.toThrow("banco indisponível");

    const log = scraperLogCreateMock.mock.calls[0]![0].data;
    expect(log.status).toBe("error");
    expect(log.error).toContain("banco indisponível");
  });
});
