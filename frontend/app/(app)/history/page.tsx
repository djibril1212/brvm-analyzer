"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];
const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  // 0=Sun→6, convert to Mon=0
  const d = new Date(year, month, 1).getDay();
  return (d + 6) % 7; // Mon=0, Tue=1, ..., Sun=6
}

function isWeekday(year: number, month: number, day: number) {
  const d = new Date(year, month, day).getDay();
  return d !== 0 && d !== 6; // not Sun, not Sat
}

function isFuture(year: number, month: number, day: number) {
  const today = new Date();
  const date = new Date(year, month, day);
  return date > today;
}

function formatDateISO(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function HistoryPage() {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  const canGoNext = !(viewYear === now.getFullYear() && viewMonth === now.getMonth());
  // Don't go further back than 12 months
  const minYear = now.getFullYear() - 1;
  const canGoPrev = !(viewYear === minYear && viewMonth === now.getMonth());

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  // Build calendar grid (fill with nulls for empty cells)
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  const todayStr = formatDateISO(now.getFullYear(), now.getMonth(), now.getDate());

  return (
    <div className="px-4 sm:px-6 py-5 pb-20 max-w-2xl mx-auto">
      {/* Back */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour au tableau de bord
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Calendar className="h-5 w-5 text-primary" />
          <h1 className="font-display text-3xl font-bold text-foreground">
            Historique
          </h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Navigue par date pour consulter les séances passées.
          Seuls les jours de bourse (lun–ven) sont cliquables.
        </p>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="pt-4 pb-5 px-4 sm:px-6">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-5">
            <Button
              variant="ghost"
              size="icon"
              onClick={prevMonth}
              disabled={!canGoPrev}
              className="h-8 w-8 text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <p className="font-display font-bold text-foreground text-lg">
              {MONTHS_FR[viewMonth]} {viewYear}
            </p>
            <Button
              variant="ghost"
              size="icon"
              onClick={nextMonth}
              disabled={!canGoNext}
              className="h-8 w-8 text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS_FR.map((d) => (
              <div
                key={d}
                className={`text-center text-[10px] font-medium uppercase tracking-wider py-1 ${
                  d === "Sam" || d === "Dim"
                    ? "text-muted-foreground/40"
                    : "text-muted-foreground"
                }`}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (!day) {
                return <div key={i} />;
              }

              const iso = formatDateISO(viewYear, viewMonth, day);
              const isToday = iso === todayStr;
              const weekday = isWeekday(viewYear, viewMonth, day);
              const future = isFuture(viewYear, viewMonth, day);
              const clickable = weekday && !future;

              if (!clickable) {
                return (
                  <div
                    key={i}
                    className={`aspect-square flex items-center justify-center rounded-lg text-sm ${
                      !weekday
                        ? "text-muted-foreground/25"
                        : "text-muted-foreground/40"
                    }`}
                  >
                    {day}
                  </div>
                );
              }

              return (
                <Link
                  key={i}
                  href={`/history/${iso}`}
                  className={`aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-150
                    ${
                      isToday
                        ? "bg-primary text-primary-foreground font-bold shadow-sm"
                        : "hover:bg-muted text-foreground hover:text-foreground cursor-pointer"
                    }
                  `}
                >
                  {day}
                </Link>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-5 pt-4 border-t border-border">
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-sm bg-primary" />
              <span className="text-[10px] text-muted-foreground">Aujourd&apos;hui</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-sm bg-muted border border-border" />
              <span className="text-[10px] text-muted-foreground">Jour de bourse (cliquable)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-sm" />
              <span className="text-[10px] text-muted-foreground/40">Week-end</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="text-[11px] text-muted-foreground/50 mt-5 leading-relaxed">
        Les données sont disponibles à partir de la première séance enregistrée
        dans le système. Les séances récentes peuvent être indisponibles si le
        pipeline ne s&apos;est pas encore exécuté.
      </p>
    </div>
  );
}
