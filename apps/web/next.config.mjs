/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@shopspy/shared"],
  images: {
    // As imagens vêm de dezenas de CDNs diferentes (Amazon, Shopee, TikTok,
    // Mercado Livre, AliExpress, avatar do Google...) e novas fontes podem
    // aparecer a qualquer momento conforme scrapers são adicionados —
    // manter um allowlist de hostname quebraria silenciosamente sempre que
    // uma fonte nova entrasse. O <ProductImage> trata falha de carregamento
    // (URL expirada/404) com onError, então não perdemos a rede de segurança
    // que um domínio fixo daria.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
