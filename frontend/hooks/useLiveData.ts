"use client";

import useSWR from "swr";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface LiveQuote {
  ticker: string;
  last_price: number | null;
  variation_pct: number | null;
  open_price: number | null;
  prev_close: number | null;
  volume: number | null;
  status: string | null;
  scraped_at: string | null;
}

interface LiveData {
  market_open: boolean;
  quotes: LiveQuote[];
  count: number;
}

function isMarketHours(): boolean {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcDay = now.getUTCDay(); // 0=dim, 6=sam
  return utcDay >= 1 && utcDay <= 5 && utcHour >= 8 && utcHour < 15;
}

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("live fetch failed");
    return r.json();
  });

export function useLiveData() {
  const inHours = isMarketHours();

  const { data, error, isLoading } = useSWR<LiveData>(
    `${API_URL}/api/market/live`,
    fetcher,
    {
      // Rafraîchit toutes les 30s pendant la séance, arrête en dehors
      refreshInterval: inHours ? 30_000 : 0,
      revalidateOnFocus: inHours,
      dedupingInterval: 25_000,
    }
  );

  // Crée un Map ticker → quote pour lookup O(1)
  const liveMap = new Map<string, LiveQuote>(
    (data?.quotes ?? []).map((q) => [q.ticker, q])
  );

  return {
    liveData: data,
    liveMap,
    marketOpen: data?.market_open ?? false,
    isLoading,
    isError: !!error,
    lastUpdate:
      data?.quotes[0]?.scraped_at
        ? new Date(data.quotes[0].scraped_at)
        : null,
  };
}
