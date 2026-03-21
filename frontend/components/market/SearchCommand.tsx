"use client";

import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { formatVariation, variationColor } from "@/lib/format";
import { useLiveData } from "@/hooks/useLiveData";
import type { StockQuote } from "@/types/brvm";

interface SearchCommandProps {
  stocks: StockQuote[];
}

export function SearchCommand({ stocks }: SearchCommandProps) {
  const [open, setOpen] = useState(false);
  const { liveMap } = useLiveData();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-card/50 text-muted-foreground hover:border-ring hover:text-foreground transition-colors text-xs w-44 sm:w-56"
      >
        <Search className="h-3 w-3 shrink-0" />
        <span className="flex-1 text-left">Rechercher...</span>
        <kbd className="text-[10px] font-mono bg-muted px-1 py-0.5 rounded border border-border">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Chercher une action BRVM..." />
        <CommandList>
          <CommandEmpty>Aucune valeur trouvée.</CommandEmpty>
          <CommandGroup heading={`${stocks.length} valeurs cotées`}>
            {stocks.map((stock) => {
              const live = liveMap.get(stock.symbol);
              const price = live?.last_price ?? stock.close;
              const variation = live?.variation_pct ?? stock.variation_pct;
              return (
                <CommandItem
                  key={stock.symbol}
                  value={`${stock.symbol} ${stock.name}`}
                  onSelect={() => setOpen(false)}
                  className="flex items-center gap-3"
                >
                  <span className="font-mono font-bold text-[13px] w-14 shrink-0 text-gold">
                    {stock.symbol}
                  </span>
                  <span className="text-xs text-muted-foreground flex-1 truncate">
                    {stock.name}
                  </span>
                  <span className="font-mono text-xs tabular-nums text-foreground shrink-0">
                    {price.toLocaleString("fr-FR")}
                  </span>
                  <span
                    className={`font-mono text-xs tabular-nums shrink-0 ${variationColor(variation)}`}
                  >
                    {formatVariation(variation)}
                  </span>
                  {live?.last_price && (
                    <span className="h-1.5 w-1.5 rounded-full bg-up shrink-0" />
                  )}
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
