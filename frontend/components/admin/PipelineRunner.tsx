"use client";

import { useState, useRef } from "react";
import { Calendar, Upload, Download, Play, CheckCircle2, XCircle, Loader2, FileText, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type Mode = "download" | "upload";

interface PipelineResult {
  success: boolean;
  session_date: string;
  duration_seconds: number;
  steps_completed: string[];
  error?: string | null;
}

interface StatusCheck {
  session_date: string;
  has_session: boolean;
  has_analysis: boolean;
}

export function PipelineRunner() {
  const [mode, setMode] = useState<Mode>("download");
  const [date, setDate] = useState<string>(() => {
    // Default to yesterday
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [skipAi, setSkipAi] = useState(false);
  const [skipRevalidation, setSkipRevalidation] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [statusCheck, setStatusCheck] = useState<StatusCheck | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function checkStatus() {
    if (!date) return;
    setCheckingStatus(true);
    setStatusCheck(null);
    try {
      const res = await fetch(`/api/admin/pipeline?date=${date}`);
      const data = await res.json();
      setStatusCheck(data);
    } catch {
      // ignore
    } finally {
      setCheckingStatus(false);
    }
  }

  async function run() {
    if (!date) return;
    setRunning(true);
    setResult(null);

    try {
      if (mode === "upload") {
        if (!file) return;
        const formData = new FormData();
        formData.append("file", file);
        formData.append("session_date", date);
        formData.append("skip_ai", String(skipAi));
        formData.append("skip_revalidation", String(skipRevalidation));
        const res = await fetch("/api/admin/pipeline?action=trigger-upload", {
          method: "POST",
          body: formData,
        });
        const data: PipelineResult = await res.json();
        setResult(data);
      } else {
        const res = await fetch("/api/admin/pipeline?action=trigger-sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_date: date,
            skip_download: false,
            skip_ai: skipAi,
            skip_revalidation: skipRevalidation,
          }),
        });
        const data: PipelineResult = await res.json();
        setResult(data);
      }
    } catch (err) {
      setResult({
        success: false,
        session_date: date,
        duration_seconds: 0,
        steps_completed: [],
        error: err instanceof Error ? err.message : "Erreur inconnue",
      });
    } finally {
      setRunning(false);
    }
  }

  const tabCls = (active: boolean) =>
    [
      "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors",
      active
        ? "bg-background text-foreground shadow-sm border border-border"
        : "text-muted-foreground hover:text-foreground",
    ].join(" ");

  return (
    <div className="space-y-5">
      {/* Mode selector */}
      <div className="flex gap-1.5 bg-muted/40 rounded-xl p-1 w-fit">
        <button className={tabCls(mode === "download")} onClick={() => setMode("download")}>
          <Download className="h-4 w-4" />
          Télécharger depuis BRVM
        </button>
        <button className={tabCls(mode === "upload")} onClick={() => setMode("upload")}>
          <Upload className="h-4 w-4" />
          Uploader un PDF
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Config card */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-4">
            {/* Date picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Date de séance
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => { setDate(e.target.value); setStatusCheck(null); setResult(null); }}
                    max={new Date().toISOString().slice(0, 10)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <button
                  onClick={checkStatus}
                  disabled={!date || checkingStatus}
                  className="px-3 py-2 text-xs font-medium bg-muted hover:bg-muted/80 border border-border rounded-lg text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  {checkingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : "Vérifier"}
                </button>
              </div>

              {/* Status indicator */}
              {statusCheck && (
                <div className="flex gap-2 mt-1.5">
                  <span className={`text-[11px] font-medium ${statusCheck.has_session ? "text-gain" : "text-muted-foreground"}`}>
                    {statusCheck.has_session ? "✓" : "○"} Session en DB
                  </span>
                  <span className="text-muted-foreground/40">·</span>
                  <span className={`text-[11px] font-medium ${statusCheck.has_analysis ? "text-gain" : "text-muted-foreground"}`}>
                    {statusCheck.has_analysis ? "✓" : "○"} Analyse IA en DB
                  </span>
                </div>
              )}
            </div>

            {/* Upload zone */}
            {mode === "upload" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Fichier BOC (PDF)
                </label>
                <div
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const f = e.dataTransfer.files[0];
                    if (f?.type === "application/pdf") setFile(f);
                  }}
                  className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-5 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                >
                  {file ? (
                    <>
                      <FileText className="h-6 w-6 text-primary" />
                      <p className="text-sm font-medium text-foreground text-center break-all">{file.name}</p>
                      <p className="text-[11px] text-muted-foreground">{(file.size / 1024).toFixed(0)} Ko</p>
                    </>
                  ) : (
                    <>
                      <Upload className="h-6 w-6 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Glisser-déposer ou cliquer</p>
                      <p className="text-[11px] text-muted-foreground/60">PDF uniquement</p>
                    </>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </div>
            )}

            {/* Options */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Options</label>
              <div className="space-y-1.5">
                {[
                  { label: "Ignorer l'analyse IA", value: skipAi, set: setSkipAi },
                  { label: "Ignorer la revalidation ISR", value: skipRevalidation, set: setSkipRevalidation },
                ].map(({ label, value, set }) => (
                  <label key={label} className="flex items-center gap-2.5 cursor-pointer group">
                    <div
                      onClick={() => set(!value)}
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${value ? "bg-primary border-primary" : "border-border bg-background"}`}
                    >
                      {value && <span className="text-primary-foreground text-[10px] font-bold leading-none">✓</span>}
                    </div>
                    <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Run button */}
            <button
              onClick={run}
              disabled={running || !date || (mode === "upload" && !file)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {running ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyse en cours…
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Lancer le pipeline
                </>
              )}
            </button>
          </CardContent>
        </Card>

        {/* Result card */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Résultat
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {!result && !running && (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center">
                  <Play className="h-5 w-5 text-muted-foreground/40" />
                </div>
                <p className="text-sm text-muted-foreground">Choisissez une date et lancez le pipeline.</p>
              </div>
            )}

            {running && (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Pipeline en cours d&apos;exécution…</p>
                <p className="text-[11px] text-muted-foreground/60">Cela peut prendre 1 à 3 minutes.</p>
              </div>
            )}

            {result && !running && (
              <div className="space-y-4">
                {/* Status banner */}
                <div className={`flex items-center gap-3 p-3 rounded-lg ${result.success ? "bg-gain/10 border border-gain/20" : "bg-loss/10 border border-loss/20"}`}>
                  {result.success
                    ? <CheckCircle2 className="h-5 w-5 text-gain shrink-0" />
                    : <XCircle className="h-5 w-5 text-loss shrink-0" />
                  }
                  <div>
                    <p className={`text-sm font-semibold ${result.success ? "text-gain" : "text-loss"}`}>
                      {result.success ? "Pipeline terminé avec succès" : "Échec du pipeline"}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {result.session_date} · {result.duration_seconds}s
                    </p>
                  </div>
                </div>

                {/* Steps */}
                {result.steps_completed.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] uppercase tracking-wide font-medium text-muted-foreground">Étapes complétées</p>
                    <div className="space-y-1">
                      {result.steps_completed.map((step) => (
                        <div key={step} className="flex items-center gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-gain shrink-0" />
                          <span className="text-[12px] text-foreground font-mono">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Error */}
                {result.error && (
                  <div className="flex gap-2 p-3 bg-loss/5 border border-loss/20 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-loss shrink-0 mt-0.5" />
                    <p className="text-[12px] text-loss/90 font-mono break-all">{result.error}</p>
                  </div>
                )}

                <Separator />

                {/* Quick actions */}
                {result.success && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] uppercase tracking-wide font-medium text-muted-foreground">Actions rapides</p>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={`/history`}
                        className="text-[12px] text-primary hover:underline underline-offset-2"
                      >
                        Voir l&apos;historique →
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info box */}
      <div className="flex gap-3 p-3.5 bg-muted/30 border border-border rounded-lg">
        <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-[12px] text-muted-foreground space-y-1">
          <p><span className="font-semibold text-foreground">Mode Téléchargement</span> — télécharge le BOC PDF depuis brvm.org pour la date choisie, puis exécute le pipeline complet.</p>
          <p><span className="font-semibold text-foreground">Mode Upload</span> — utile si le téléchargement automatique échoue ou pour analyser un vieux BOC archivé.</p>
          <p className="text-muted-foreground/60">Le pipeline peut prendre 1 à 3 min (téléchargement + extraction + IA + DB + revalidation).</p>
        </div>
      </div>
    </div>
  );
}
