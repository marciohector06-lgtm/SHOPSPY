import type { Metadata } from "next";
import { Sidebar } from "../components/Sidebar";
import { Header } from "../components/Header";
import { getCurrentUser } from "../lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShopSpy",
  description: "Inteligência de produtos virais BR + Global",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <html lang="pt-BR" className="dark">
      <body>
        {user ? (
          <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-x-hidden">
              <Header user={user} />
              <main className="flex-1 overflow-x-hidden p-6">{children}</main>
            </div>
          </div>
        ) : (
          <div className="min-h-screen bg-zinc-950 text-zinc-100">{children}</div>
        )}
      </body>
    </html>
  );
}
