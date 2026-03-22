import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { sentimentLabel, sentimentColor } from "@/lib/format";
import type { DailyAnalysis, AnalysisJson } from "@/types/brvm";
import { Sparkles, Eye, TrendingUp, AlertTriangle, BarChart3 } from "lucide-react";

interface AnalysisSectionProps {
  analysis: DailyAnalysis;
}

const profilColors: Record<string, string> = {
  rendement: "text-gain border-[var(--color-gain)]/20 bg-[var(--color-gain)]/5",
  croissance: "text-[var(--color-data-blue)] border-[var(--color-data-blue)]/20 bg-[var(--color-data-blue)]/5",
  valeur: "text-amber-400 border-amber-500/20 bg-amber-500/5",
  spéculatif: "text-purple-400 border-purple-500/20 bg-purple-500/5",
};

function ScoreBadge({ score }: { score: number }) {
  const isHigh = score >= 7;
  const isMid = score >= 5;
  const colorClass = isHigh
    ? "text-gain border-[var(--color-gain)]/30 bg-[var(--color-gain)]/10"
    : isMid
    ? "text-amber-400 border-amber-500/30 bg-amber-500/10"
    : "text-loss border-[var(--color-loss)]/30 bg-[var(--color-loss)]/10";

  return (
    <span
      className={`inline-flex items-center justify-center min-w-[42px] h-[22px] px-2 rounded-full text-[11px] font-mono font-bold border ${colorClass}`}
    >
      {score}/10
    </span>
  );
}

function SectionTitle({ icon: Icon, children, iconColor }: { icon: React.ElementType; children: React.ReactNode; iconColor?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="h-4 w-4 shrink-0" style={{ color: iconColor ?? "hsl(var(--muted-foreground))" }} />
      <h3 className="text-[13px] font-semibold text-foreground">{children}</h3>
    </div>
  );
}

