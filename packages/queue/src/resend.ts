import { Resend } from "resend";

let client: Resend | null | undefined;

function getClient(): Resend | null {
  if (client === undefined) {
    const apiKey = process.env.RESEND_API_KEY;
    client = apiKey ? new Resend(apiKey) : null;
  }
  return client;
}

export interface SendEmailResult {
  ok: boolean;
  error?: string;
}

/**
 * Nunca lança — uma falha de e-mail não pode travar o worker de alertas
 * (o chamador decide o que fazer com `ok: false`, tipicamente deixar o
 * alerta elegível de novo no próximo ciclo em vez de marcar como disparado).
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<SendEmailResult> {
  const resend = getClient();
  if (!resend) {
    return { ok: false, error: "RESEND_API_KEY não configurada" };
  }

  try {
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "ShopSpy <alertas@shopspy.com.br>",
      to,
      subject,
      html,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
