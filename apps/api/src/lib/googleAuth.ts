import { Google } from "arctic";

export interface GoogleUserInfo {
  sub: string;
  email: string;
  name: string;
  picture: string;
}

let client: Google | undefined;

export function getGoogleClient(): Google {
  if (!client) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error("GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET/GOOGLE_REDIRECT_URI não configurados");
    }
    client = new Google(clientId, clientSecret, redirectUri);
  }
  return client;
}

export const GOOGLE_OAUTH_SCOPES = ["openid", "email", "profile"];

/**
 * Busca o perfil via userinfo endpoint (não decodifica o idToken direto):
 * evita ter que verificar a assinatura JWT do Google só pra ler 4 campos.
 */
export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`Falha ao buscar perfil do Google (${response.status})`);
  }
  return (await response.json()) as GoogleUserInfo;
}
