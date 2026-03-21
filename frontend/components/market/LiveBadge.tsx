"use client";

import { useLiveData } from "@/hooks/useLiveData";

export function LiveBadge() {
  const { marketOpen, lastUpdate, isError } = useLiveData();

  if (isError || !lastUpdate) return null;

  const timeStr = lastUpdate.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
      {marketOpen ? (
        <>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-emerald-400 font-semibold">LIVE</span>
        </>
      ) : (
        <>
          <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
          <span>Clôturé</span>
        </>
      )}
      · mis à jour {timeStr}
    </span>
  );
}
