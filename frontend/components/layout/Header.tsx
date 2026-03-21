import { Separator } from "@/components/ui/separator";
import { LiveBadge } from "@/components/market/LiveBadge";

export function Header() {
  return (
    <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="font-semibold tracking-tight text-foreground">
            BRVM <span className="text-primary">Analyzer</span>
          </span>
          <Separator orientation="vertical" className="h-4 hidden sm:block" />
          <span className="text-xs text-muted-foreground font-mono hidden sm:block">
            Marché UEMOA · 47 actions
          </span>
        </div>

        {/* Market status — always visible */}
        <div className="flex items-center">
          <LiveBadge />
        </div>
      </div>
    </header>
  );
}
