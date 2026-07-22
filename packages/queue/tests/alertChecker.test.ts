import { beforeEach, describe, expect, it, vi } from "vitest";

const { alertFindManyMock, alertUpdateMock, sendEmailMock } = vi.hoisted(() => ({
  alertFindManyMock: vi.fn(),
  alertUpdateMock: vi.fn(),
  sendEmailMock: vi.fn(),
}));

vi.mock("@shopspy/database", () => ({
  prisma: { alert: { findMany: alertFindManyMock, update: alertUpdateMock } },
}));

// Nunca manda e-mail real nos testes — só o boundary ./resend é mockado.
vi.mock("../src/resend", () => ({ sendEmail: sendEmailMock }));

import { runAlertChecker } from "../src/alertChecker";

function fakeAlert(overrides: Record<string, unknown> = {}) {
  return {
    id: "alert1",
    channel: "email",
    threshold: 70,
    lastFiredAt: null,
    user: { email: "user@example.com" },
    product: {
      id: "p1",
      name: "Produto X",
      commissionValueBR: 20,
      scores: [{ scoreTotal: 85, classification: "MAXIMUM", windowLabel: "~3 semanas" }],
    },
    ...overrides,
  };
}

describe("runAlertChecker", () => {
  beforeEach(() => {
    alertFindManyMock.mockReset();
    alertUpdateMock.mockReset().mockResolvedValue({});
    sendEmailMock.mockReset();
  });

  it("alerta elegível (score >= threshold, sem cooldown): manda e-mail e atualiza lastFiredAt/fireCount", async () => {
    alertFindManyMock.mockResolvedValue([fakeAlert()]);
    sendEmailMock.mockResolvedValue({ ok: true });

    const result = await runAlertChecker();

    expect(sendEmailMock).toHaveBeenCalledWith(
      "user@example.com",
      expect.stringContaining("Produto X"),
      expect.stringContaining("Produto X")
    );
    expect(alertUpdateMock).toHaveBeenCalledWith({
      where: { id: "alert1" },
      data: { lastFiredAt: expect.any(Date), fireCount: { increment: 1 } },
    });
    expect(result.itemsUpdated).toBe(1);
    expect(result.errors).toHaveLength(0);
  });

  it("cooldown: alerta disparado há menos de 24h NÃO dispara de novo", async () => {
    alertFindManyMock.mockResolvedValue([fakeAlert({ lastFiredAt: new Date(Date.now() - 60 * 60 * 1000) })]);

    const result = await runAlertChecker();

    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(alertUpdateMock).not.toHaveBeenCalled();
    expect(result.itemsUpdated).toBe(0);
  });

  it("disparado há mais de 24h: dispara de novo normalmente", async () => {
    alertFindManyMock.mockResolvedValue([fakeAlert({ lastFiredAt: new Date(Date.now() - 25 * 60 * 60 * 1000) })]);
    sendEmailMock.mockResolvedValue({ ok: true });

    const result = await runAlertChecker();

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(result.itemsUpdated).toBe(1);
  });

  it("score abaixo do threshold: não dispara", async () => {
    alertFindManyMock.mockResolvedValue([
      fakeAlert({ product: { id: "p1", name: "Produto X", commissionValueBR: 20, scores: [{ scoreTotal: 50, classification: "MEDIUM", windowLabel: null }] } }),
    ]);

    const result = await runAlertChecker();

    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(result.itemsUpdated).toBe(0);
  });

  it("sem score calculado nesta semana: não dispara (não quebra)", async () => {
    alertFindManyMock.mockResolvedValue([fakeAlert({ product: { id: "p1", name: "Produto X", commissionValueBR: null, scores: [] } })]);

    const result = await runAlertChecker();

    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(result.itemsUpdated).toBe(0);
  });

  it("falha do Resend num alerta: continua processando os outros, não marca o que falhou como disparado", async () => {
    alertFindManyMock.mockResolvedValue([
      fakeAlert({ id: "alert1", user: { email: "a@x.com" }, product: { id: "p1", name: "A", commissionValueBR: null, scores: [{ scoreTotal: 90, classification: "MAXIMUM", windowLabel: null }] } }),
      fakeAlert({ id: "alert2", user: { email: "b@x.com" }, product: { id: "p2", name: "B", commissionValueBR: null, scores: [{ scoreTotal: 95, classification: "MAXIMUM", windowLabel: null }] } }),
    ]);
    sendEmailMock.mockResolvedValueOnce({ ok: false, error: "Resend indisponível" }).mockResolvedValueOnce({ ok: true });

    const result = await runAlertChecker();

    expect(sendEmailMock).toHaveBeenCalledTimes(2);
    expect(alertUpdateMock).toHaveBeenCalledTimes(1);
    expect(alertUpdateMock).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "alert2" } }));
    expect(result.itemsUpdated).toBe(1);
    expect(result.errors).toEqual([expect.stringContaining("alert1")]);
  });

  it("canal diferente de email (whatsapp/push, ainda não implementado): ignora sem erro", async () => {
    alertFindManyMock.mockResolvedValue([fakeAlert({ channel: "whatsapp" })]);

    const result = await runAlertChecker();

    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(result.errors).toHaveLength(0);
  });
});
