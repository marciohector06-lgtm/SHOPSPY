import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Topbar } from "../components/Topbar";
import { PeriodProvider } from "../lib/PeriodContext";
import { getCurrentUser } from "../lib/auth";
import "./globals.css";

// Centralizado aqui (não em cada página) — next/font só dedupe o download
// da fonte quando ela é declarada uma única vez e as variáveis CSS
// resultantes (--font-display/--font-data) herdam pra toda a árvore.
const displayFont = Inter({ subsets: ["latin"], weight: ["400", "500", "700", "800"], variable: "--font-display" });
const dataFont = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-data" });

export const metadata: Metadata = {
  title: "ShopSpy",
  description: "Inteligência de produtos virais BR + Global",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <html lang="pt-BR" className="dark">
      <body className={`${displayFont.variable} ${dataFont.variable}`}>
        {user ? (
          <PeriodProvider>
            <div className="min-h-screen bg-spy-base text-spy-text">
              <Topbar user={user} />
              <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6">{children}</main>
            </div>
          </PeriodProvider>
        ) : (
          <div className="min-h-screen bg-spy-base text-spy-text">{children}</div>
        )}
      </body>
    </html>
  );
}
