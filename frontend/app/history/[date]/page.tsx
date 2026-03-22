import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getSession, getSessionAnalysis } from "@/lib/api";
import {
  formatVariation,
  formatSessionDate,
  variationBg,
  sentimentLabel,
  sentimentColor,
  formatCFA,
} from "@/lib/format";
import type { Metadata } from "next";

export const revalidate = 86400;

interface Props {
  params: Promise<{ date: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { date } = await params;
  return {
    title: `Séance du ${date} — BRVM Daily Analyzer`,
  };
}

async function SessionContent({ date }: { date: string }) {
  const [sessionRes, analysisRes] = await Promise.allSettled([
    getSession(date),
    getSessionAnalysis(date),
  ]);

  if (sessionRes.status === "rejected") {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground text-sm mb-2">
          Séance du {date} non disponible.
        </p>
        <p className="text-xs text-muted-foreground/60">
          Le pipeline ne s&apos;est peut-être pas exécuté ce jour-là, ou la date
          est incorrecte.
        </p>
        <Link
          href="/history"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mt-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Choisir une autre date
        </Link>
      </div>
    );
  }

  const session = sessionRes.value;
  const analysis = analysisRes.status === "fulfilled" ? analysisRes.value : null;
  const stocks = session.stocks ?? [];
  const pct = session.composite.variation_pct;
  const compositeUp = pct >= 0;

  const topHausses = [...stocks]
    .sort((a, b) => b.variation_pct - a.variation_pct)
    .slice(0, 5);
  const topBaisses = [...stocks]
    .sort((a, b) => a.variation_pct - b.variation_pct)
    .slice(0, 5);

  return (
    <div className="px-4 sm:px-6 py-5 pb-20 max-w-4xl mx-auto">
      {/* Back */}
      <Link
        href="/history"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5"
      >
        <ArrowLeft className="h-4 w-4" />
        Calendrier
      </Link>

      {/* Header */}
      <div className="mb-6">
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-medium mb-1">
          Séance du
        </p>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground capitalize">
          {formatSessionDate(date)}
        </h1>
      </div>

      {/* Composite hero */}
      <Card className="bg-card border-border mb-5 overflow-hidden">
        <div
          className="h-0.5"
          style={{
            background: compositeUp ? "var(--color-gain)" : "var(--color-loss)",
          }}
        />
        <CardContent className="pt-4 pb-4 px-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                Indice Composite BRVM
              </p>
              <div className="flex items-baseline gap-3">
                <span
                  className={`font-display text-4xl sm:text-5xl font-bold tabular-nums text-foreground${compositeUp ? " glow-gain" : ""}`}
                >
                  {session.composite.value.toLocaleString("fr-FR", {
                    maximumFractionDigits: 2,
                  })}
                </span>
                <span
                  className={`font-mono text-lg font-semibold tabular-nums${compositeUp ? " text-gain" : " text-loss"}`}
                >
                  {formatVariation(pct)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-5">
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Hausses</p>
                <p className="font-mono text-xl font-bold text-gain">{session.advancing}</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Baisses</p>
                <p className="font-mono text-xl font-bold text-loss">{session.declining}</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Stables</p>
                <p className="font-mono text-xl font-bold text-muted-foreground">
                  {session.unchanged}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Analysis summary */}
      {analysis && (
        <Card className="bg-card border-border mb-5">
          <CardContent className="pt-4 pb-4 px-5">
            <div className="flex items-center gap-2 mb-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Analyse IA
              </p>
              <Badge
                variant="outline"
                className={`text-[10px] font-mono px-1.5 py-0 h-4 border ${sentimentColor(analysis.market_sentiment)} border-current/30 bg-current/10`}
              >
                {sentimentLabel(analysis.market_sentiment)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {analysis.resume_executif}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Top movers */}
      {stocks.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          {/* Top Hausses */}
          <Card className="bg-card border-border">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-1.5 mb-3">
                <TrendingUp className="h-3.5 w-3.5 text-gain" />
                <p className="text-xs font-semibold text-foreground">Top Hausses</p>
              </div>
              <div className="space-y-1.5">
                {topHausses.map((s) => (
                  <Link
                    key={s.symbol}
                    href={`/stock/${s.symbol}`}
                    className="flex items-center gap-2 hover:bg-muted/30 -mx-2 px-2 py-1 rounded transition-colors"
                  >
                    <span className="font-mono text-xs font-semibold text-foreground w-14 shrink-0">
                      {s.symbol}
                    </span>
                    <span className="flex-1 text-[10px] text-muted-foreground truncate">
                      {s.name}
                    </span>
                    <Badge
                      variant="outline"
                      className={`font-mono text-[10px] px-1.5 py-0 h-4 border shrink-0 ${variationBg(s.variation_pct)}`}
                    >
                      {formatVariation(s.variation_pct)}
                    </Badge>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Baisses */}
          <Card className="bg-card border-border">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-1.5 mb-3">
                <TrendingDown className="h-3.5 w-3.5 text-loss" />
                <p className="text-xs font-semibold text-foreground">Top Baisses</p>
              </div>
              <div className="space-y-1.5">
                {topBaisses.map((s) => (
                  <Link
                    key={s.symbol}
                    href={`/stock/${s.symbol}`}
                    className="flex items-center gap-2 hover:bg-muted/30 -mx-2 px-2 py-1 rounded transition-colors"
                  >
                    <span className="font-mono text-xs font-semibold text-foreground w-14 shrink-0">
                      {s.symbol}
                    </span>
                    <span className="flex-1 text-[10px] text-muted-foreground truncate">
                      {s.name}
                    </span>
                    <Badge
                      variant="outline"
                      className={`font-mono text-[10px] px-1.5 py-0 h-4 border shrink-0 ${variationBg(s.variation_pct)}`}
                    >
                      {formatVariation(s.variation_pct)}
                    </Badge>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Market summary stats */}
      <Card className="bg-card border-border">
        <CardContent className="pt-4 pb-0 px-0">
          <div className="grid grid-cols-2 sm:grid-cols-3">
            {[
              {
                label: "Capitalisation",
                value: formatCFA(session.market_cap, true),
              },
              {
                label: "Valeurs cotées",
                value: `${stocks.length} actions`,
              },
              {
                label: "Valeur échangée",
                value: formatCFA(
                  stocks.reduce((s, x) => s + (x.value_traded ?? 0), 0),
                  true
                ),
              },
            ].map((item, i) => (
              <div
                key={item.label}
                className="p-3.5 flex flex-col gap-1"
                style={{
                  borderRight:
                    i < 2 ? "1px solid hsl(var(--border))" : undefined,
                }}
              >
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {item.label}
                </p>
                <p className="font-mono text-sm font-semibold text-foreground">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {session.announcements && (
        <Card className="bg-card border-border mt-4">
          <CardContent className="pt-4 pb-4 px-5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
              Annonces
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {session.announcements}
            </p>
          </CardContent>
        </Card>
      )}

      <p className="text-[11px] text-muted-foreground/50 mt-6 leading-relaxed">
        Les analyses présentées ne constituent pas un conseil en investissement.
        Source :{" "}
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

export default async function SessionDatePage({ params }: Props) {
  const { date } = await params;
  return (
    <Suspense
      fallback={
        <div className="px-6 py-10 text-muted-foreground text-sm animate-pulse">
          Chargement de la séance…
        </div>
      }
    >
      <SessionContent date={date} />
    </Suspense>
  );
}
