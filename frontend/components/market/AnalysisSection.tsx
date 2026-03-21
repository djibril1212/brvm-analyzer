import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { sentimentLabel, sentimentColor } from "@/lib/format";
import type { DailyAnalysis } from "@/types/brvm";
import { Sparkles, Eye, TrendingUp } from "lucide-react";

interface AnalysisSectionProps {
  analysis: DailyAnalysis;
}

export function AnalysisSection({ analysis }: AnalysisSectionProps) {
  const data = analysis.analysis_json;

  return (
    <div className="space-y-4">
      {/* Résumé + sentiment */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Analyse IA — Résumé de séance
            </CardTitle>
            <Badge
              variant="outline"
              className={`font-mono text-xs capitalize ${sentimentColor(analysis.market_sentiment)}`}
            >
              {sentimentLabel(analysis.market_sentiment)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {data.resume_executif}
          </p>

          {/* Analyse indices */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Composite
              </p>
              <p className="text-xs text-foreground/80 leading-relaxed">
                {data.analyse_indices.composite}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                BRVM-30
              </p>
              <p className="text-xs text-foreground/80 leading-relaxed">
                {data.analyse_indices.brvm30}
              </p>
            </div>
          </div>

          {data.analyse_indices.contexte_regional && (
            <p className="text-xs text-muted-foreground border-l-2 border-primary/30 pl-3 italic leading-relaxed">
              {data.analyse_indices.contexte_regional}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Top picks */}
      {data.top_picks.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Valeurs sous surveillance IA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.top_picks.map((pick, i) => (
              <div key={pick.symbole}>
                {i > 0 && <Separator className="mb-4" />}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-semibold text-sm text-foreground">
                      {pick.symbole}
                    </span>
                    <span className="text-xs text-muted-foreground">{pick.nom}</span>
                    <Badge
                      variant="outline"
                      className={`ml-auto font-mono text-xs ${
                        pick.variation_pct >= 0
                          ? "text-emerald-400 border-emerald-400/20"
                          : "text-red-400 border-red-400/20"
                      }`}
                    >
                      {pick.variation_pct > 0 ? "+" : ""}
                      {pick.variation_pct.toFixed(2)}%
                    </Badge>
                  </div>
                  <ul className="space-y-1">
                    {pick.arguments.map((arg, j) => (
                      <li key={j} className="text-xs text-muted-foreground flex gap-2">
                        <span className="text-primary mt-0.5">·</span>
                        <span>{arg}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-muted-foreground/60 italic">
                    {pick.note_de_prudence}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Valeurs en surveillance */}
      {data.valeurs_en_surveillance?.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Eye className="h-4 w-4 text-amber-400" />
              En surveillance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.valeurs_en_surveillance.map((v) => (
              <div key={v.symbole} className="flex gap-3 text-xs">
                <span className="font-mono font-semibold text-foreground w-16 shrink-0">
                  {v.symbole}
                </span>
                <span className="text-muted-foreground">{v.raison}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Perspectives */}
      {data.perspectives && (
        <Card className="bg-card border-border">
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Perspectives : </strong>
              {data.perspectives}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Disclaimer */}
      <p className="text-xs text-muted-foreground/50 text-center px-4">
        {data.disclaimer}
      </p>
    </div>
  );
}
