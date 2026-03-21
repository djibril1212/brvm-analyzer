// Utilitaires de formatage pour les données de marché BRVM

/** Formatte un nombre en CFA : 1 234 567 XOF */
export function formatCFA(value: number, compact = false): string {
  if (compact) {
    if (value >= 1e12) return `${(value / 1e12).toFixed(2)} Bn XOF`;
    if (value >= 1e9)  return `${(value / 1e9).toFixed(1)} Mds XOF`;
    if (value >= 1e6)  return `${(value / 1e6).toFixed(1)} M XOF`;
  }
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Formatte une variation en pourcentage avec signe */
export function formatVariation(pct: number): string {
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

/** Couleur Tailwind pour une variation */
export function variationColor(pct: number): string {
  if (pct > 0) return "text-emerald-400";
  if (pct < 0) return "text-red-400";
  return "text-muted-foreground";
}

/** Couleur de fond pour une variation (badge) */
export function variationBg(pct: number): string {
  if (pct > 0) return "bg-emerald-400/10 text-emerald-400 border-emerald-400/20";
  if (pct < 0) return "bg-red-400/10 text-red-400 border-red-400/20";
  return "bg-muted text-muted-foreground";
}

/** Formatte un volume : 1 234 titres */
export function formatVolume(vol: number): string {
  return new Intl.NumberFormat("fr-FR").format(vol);
}

/** Formatte une date BOC : "lundi 15 janvier 2025" */
export function formatSessionDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Sentiment → label lisible */
export function sentimentLabel(sentiment: string): string {
  const map: Record<string, string> = {
    haussier: "Haussier",
    baissier: "Baissier",
    neutre: "Neutre",
    mitigé: "Mitigé",
  };
  return map[sentiment] ?? sentiment;
}

export function sentimentColor(sentiment: string): string {
  if (sentiment === "haussier") return "text-emerald-400";
  if (sentiment === "baissier") return "text-red-400";
  return "text-amber-400";
}
