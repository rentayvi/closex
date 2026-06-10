import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CloserX — Prospection B2B automatisée par IA",
  description: "Trouvez des leads qualifiés et envoyez des emails ultra-personnalisés grâce à l'IA.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="h-full">
      <body className="h-full bg-gray-50" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>{children}</body>
    </html>
  );
}
