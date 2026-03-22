"use client";

import useSWR from "swr";
import type { MarketSession } from "@/types/brvm";

// BRVM est ouverte lun–ven 08h00–15h00 UTC
function isMarketHours(): boolean {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcDay = now.getUTCDay(); // 0=dim, 6=sam
  return utcDay >= 1 && utcDay <= 5 && utcHour >= 8 && utcHour < 15;
}

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("live fetch failed");
    return r.json() as Promise<MarketSession>;
  });

export function useLiveData() {
  const inHours = isMarketHours();

  const { data, error, isLoading } = useSWR<MarketSession>(
    "/api/brvm",
    fetcher,
    {
      // Refresh toutes les 60s en séance, pas en dehors
      refreshInterval: inHours ? 60_000 : 0,
      revalidateOnFocus: inHours,
      dedupingInterval: 55_000,
    }
  );

  // Map symbol → {last_price, variation_pct} pour lookup O(1)
  const liveMap = new Map(
    (data?.stocks ?? []).map((s) => [
      s.symbol,
      {
        last_price: s.close,
        variation_pct: s.variation_pct,
      },
    ])
  );

  const lastUpdate =
    data?.session_date ? new Date(data.session_date + "T12:00:00Z") : null;

  return {
    liveData: data,
    liveMap,
    marketOpen: data != null && inHours,
    isLoading,
    isError: !!error,
    lastUpdate,
  };
}
