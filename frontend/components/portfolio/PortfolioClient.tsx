"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
  Upload,
  Briefcase,
  RefreshCw,
  Info,
} from "lucide-react";
import {
  loadPortfolio,
  addPosition,
  removePosition,
  enrichPositions,
  computeSummary,
  formatXOF,
  parseCsvRows,
  detectColumns,
} from "@/lib/portfolio";
import type { Portfolio, PositionWithMarket, BrokerAccount } from "@/types/portfolio";
import type { StockQuote } from "@/types/brvm";
import { ImportDialog } from "./ImportDialog";

const BROKER_LABELS: Record<BrokerAccount, string> = {
  SGI_TOGO: "SGI TOGO",
  SA2IF: "SA2IF",
  AUTRE: "Autre",
};

interface Props {
  stocks: StockQuote[];
}

function PnlBadge({ value, pct }: { value: number | null; pct: number | null }) {
  if (value === null || pct === null) return <span className="text-muted-foreground text-xs">—</span>;
  const pos = value >= 0;
  const Icon = pos ? TrendingUp : TrendingDown;
  return (
    <div className={`flex flex-col items-end gap-0.5`}>
      <span className={`text-sm font-mono font-semibold tabular-nums ${pos ? "text-gain" : "text-loss"}`}>
        {pos ? "+" : ""}{formatXOF(value)}
      </span>
      <span className={`text-[11px] font-mono tabular-nums flex items-center gap-1 ${pos ? "text-gain" : "text-loss"}`}>
        <Icon className="h-2.5 w-2.5" />
        {pos ? "+" : ""}{pct.toFixed(2)}%
      </span>
    </div>
  );
}

