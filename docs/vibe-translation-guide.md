# Design System & Vibe — BRVM Daily Analyzer

## L'Identité Visuelle BRVM Analyzer

**Vibe** : Dashboard financier africain — professionnel, lisible, données-first.
Pas de fioritures. Chaque pixel sert les données. Inspiré des Bloomberg Terminal et Robinhood, adapté à la zone UEMOA.

**Ton** : Confiant mais humble. Analytique sans être froid. En français, accessible.

---

## Palette de Couleurs

```css
/* Couleurs Primaires */
--brvm-green: #2E8B57;        /* Vert BRVM — accent principal, hausses */
--background-dark: #0F172A;   /* Fond sombre — thème dark */
--background-light: #F8FAFC;  /* Fond clair — thème light */

/* Couleurs Sémantiques */
--color-up: #22C55E;          /* Variation positive */
--color-down: #EF4444;        /* Variation négative */
--color-neutral: #94A3B8;     /* Variation nulle / texte secondaire */

/* Couleurs d'Interface */
--card-dark: #1E293B;         /* Cartes en thème dark */
--card-light: #FFFFFF;        /* Cartes en thème light */
--border-dark: #334155;       /* Bordures en thème dark */
--text-primary: #F1F5F9;      /* Texte principal (dark) */
--text-secondary: #94A3B8;    /* Texte secondaire */

/* Sentiment */
--bullish: #22C55E;           /* Marché haussier */
--bearish: #EF4444;           /* Marché baissier */
--neutre: #F59E0B;            /* Marché neutre */
```

---

## Typographie

```css
/* Titres — DM Sans */
font-family: 'DM Sans', sans-serif;
/* Utiliser pour : h1, h2, h3, noms d'actions, indices */

/* Corps — Inter */
font-family: 'Inter', sans-serif;
/* Utiliser pour : paragraphes, labels, descriptions */

/* Données financières — Tabular nums */
font-variant-numeric: tabular-nums;
/* Utiliser pour : cours, variations, volumes (alignement colonne) */
```

---

## Composants UI (shadcn/ui adapté BRVM)

### Carte Indice

```tsx
// Affiche BRVM Composite / BRVM 30 / Prestige
<Card className="bg-card border-border">
  <CardContent className="p-4">
    <p className="text-sm text-muted-foreground font-sans">BRVM Composite</p>
    <p className="text-2xl font-bold font-sans tabular-nums">217.45</p>
    <Badge variant={variation > 0 ? "success" : "destructive"}>
      {variation > 0 ? "+" : ""}{variation.toFixed(2)}%
    </Badge>
  </CardContent>
</Card>
```

### Badge de Variation

```tsx
// Vert si hausse, rouge si baisse, gris si neutre
const VariationBadge = ({ value }: { value: number }) => (
  <span className={cn(
    "font-tabular text-sm font-medium px-2 py-0.5 rounded",
    value > 0 && "text-green-500 bg-green-500/10",
    value < 0 && "text-red-500 bg-red-500/10",
    value === 0 && "text-slate-400 bg-slate-400/10"
  )}>
    {value > 0 ? "+" : ""}{value.toFixed(2)}%
  </span>
)
```

### Jauge de Sentiment

```tsx
// Bullish / Neutre / Bearish avec couleur et icône
const SentimentGauge = ({ sentiment }: { sentiment: 'bullish' | 'neutre' | 'bearish' }) => {
  const config = {
    bullish: { label: 'Haussier', color: 'text-green-500', icon: '▲', bg: 'bg-green-500/10' },
    neutre: { label: 'Neutre', color: 'text-amber-500', icon: '●', bg: 'bg-amber-500/10' },
    bearish: { label: 'Baissier', color: 'text-red-500', icon: '▼', bg: 'bg-red-500/10' },
  }
  const { label, color, icon, bg } = config[sentiment]
  return (
    <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg", bg)}>
      <span className={cn("text-lg", color)}>{icon}</span>
      <span className={cn("font-semibold", color)}>{label}</span>
    </div>
  )
}
```

---

## Navigation Mobile (Bottom Nav)

```tsx
// 4 onglets principaux en bas sur mobile
const tabs = [
  { label: "Accueil", icon: Home, href: "/" },
  { label: "Actions", icon: TrendingUp, href: "/stocks" },
  { label: "Secteurs", icon: PieChart, href: "/sectors" },
  { label: "Historique", icon: Calendar, href: "/history" },
]
```

---

## Graphiques (Recharts)

### Palette pour les Graphiques

```tsx
const CHART_COLORS = {
  line: "#2E8B57",          // Courbe principale — vert BRVM
  area_fill: "#2E8B5720",   // Remplissage zone — vert semi-transparent
  grid: "#334155",          // Grille — discret en dark
  axis: "#64748B",          // Axes — texte secondaire
  tooltip_bg: "#1E293B",    // Fond tooltip
}
```

### Sparklines dans les Cartes Actions

```tsx
// Mini graphique 5 jours dans les cartes de liste
<Sparklines data={last5days.map(d => d.cours)} width={60} height={20}>
  <SparklinesLine color={trend > 0 ? "#22C55E" : "#EF4444"} />
</Sparklines>
```

---

## Analyse IA — Rendu Markdown

L'analyse Claude est du Markdown. La rendre avec `react-markdown` + styles BRVM :

```tsx
import ReactMarkdown from 'react-markdown'

<ReactMarkdown
  className="prose prose-invert prose-sm max-w-none
             prose-headings:text-slate-200
             prose-p:text-slate-300
             prose-strong:text-white"
>
  {analysis.synthese}
</ReactMarkdown>
```

---

## Skeleton Loaders

Toujours afficher un skeleton pendant le chargement des données :

```tsx
// Skeleton pour une carte action
<Card>
  <CardContent className="p-4 space-y-2">
    <Skeleton className="h-4 w-16" />     {/* Symbole */}
    <Skeleton className="h-6 w-24" />     {/* Cours */}
    <Skeleton className="h-4 w-12" />     {/* Variation */}
  </CardContent>
</Card>
```

---

## Règles de Design à Respecter

1. **Données d'abord** : Le cours et la variation sont toujours visibles, jamais cachés derrière un hover
2. **Couleurs sémantiques** : Vert = hausse / Rouge = baisse. Jamais l'inverse
3. **Tabular nums** : Tous les chiffres financiers doivent utiliser `tabular-nums` pour l'alignement
4. **Disclaimer** : Toujours visible, jamais dans un footer qu'on doit scroller pour voir
5. **Mode sombre par défaut** : Le dashboard s'ouvre en dark mode (Bloomberg vibe)
6. **Pas de publicités** : L'interface est épurée. Pas de banners, pas de popups
7. **Français uniquement** : Toute l'interface en français, terminologie financière standard
