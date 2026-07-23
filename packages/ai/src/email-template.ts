export interface OpportunityEmailInput {
  productName: string;
  productId: string;
  scoreTotal: number;
  classification: string;
  windowLabel: string | null;
  commissionValueBR: number | null;
  /** URL base do frontend (ex.: https://app.shopspy.com.br) — vira o link "Ver oportunidade". */
  appUrl: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
}

function escapeHtml(value: string): string {
  const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return value.replace(/[&<>"']/g, (char) => ESCAPES[char]!);
}

function formatBRL(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

/**
 * HTML puro (sem framework de template) — precisa renderizar bem em
 * clientes de e-mail, que ignoram a maioria do CSS moderno. Tabelas +
 * estilo inline é o que sobrevive no Gmail/Outlook.
 */
export function renderOpportunityEmail(input: OpportunityEmailInput): RenderedEmail {
  const subject = `ShopSpy — Nova oportunidade: ${input.productName}`;
  const productUrl = `${input.appUrl}/products/${input.productId}`;
  const window = input.windowLabel ?? "não estimada";

  const html = `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:0;background:#09090b;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#18181b;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:24px 32px;border-bottom:1px solid #27272a;">
                <span style="color:#e4e4e7;font-size:18px;font-weight:bold;">ShopSpy</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="color:#a1a1aa;font-size:13px;margin:0 0 8px;">Alerta disparado</p>
                <h1 style="color:#f4f4f5;font-size:20px;margin:0 0 20px;">${escapeHtml(input.productName)}</h1>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                  <tr>
                    <td style="padding:8px 0;color:#a1a1aa;font-size:13px;">Score atual</td>
                    <td style="padding:8px 0;color:#f4f4f5;font-size:13px;font-weight:bold;text-align:right;">${Math.round(input.scoreTotal)}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#a1a1aa;font-size:13px;">Classificação</td>
                    <td style="padding:8px 0;color:#f4f4f5;font-size:13px;font-weight:bold;text-align:right;">${escapeHtml(input.classification)}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#a1a1aa;font-size:13px;">Janela estimada</td>
                    <td style="padding:8px 0;color:#f4f4f5;font-size:13px;font-weight:bold;text-align:right;">${escapeHtml(window)}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#a1a1aa;font-size:13px;">Comissão disponível</td>
                    <td style="padding:8px 0;color:#f4f4f5;font-size:13px;font-weight:bold;text-align:right;">${formatBRL(input.commissionValueBR)}</td>
                  </tr>
                </table>
                <a href="${productUrl}" style="display:inline-block;background:#6366f1;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;padding:12px 24px;border-radius:8px;">Ver oportunidade</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, html };
}