function AddPositionDialog({ stocks, onAdd }: { stocks: StockQuote[]; onAdd: () => void }) {
  const [open, setOpen] = useState(false);
  const [symbol, setSymbol] = useState("");
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [account, setAccount] = useState<BrokerAccount>("SGI_TOGO");
  const [notes, setNotes] = useState("");

  const matchedStock = stocks.find((s) => s.symbol === symbol.toUpperCase());

  const handleSymbolChange = (val: string) => {
    setSymbol(val.toUpperCase());
    const s = stocks.find((s) => s.symbol === val.toUpperCase());
    if (s && !price) setPrice(String(s.close));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sym = symbol.toUpperCase().trim();
    const q = parseFloat(qty);
    const p = parseFloat(price.replace(",", "."));
    if (!sym || isNaN(q) || isNaN(p) || q <= 0 || p <= 0) return;
    addPosition({
      symbol: sym,
      name: matchedStock?.name ?? sym,
      quantity: q,
      avgBuyPrice: p,
      buyDate: date,
      account,
      notes: notes.trim() || undefined,
    });
    setSymbol(""); setQty(""); setPrice(""); setNotes("");
    setOpen(false);
    onAdd();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Ajouter une position
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvelle position</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Symbol */}
          <div className="space-y-1.5">
            <Label htmlFor="symbol">Symbole BRVM</Label>
            <div className="relative">
              <Input
                id="symbol"
                list="brvm-symbols"
                value={symbol}
                onChange={(e) => handleSymbolChange(e.target.value)}
                placeholder="ex: SGBCI, SNTS, ETIT…"
                className="font-mono uppercase"
                required
              />
              <datalist id="brvm-symbols">
                {stocks.map((s) => (
                  <option key={s.symbol} value={s.symbol}>{s.name}</option>
                ))}
              </datalist>
            </div>
            {matchedStock && (
              <p className="text-[11px] text-muted-foreground">
                {matchedStock.name} · Cours actuel :{" "}
                <span className="font-mono text-foreground">{matchedStock.close.toLocaleString("fr-FR")} XOF</span>
              </p>
            )}
          </div>

          {/* Quantity + Price */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="qty">Quantité (titres)</Label>
              <Input
                id="qty"
                type="number"
                min="1"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder="100"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="price">Prix moyen d&apos;achat (XOF)</Label>
              <Input
                id="price"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="12 500"
                className="font-mono"
                required
              />
            </div>
          </div>

          {/* Date + Account */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="date">Date d&apos;achat</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Compte</Label>
              <Select value={account} onValueChange={(v: string) => setAccount(v as BrokerAccount)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(BROKER_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes (optionnel)</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: achat progressif, dividende attendu…"
            />
          </div>

          {/* Preview */}
          {qty && price && !isNaN(parseFloat(qty)) && !isNaN(parseFloat(price.replace(",", "."))) && (
            <div className="rounded-md bg-muted/40 border border-border px-3 py-2.5 text-[12px]">
              <span className="text-muted-foreground">Valorisation initiale : </span>
              <span className="font-mono font-semibold text-foreground">
                {formatXOF(parseFloat(qty) * parseFloat(price.replace(",", ".")))}
              </span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" size="sm">
              Ajouter
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function PortfolioClient({ stocks }: Props) {
  const [portfolio, setPortfolio] = useState<Portfolio>({ positions: [], updatedAt: "" });
  const [mounted, setMounted] = useState(false);

  const reload = useCallback(() => {
    setPortfolio(loadPortfolio());
  }, []);

  useEffect(() => {
    reload();
    setMounted(true);
  }, [reload]);

  const priceMap = new Map(stocks.map((s) => [s.symbol, s.close]));
  const enriched: PositionWithMarket[] = enrichPositions(portfolio.positions, priceMap);
  const summary = computeSummary(enriched);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground text-sm animate-pulse">
        Chargement du portefeuille…
      </div>
    );
  }

  const isEmpty = enriched.length === 0;

  return (
    <div className="space-y-5">
      {/* ── Actions bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">Mon portefeuille</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {enriched.length} position{enriched.length !== 1 ? "s" : ""} · {BROKER_LABELS[enriched[0]?.account ?? "SGI_TOGO"]} &amp; affiliés
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ImportDialog stocks={stocks} onImport={reload} />
          <AddPositionDialog stocks={stocks} onAdd={reload} />
        </div>
      </div>

      {/* ── Summary cards ── */}
      {!isEmpty && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Valorisation totale",
              value: formatXOF(summary.totalValue),
              sub: null,
              accent: false,
            },
            {
              label: "Coût total",
              value: formatXOF(summary.totalCost),
              sub: null,
              accent: false,
            },
            {
              label: "P&L non réalisé",
              value: `${summary.totalPnl >= 0 ? "+" : ""}${formatXOF(summary.totalPnl)}`,
              sub: `${summary.totalPnlPct >= 0 ? "+" : ""}${summary.totalPnlPct.toFixed(2)}%`,
              accent: true,
              up: summary.totalPnl >= 0,
            },
            {
              label: "Positions",
              value: String(enriched.length),
              sub: `${stocks.filter((s) => enriched.some((p) => p.symbol === s.symbol && s.variation_pct > 0)).length} en hausse`,
              accent: false,
            },
          ].map((card) => (
            <Card key={card.label} className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">
                  {card.label}
                </p>
                <p
                  className={`font-mono text-lg font-bold tabular-nums leading-tight ${
                    card.accent ? (card.up ? "text-gain" : "text-loss") : "text-foreground"
                  }`}
                >
                  {card.value}
                </p>
                {card.sub && (
                  <p className={`text-[12px] font-mono mt-0.5 ${card.accent ? (card.up ? "text-gain" : "text-loss") : "text-muted-foreground"}`}>
                    {card.sub}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Positions table ── */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Positions ouvertes
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {isEmpty ? (
            <div className="py-16 flex flex-col items-center gap-3 text-center px-6">
              <Briefcase className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground font-medium">Aucune position enregistrée</p>
              <p className="text-xs text-muted-foreground/60 max-w-xs">
                Ajoutez vos titres BRVM manuellement ou importez un relevé CSV de votre broker (SGI TOGO, SA2IF).
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: "700px" }}>
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Valeur</th>
                    <th className="text-right px-4 py-2.5 text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Qté</th>
                    <th className="text-right px-4 py-2.5 text-[11px] uppercase tracking-wide text-muted-foreground font-medium">PRU</th>
                    <th className="text-right px-4 py-2.5 text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Cours actuel</th>
                    <th className="text-right px-4 py-2.5 text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Valorisation</th>
                    <th className="text-right px-4 py-2.5 text-[11px] uppercase tracking-wide text-muted-foreground font-medium">P&amp;L</th>
                    <th className="text-right px-3 py-2.5 text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Compte</th>
                    <th className="px-3" />
                  </tr>
                </thead>
                <tbody>
                  {enriched.map((pos, i) => {
                    const livePct = stocks.find((s) => s.symbol === pos.symbol)?.variation_pct ?? null;
                    return (
                      <tr
                        key={pos.id}
                        className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        {/* Symbol + name */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-mono font-bold text-[13px] text-gold">{pos.symbol}</span>
                            <span className="text-[11px] text-muted-foreground truncate max-w-[140px]">{pos.name}</span>
                            <span className="text-[10px] text-muted-foreground/50">{pos.buyDate}</span>
                          </div>
                        </td>
                        {/* Qty */}
                        <td className="px-4 py-3 text-right font-mono text-[13px] tabular-nums text-foreground">
                          {pos.quantity.toLocaleString("fr-FR")}
                        </td>
                        {/* PRU */}
                        <td className="px-4 py-3 text-right font-mono text-[13px] tabular-nums text-muted-foreground">
                          {pos.avgBuyPrice.toLocaleString("fr-FR")}
                        </td>
                        {/* Current price */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="font-mono text-[13px] tabular-nums text-foreground">
                              {pos.currentPrice?.toLocaleString("fr-FR") ?? "—"}
                            </span>
                            {livePct !== null && (
                              <span className={`text-[11px] font-mono tabular-nums ${livePct >= 0 ? "text-gain" : "text-loss"}`}>
                                {livePct >= 0 ? "+" : ""}{livePct.toFixed(2)}%
                              </span>
                            )}
                          </div>
                        </td>
                        {/* Value */}
                        <td className="px-4 py-3 text-right font-mono text-[13px] tabular-nums text-foreground">
                          {pos.currentValue !== null ? formatXOF(pos.currentValue) : formatXOF(pos.costBasis)}
                        </td>
                        {/* P&L */}
                        <td className="px-4 py-3 text-right">
                          <PnlBadge value={pos.unrealizedPnl} pct={pos.unrealizedPnlPct} />
                        </td>
                        {/* Account */}
                        <td className="px-3 py-3 text-right">
                          <Badge variant="outline" className="text-[10px] font-normal">
                            {BROKER_LABELS[pos.account]}
                          </Badge>
                        </td>
                        {/* Delete */}
                        <td className="px-3 py-3">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-loss">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Supprimer {pos.symbol} ?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  La position sera retirée de votre portefeuille local. Cette action est irréversible.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-loss hover:bg-loss/90 text-white"
                                  onClick={() => { removePosition(pos.id); reload(); }}
                                >
                                  Supprimer
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Disclaimer ── */}
      <div className="flex items-start gap-2 text-[11px] text-muted-foreground/50 leading-relaxed">
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <p>
          Données stockées localement sur votre navigateur. Aucune information n&apos;est transmise à des tiers.
          Les cours sont mis à jour toutes les 5 minutes depuis la BRVM. Les P&amp;L sont indicatifs et ne constituent pas un conseil en investissement.
        </p>
      </div>
    </div>
  );
}
