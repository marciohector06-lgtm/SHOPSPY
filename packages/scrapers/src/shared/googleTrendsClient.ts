// google-trends-api não publica tipos e não tem @types disponível no npm.
// Envolvemos aqui (em vez de uma declaração global "declare module") porque
// uma declaração ambiente só é vista por pacotes que a incluem no próprio
// tsconfig — quando outro pacote do monorepo importa este arquivo via
// TS source direto (sem build), ele não a enxergaria.
interface GoogleTrendsClient {
  interestOverTime(options: { keyword: string; geo?: string; timeframe?: string }): Promise<string>;
}

// @ts-expect-error - sem tipos publicados
import googleTrendsRaw from "google-trends-api";

const googleTrends = googleTrendsRaw as GoogleTrendsClient;
export default googleTrends;
