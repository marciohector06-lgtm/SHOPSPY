import type { Metadata } from "next";
import { Sidebar } from "../components/Sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShopSpy",
  description: "Inteligência de produtos virais BR + Global",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body>
        <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
          <Sidebar />
          <main className="flex-1 overflow-x-hidden p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
