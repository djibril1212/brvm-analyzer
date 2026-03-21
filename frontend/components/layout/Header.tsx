import { Separator } from "@/components/ui/separator";
import { LiveBadge } from "@/components/market/LiveBadge";

export function Header() {
  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Logo + brand */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Gold "B" square */}
          <div
            className="w-7 h-7 rounded flex items-center justify-center shrink-0 font-bold text-sm text-black select-none"
            style={{ background: "linear-gradient(135deg, #C9A84C 0%, #E8C96A 50%, #A87A28 100%)" }}
          >
            B
          </div>

          {/* Brand */}
          <div className="flex flex-col leading-none">
            <span className="font-medium text-[14px] tracking-tight text-foreground">
              BRVM Analyzer
            </span>
            <span className="text-[11px] text-muted-foreground font-mono hidden sm:block">
              Marché UEMOA · 47 actions
            </span>
          </div>

          <Separator orientation="vertical" className="h-5 hidden md:block mx-1" />

          {/* Date badge — hidden on mobile */}
          <span className="hidden md:inline-flex items-center border border-gold/30 text-gold text-[11px] font-mono px-2 py-0.5 rounded-full">
            BRVM
          </span>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <LiveBadge />
        </div>
      </div>
    </header>
  );
}