export function AnalysisSection({ analysis }: AnalysisSectionProps) {
  const data: AnalysisJson =
    typeof analysis.analysis_json === "string"
      ? JSON.parse(analysis.analysis_json)
      : analysis.analysis_json;

  return (
    <div className="space-y-3">
      {/* Summary + sentiment */}
      <Card className="bg-card border-border overflow-hidden relative">
        {/* Left accent border */}
        <div
          className="absolute left-0 top-0 bottom-0 w-[3px]"
          style={{ background: "linear-gradient(to bottom, hsl(var(--primary)), hsl(var(--primary) / 0.2))" }}
        />
        <CardContent className="pt-4 pb-4 pl-5 pr-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-gold shrink-0" />
              <span className="text-[13px] font-semibold text-foreground">Analyse IA — Résumé de séance</span>
            </div>
            <Badge
              variant="outline"
              className={`font-mono text-[11px] capitalize shrink-0 ${sentimentColor(analysis.market_sentiment)}`}
            >
              {sentimentLabel(analysis.market_sentiment)}
            </Badge>
          </div>

          {/* Résumé executif */}
          <p className="text-sm text-foreground/80 leading-relaxed mb-4">
            {data.resume_executif}
          </p>

          {/* Indices */}
          <div className="grid gap-3 sm:grid-cols-2 pt-3 border-t border-border/60">
            <div className="space-y-1">
              <p className="section-label">Composite</p>
              <p className="text-xs text-foreground/70 leading-relaxed">
                {data.analyse_indices.composite}
              </p>
            </div>
            <div className="space-y-1">
              <p className="section-label">BRVM-30</p>
              <p className="text-xs text-foreground/70 leading-relaxed">
                {data.analyse_indices.brvm30}
              </p>
            </div>
          </div>

          {data.analyse_indices.contexte_regional && (
            <p className="text-xs text-muted-foreground border-l-2 border-primary/30 pl-3 italic leading-relaxed mt-3">
              {data.analyse_indices.contexte_regional}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Top picks */}
      {data.top_picks.length > 0 && (
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-2 px-4">
            <SectionTitle icon={TrendingUp} iconColor="hsl(var(--primary))">
              Valeurs sous surveillance IA
            </SectionTitle>

            <div className="space-y-0">
              {data.top_picks.map((pick, i) => (
                <div key={pick.symbole}>
                  {i > 0 && <Separator className="my-3" />}
                  <div className="space-y-2">
                    {/* Symbol header */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-[15px] text-gold">
                        {pick.symbole}
                      </span>
                      <span className="text-xs text-muted-foreground flex-1 min-w-0 truncate">
                        {pick.nom}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {pick.score_opportunite !== undefined && (
                          <ScoreBadge score={pick.score_opportunite} />
                        )}
                        {pick.profil_investisseur && (
                          <Badge
                            variant="outline"
                            className={`text-[10px] capitalize ${profilColors[pick.profil_investisseur] ?? ""}`}
                          >
                            {pick.profil_investisseur}
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={`font-mono text-[11px] shrink-0 ${
                            pick.variation_pct >= 0
                              ? "text-gain border-[var(--color-gain)]/20 bg-[var(--color-gain)]/5"
                              : "text-loss border-[var(--color-loss)]/20 bg-[var(--color-loss)]/5"
                          }`}
                        >
                          {pick.variation_pct > 0 ? "+" : ""}
                          {pick.variation_pct.toFixed(2)}%
                        </Badge>
                      </div>
                    </div>

                    {/* Arguments */}
                    <ul className="space-y-1 pl-1">
                      {pick.arguments.map((arg, j) => (
                        <li key={j} className="text-[12px] text-muted-foreground flex gap-2 leading-relaxed">
                          <span className="text-gold mt-0.5 shrink-0 font-bold">·</span>
                          <span>{arg}</span>
                        </li>
                      ))}
                    </ul>

                    {pick.note_de_prudence && (
                      <p className="text-[11px] text-muted-foreground/50 italic pl-4 border-l border-border">
                        {pick.note_de_prudence}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Opportunités détaillées */}
      {data.opportunites_detaillees && data.opportunites_detaillees.length > 0 && (
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-3 px-4">
            <SectionTitle icon={BarChart3} iconColor="var(--color-data-blue)">
              Opportunités détectées ({data.opportunites_detaillees.length} valeurs)
            </SectionTitle>
            <div className="grid gap-2 sm:grid-cols-2">
              {data.opportunites_detaillees
                .sort((a, b) => b.score - a.score)
                .map((opp) => (
                  <div
                    key={opp.symbole}
                    className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/20 border border-border/50"
                  >
                    <div className="shrink-0 space-y-1">
                      <span className="font-mono font-bold text-[12px] text-foreground block">
                        {opp.symbole}
                      </span>
                      <ScoreBadge score={opp.score} />
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed pt-0.5">
                      {opp.signal}
                    </p>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Surveillance + Éviter in a 2-col grid when both present */}
      {(data.valeurs_en_surveillance?.length > 0 || (data.valeurs_a_eviter && data.valeurs_a_eviter.length > 0)) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.valeurs_en_surveillance?.length > 0 && (
            <Card className="bg-card border-border">
              <CardContent className="pt-4 pb-3 px-4">
                <SectionTitle icon={Eye} iconColor="#FBBF24">
                  En surveillance
                </SectionTitle>
                <div className="space-y-2">
                  {data.valeurs_en_surveillance.map((v) => (
                    <div key={v.symbole} className="flex gap-2.5">
                      <span className="font-mono font-semibold text-[12px] text-gold w-14 shrink-0 pt-0.5">
                        {v.symbole}
                      </span>
                      <span className="text-[12px] text-muted-foreground leading-relaxed">{v.raison}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {data.valeurs_a_eviter && data.valeurs_a_eviter.length > 0 && (
            <Card className="bg-card border-border">
              <CardContent className="pt-4 pb-3 px-4">
                <SectionTitle icon={AlertTriangle} iconColor="var(--color-loss)">
                  Signaux négatifs
                </SectionTitle>
                <div className="space-y-2">
                  {data.valeurs_a_eviter.map((v) => (
                    <div key={v.symbole} className="flex gap-2.5">
                      <span className="font-mono font-semibold text-[12px] text-loss w-14 shrink-0 pt-0.5">
                        {v.symbole}
                      </span>
                      <span className="text-[12px] text-muted-foreground leading-relaxed">{v.raison}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Perspectives */}
      {data.perspectives && (
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-4 px-4">
            <p className="section-label mb-2">Perspectives</p>
            <p className="text-[13px] text-foreground/70 leading-relaxed">
              {data.perspectives}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Disclaimer */}
      <p className="text-[11px] text-muted-foreground/40 text-center px-4 pb-1">
        {data.disclaimer}
      </p>
    </div>
  );
}
