import { beforeEach, describe, expect, it, vi } from "vitest";

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));

// Nunca chama a API real do Resend nos testes — só o SDK é mockado.
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

describe("sendEmail", () => {
  beforeEach(() => {
    vi.resetModules();
    sendMock.mockReset();
  });

  it("sem RESEND_API_KEY: retorna ok:false sem lançar e sem chamar o SDK", async () => {
    delete process.env.RESEND_API_KEY;
    const { sendEmail } = await import("../src/resend");

    const result = await sendEmail("user@example.com", "Assunto", "<p>corpo</p>");

    expect(result.ok).toBe(false);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("com RESEND_API_KEY e sucesso: retorna ok:true", async () => {
    process.env.RESEND_API_KEY = "re_fake_key";
    sendMock.mockResolvedValue({ data: { id: "email-1" }, error: null });
    const { sendEmail } = await import("../src/resend");

    const result = await sendEmail("user@example.com", "Assunto", "<p>corpo</p>");

    expect(result.ok).toBe(true);
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: "user@example.com", subject: "Assunto", html: "<p>corpo</p>" })
    );

    delete process.env.RESEND_API_KEY;
  });

  it("SDK lança/retorna erro: nunca propaga — retorna ok:false com a mensagem", async () => {
    process.env.RESEND_API_KEY = "re_fake_key";
    sendMock.mockResolvedValue({ data: null, error: { message: "rate limit" } });
    const { sendEmail } = await import("../src/resend");

    const result = await sendEmail("user@example.com", "Assunto", "<p>corpo</p>");

    expect(result.ok).toBe(false);
    expect(result.error).toBe("rate limit");

    delete process.env.RESEND_API_KEY;
  });
});
