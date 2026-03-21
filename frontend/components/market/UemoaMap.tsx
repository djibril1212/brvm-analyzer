import { Card, CardContent } from "@/components/ui/card";
import { formatVariation, variationColor } from "@/lib/format";
import type { MarketSession } from "@/types/brvm";

interface UemoaMapProps {
  session: MarketSession;
}

// Approximate normalized positions (% of container) for UEMOA countries
const COUNTRIES = [
  { code: "GW", name: "Guinée-Bissau", cx: "10%", cy: "50%" },
  { code: "SN", name: "Sénégal",        cx: "14%", cy: "34%" },
  { code: "ML", name: "Mali",            cx: "40%", cy: "22%" },
  { code: "BF", name: "Burkina Faso",   cx: "56%", cy: "46%" },
  { code: "NE", name: "Niger",           cx: "70%", cy: "26%" },
  { code: "CI", name: "Côte d'Ivoire",  cx: "28%", cy: "66%" },
  { code: "TG", name: "Togo",            cx: "63%", cy: "63%" },
  { code: "BJ", name: "Bénin",           cx: "70%", cy: "60%" },
];

export function UemoaMap({ session }: UemoaMapProps) {
  const up = session.composite.variation_pct >= 0;
  const dotColor = up ? "#22C55E" : "#EF4444";

  return (
    <Card
      className="rounded-xl bg-[#0D1226] border-white/[0.07] flex flex-col"
      style={{ minHeight: 200 }}
    >
    <CardContent className="p-4 flex flex-col h-full gap-0">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
            Zone UEMOA
          </p>
          <p className="text-[14px] font-medium text-foreground mt-0.5">
            8 pays membres
          </p>
        </div>
        <div className="text-right">
          <p
            className={`text-[18px] font-semibold font-mono leading-tight ${variationColor(
              session.composite.variation_pct
            )}`}
          >
            {formatVariation(session.composite.variation_pct)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            BRVM Composite
          </p>
        </div>
      </div>

      {/* Dot map */}
      <div
        className="relative flex-1 rounded-lg overflow-hidden"
        style={{
          minHeight: 130,
          background:
            "radial-gradient(ellipse at 40% 55%, rgba(201,168,76,0.04) 0%, transparent 70%)",
        }}
      >
        {/* Grid dots background */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />

        {/* Country dots */}
        {COUNTRIES.map((c) => (
          <div
            key={c.code}
            className="absolute flex flex-col items-center gap-0.5"
            style={{
              left: c.cx,
              top: c.cy,
              transform: "translate(-50%, -50%)",
            }}
          >
            <div
              className="h-2 w-2 rounded-full"
              style={{ background: dotColor, opacity: 0.85 }}
            />
            <span
              className="text-[7px] font-mono leading-none whitespace-nowrap"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              {c.code}
            </span>
          </div>
        ))}

        {/* BRVM label centered */}
        <div className="absolute inset-0 flex items-end justify-center pb-2 pointer-events-none">
          <span
            className="text-[9px] font-mono uppercase tracking-[0.2em]"
            style={{ color: "rgba(201,168,76,0.25)" }}
          >
            BRVM
          </span>
        </div>
      </div>

      {/* Legend */}
      <div
        className="flex items-center gap-4 mt-3 pt-2"
        style={{ borderTop: "0.5px solid rgba(255,255,255,0.06)" }}
      >
        <span className="text-[10px] text-muted-foreground flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-up inline-block" />
          {session.advancing} hausse{session.advancing !== 1 ? "s" : ""}
        </span>
        <span className="text-[10px] text-muted-foreground flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-down inline-block" />
          {session.declining} baisse{session.declining !== 1 ? "s" : ""}
        </span>
        <span className="text-[10px] text-muted-foreground ml-auto">
          {session.unchanged} stables
        </span>
      </div>
    </CardContent>
    </Card>
  );
}
