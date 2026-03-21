import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { LeftSidebar } from "@/components/layout/LeftSidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "BRVM Daily Analyzer — Tableau de bord boursier UEMOA",
  description:
    "Analyse quotidienne automatisée des cours de la Bourse Régionale des Valeurs Mobilières (BRVM). Données officielles du Bulletin Officiel de la Cote, analyse IA, 47 actions, 7 secteurs.",
  keywords: ["BRVM", "bourse", "UEMOA", "actions", "cours", "Afrique de l'Ouest"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`dark ${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body className="antialiased bg-background text-foreground">
        {/* Fixed 48px icon-only nav — xl+ only */}
        <LeftSidebar />
        {/* Shift content right on xl+ to clear sidebar */}
        <div className="xl:ml-12 min-h-screen flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
