import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, TrendingUp, TrendingDown, Minus, ExternalLink, Newspaper } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PriceChart } from "@/components/stock/PriceChart";
import { getLatestSession, getStockHistory } from "@/lib/api";
import { fetchCompanyNews, formatNewsDate, isRecentArticle } from "@/lib/news";
import {
  formatVariation,
  formatCFA,
  variationBg,
  formatSessionDate,
} from "@/lib/format";
import type { Metadata } from "next";

export const revalidate = 300;

interface Props {
  params: Promise<{ symbol: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { symbol } = await params;
  return {
    title: `${symbol.toUpperCase()} — BRVM Daily Analyzer`,
    description: `Cours, historique et fondamentaux de ${symbol.toUpperCase()} sur la BRVM.`,
  };
}

async function StockPageContent({ symbol }: { symbol: string }) {
  const sym = symbol.toUpperCase();

  const [sessionRes, historyRes] = await Promise.allSettled([
    getLatestSession(),
    getStockHistory(sym, 60),
  ]);

  // News fetched after we know the company name — handled later

  if (sessionRes.status === "rejected") {
    return (
      <div className="text-center py-20 text-muted-foreground text-sm">
        Données de marché indisponibles.
      </div>
    );
  }

  const session = sessionRes.value;
  const stock = session.stocks.find((s) => s.symbol === sym);

  if (!stock) notFound();

  const history = historyRes.status === "fulfilled" ? historyRes.value : [];
  const news = await fetchCompanyNews(stock.name).catch(() => []);
  const pct = stock.variation_pct;
  const up = pct > 0;
  const down = pct < 0;
  const Icon = up ? TrendingUp : down ? TrendingDown : Minus;

  // Variation annuelle depuis l'historique
  const yearHigh = history.length
    ? Math.max(...history.map((h) => h.close))
    : null;
  const yearLow = history.length
    ? Math.min(...history.map((h) => h.close))
    : null;

  return (
    <div className="px-4 sm:px-6 py-5 pb-20 max-w-4xl mx-auto">
      {/* Back */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour au tableau de bord
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
              {sym}
            </h1>
            <Badge
              variant="outline"
              className={`font-mono text-sm px-2.5 py-1 border ${variationBg(pct)}`}
            >
              <Icon className="h-3.5 w-3.5 mr-1 inline" />
              {formatVariation(pct)}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">{stock.name}</p>
          <p className="text-xs text-muted-foreground/60 mt-0.5">
            Séance du {formatSessionDate(stock.session_date)}
          </p>
        </div>

        <div className="text-right">
          <p className="font-display text-4xl sm:text-5xl font-bold text-foreground tabular-nums">
            {stock.close.toLocaleString("fr-FR")}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">XOF / titre</p>
          {stock.previous_close > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Veille :{" "}
              <span className="font-mono">
                {stock.previous_close.toLocaleString("fr-FR")}
              </span>
            </p>
          )}
        </div>
      </div>

      {/* Chart */}
      <Card className="bg-card border-border mb-5">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Évolution du cours — {history.length} séances
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-4">
          <PriceChart history={history} currentPrice={stock.close} />
        </CardContent>
      </Card>

      {/* Fundamentals */}
      <Card className="bg-card border-border mb-5">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Fondamentaux
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="grid grid-cols-2 sm:grid-cols-3">
            {[
              {
                label: "Cours actuel",
                value: `${stock.close.toLocaleString("fr-FR")} XOF`,
                mono: true,
              },
              {
                label: "Volume",
                value: stock.volume
                  ? stock.volume.toLocaleString("fr-FR") + " titres"
                  : "—",
                mono: true,
              },
              {
                label: "Valeur échangée",
                value: stock.value_traded
                  ? formatCFA(stock.value_traded, true)
                  : "—",
                mono: true,
              },
              {
                label: "PER",
                value: stock.per ? stock.per.toFixed(1) + "×" : "N/D",
                mono: true,
              },
              {
                label: "Rendement net",
                value: stock.net_yield
                  ? stock.net_yield.toFixed(2) + "%"
                  : "N/D",
                mono: true,
              },
              {
                label: "Dernier dividende",
                value: stock.last_dividend
                  ? `${stock.last_dividend.toLocaleString("fr-FR")} XOF`
                  : "N/D",
                mono: true,
              },
              yearHigh
                ? {
                    label: "Plus haut (historique)",
                    value: `${yearHigh.toLocaleString("fr-FR")} XOF`,
                    mono: true,
                  }
                : null,
              yearLow
                ? {
                    label: "Plus bas (historique)",
                    value: `${yearLow.toLocaleString("fr-FR")} XOF`,
                    mono: true,
                  }
                : null,
            ]
              .filter(Boolean)
              .map((item, i, arr) => {
                if (!item) return null;
                const col = i % 3;
                const row = Math.floor(i / 3);
                const totalRows = Math.ceil(arr.length / 3);
                const isLastCol = col === 2;
                const isLastRow = row === totalRows - 1;
                return (
                  <div
                    key={item.label}
                    className="p-3.5 flex flex-col gap-1"
                    style={{
                      borderRight:
                        !isLastCol
                          ? "1px solid hsl(var(--border))"
                          : undefined,
                      borderBottom:
                        !isLastRow
                          ? "1px solid hsl(var(--border))"
                          : undefined,
                    }}
                  >
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                      {item.label}
                    </p>
                    <p
                      className={`text-base font-semibold text-foreground${item.mono ? " font-mono tabular-nums" : ""}`}
                    >
                      {item.value}
                    </p>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>

      {/* News Section */}
      <Card className="bg-card border-border mb-5">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Newspaper className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground uppercase tracking-wide text-[11px]">
              Actualités — {stock.name}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          {news.length > 0 ? (
            <div className="space-y-0 divide-y divide-border/50">
              {news.map((article, i) => (
                <a
                  key={i}
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start justify-between gap-3 py-3 group hover:bg-muted/10 -mx-4 px-4 transition-colors duration-100"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
                      {article.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {isRecentArticle(article.pubDate) && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gain uppercase tracking-wider">
                          <span className="h-1.5 w-1.5 rounded-full bg-gain inline-block animate-pulse" />
                          Récent
                        </span>
                      )}
                      {article.source && (
                        <Badge variant="outline" className="text-[10px] px-1.5 h-4 font-normal">
                          {article.source}
                        </Badge>
                      )}
                      <span className="text-[11px] text-muted-foreground/60">
                        {formatNewsDate(article.pubDate)}
                      </span>
                    </div>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 mt-0.5 transition-colors" />
                </a>
              ))}
            </div>
          ) : (
            <div className="py-4 flex flex-col items-center gap-3">
              <p className="text-[12px] text-muted-foreground text-center">
                Aucun article trouvé pour cette société.
              </p>
              <a
                href={`https://news.google.com/search?q=${encodeURIComponent(stock.name + " BRVM")}&hl=fr`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[12px] text-primary hover:underline underline-offset-2"
              >
                Rechercher sur Google News
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator className="my-5" />

      {/* Disclaimer */}
      <p className="text-[11px] text-muted-foreground/50 leading-relaxed">
        Les données présentées ne constituent pas un conseil en investissement.
        Investir comporte des risques de perte en capital. Source :{" "}
        <a
          href="https://www.brvm.org"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
        >
          www.brvm.org
        </a>
      </p>
    </div>
  );
}

export default async function StockPage({ params }: Props) {
  const { symbol } = await params;
  return (
    <Suspense
      fallback={
        <div className="px-6 py-10 text-muted-foreground text-sm animate-pulse">
          Chargement…
        </div>
      }
    >
      <StockPageContent symbol={symbol} />
    </Suspense>
  );
}
