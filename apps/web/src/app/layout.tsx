import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShopSpy",
  description: "Inteligência de produtos virais BR + Global",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body>{children}</body>
    </html>
  );
}
