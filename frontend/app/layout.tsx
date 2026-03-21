import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { GeistMono } from "geist/font/mono";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { LeftSidebar } from "@/components/layout/LeftSidebar";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

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
      className={`light ${dmSans.variable} ${GeistMono.variable}`}
    >
      <body className="antialiased bg-background text-foreground">
        <SidebarProvider defaultOpen={false}>
          <LeftSidebar />
          <SidebarInset className="min-h-screen flex flex-col overflow-x-hidden">
            {children}
          </SidebarInset>
        </SidebarProvider>
      </body>
    </html>
  );
}
