"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { detectColumns, parseCsvRows, addPosition } from "@/lib/portfolio";
import type { ParsedCsvRow } from "@/lib/portfolio";
import type { StockQuote } from "@/types/brvm";
import type { BrokerAccount } from "@/types/portfolio";

const BROKER_LABELS: Record<BrokerAccount, string> = {
  SGI_TOGO: "SGI TOGO",
  SA2IF: "SA2IF",
  AUTRE: "Autre",
};

interface Props {
  stocks: StockQuote[];
  onImport: () => void;
}

/**
 * Format présets pour les brokers BRVM connus.
 * SGI TOGO et SA2IF produisent des relevés avec des colonnes similaires
 * basées sur le format standard DC/BR (Dépositaire Central BRVM).
 */
const PRESETS: Record<string, Record<string, string>> = {
  sgi_togo: {
    symbol: "Valeur",
    quantity: "Quantité",
    price: "Prix unitaire",
    date: "Date",
    name: "Libellé",
  },
  sa2if: {
    symbol: "Titre",
    quantity: "Nombre",
    price: "Cours",
    date: "Date opération",
    name: "Société",
  },
  generic: {
    symbol: "",
    quantity: "",
    price: "",
    date: "",
    name: "",
  },
};

export function ImportDialog({ stocks, onImport }: Props) {
  const [open, setOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [colMap, setColMap] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<ParsedCsvRow[]>([]);
  const [account, setAccount] = useState<BrokerAccount>("SGI_TOGO");
  const [preset, setPreset] = useState<string>("sgi_togo");
  const [step, setStep] = useState<"upload" | "map" | "confirm">("upload");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setFileName(file.name);
    setError("");
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsvText(text);
      const firstLine = text.split(/\r?\n/)[0] ?? "";
      const delimiters = [";", ",", "\t", "|"];
      const delim = delimiters.find((d) => firstLine.split(d).length > 2) ?? ";";
      const cols = firstLine.split(delim).map((h) => h.replace(/^"|"$/g, "").trim());
      setHeaders(cols);

      // Auto-detect columns
      const detected = detectColumns(cols);
      const presetMap = PRESETS[preset] ?? PRESETS.generic;

      // Merge: preset overrides detected if header actually exists
      const merged: Record<string, string> = { ...detected };
      for (const [k, v] of Object.entries(presetMap)) {
        if (v && cols.includes(v)) merged[k] = v;
      }
      setColMap(merged);
      setStep("map");
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handlePreview = () => {
    const rows = parseCsvRows(csvText, colMap);
    if (rows.length === 0) {
      setError("Aucune ligne valide détectée. Vérifiez le mappage des colonnes.");
      return;
    }
    setError("");
    setPreview(rows);
    setStep("confirm");
  };

  const handleImport = () => {
    preview.forEach((row) => {
      const stock = stocks.find((s) => s.symbol === row.symbol);
      addPosition({
        symbol: row.symbol,
        name: row.name || stock?.name || row.symbol,
        quantity: row.quantity,
        avgBuyPrice: row.price,
        buyDate: row.date,
        account,
      });
    });
    onImport();
    setOpen(false);
    reset();
  };

  const reset = () => {
    setCsvText(""); setHeaders([]); setColMap({});
    setPreview([]); setStep("upload"); setFileName(""); setError("");
  };

  const colFields = [
    { key: "symbol", label: "Symbole / Valeur *" },
    { key: "quantity", label: "Quantité *" },
    { key: "price", label: "Prix d'achat *" },
    { key: "date", label: "Date" },
    { key: "name", label: "Nom société" },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Upload className="h-4 w-4" />
          Importer CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importer un relevé CSV</DialogTitle>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-2">
          {(["upload", "map", "confirm"] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {i + 1}
              </span>
              <span className="capitalize">{s === "upload" ? "Fichier" : s === "map" ? "Colonnes" : "Confirmer"}</span>
              {i < 2 && <span className="text-muted-foreground/40">›</span>}
            </div>
          ))}
        </div>

        {/* ── Step 1: Upload ── */}
        {step === "upload" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 space-y-1.5">
                <Label>Broker</Label>
                <Select value={preset} onValueChange={(v: string) => setPreset(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sgi_togo">SGI TOGO</SelectItem>
                    <SelectItem value="sa2if">SA2IF</SelectItem>
                    <SelectItem value="generic">Autre (détection auto)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-1.5">
                <Label>Compte</Label>
                <Select value={account} onValueChange={(v) => setAccount(v as BrokerAccount)}>
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

            {/* Drop zone */}
            <div
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
            >
              <FileText className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Glissez votre fichier CSV ici ou <span className="text-primary underline underline-offset-2">cliquez pour parcourir</span>
              </p>
              <p className="text-[11px] text-muted-foreground/60 mt-1">
                Formats acceptés : .csv, .txt · Encodage UTF-8 ou Latin-1
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </div>

            <div className="text-[11px] text-muted-foreground/60 space-y-1">
              <p className="font-medium text-muted-foreground">Format attendu :</p>
              <p>Colonnes séparées par <code className="bg-muted px-1 rounded">,</code> ou <code className="bg-muted px-1 rounded">;</code> · En-tête obligatoire</p>
              <p>Colonnes requises : symbole valeur, quantité, prix unitaire</p>
            </div>
          </div>
        )}

        {/* ── Step 2: Column mapping ── */}
        {step === "map" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[12px] text-muted-foreground bg-muted/30 rounded-md px-3 py-2">
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{fileName}</span>
              <span className="text-muted-foreground/50">·</span>
              <span>{headers.length} colonnes détectées</span>
            </div>

            <div className="space-y-3">
              <p className="text-[12px] text-muted-foreground">Associez les colonnes de votre fichier :</p>
              {colFields.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-3">
                  <Label className="w-40 shrink-0 text-[12px]">{label}</Label>
                  <Select
                    value={colMap[key] ?? ""}
                    onValueChange={(v: string) => setColMap((m) => ({ ...m, [key]: v === "__none__" ? "" : v }))}
                  >
                    <SelectTrigger className="h-8 text-[12px]">
                      <SelectValue placeholder="— ignorer —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— ignorer —</SelectItem>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {error && (
              <div className="flex items-center gap-2 text-loss text-[12px] bg-loss/10 rounded-md px-3 py-2">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setStep("upload")}>Retour</Button>
              <Button size="sm" onClick={handlePreview}>Aperçu →</Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Confirm ── */}
        {step === "confirm" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-gain text-[12px] bg-gain/10 rounded-md px-3 py-2">
              <CheckCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{preview.length} position{preview.length !== 1 ? "s" : ""} prête{preview.length !== 1 ? "s" : ""} à importer</span>
            </div>

            <div className="rounded-md border border-border overflow-hidden">
              <div className="overflow-y-auto max-h-56">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-3 py-2 text-muted-foreground font-medium">Symbole</th>
                      <th className="text-right px-3 py-2 text-muted-foreground font-medium">Qté</th>
                      <th className="text-right px-3 py-2 text-muted-foreground font-medium">Prix</th>
                      <th className="text-right px-3 py-2 text-muted-foreground font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-b border-border/40 last:border-0">
                        <td className="px-3 py-1.5 font-mono font-bold text-gold">{row.symbol}</td>
                        <td className="px-3 py-1.5 text-right font-mono tabular-nums">{row.quantity}</td>
                        <td className="px-3 py-1.5 text-right font-mono tabular-nums">{row.price.toLocaleString("fr-FR")}</td>
                        <td className="px-3 py-1.5 text-right text-muted-foreground">{row.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setStep("map")}>Retour</Button>
              <Button size="sm" onClick={handleImport}>
                Importer {preview.length} position{preview.length !== 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
