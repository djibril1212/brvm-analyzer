import { Separator } from "@/components/ui/separator";

export function Header({ sessionDate }: { sessionDate?: string }) {
  return (
    <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-semibold tracking-tight text-foreground">
            BRVM <span className="text-primary">Analyzer</span>
          </span>
          <Separator orientation="vertical" className="h-4" />
          <span className="text-xs text-muted-foreground font-mono">
            Marché UEMOA · 47 actions
          </span>
        </div>
        {sessionDate && (
          <span className="text-xs font-mono text-muted-foreground hidden sm:block">
            Séance du{" "}
            <span className="text-foreground">
              {new Date(sessionDate).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </span>
        )}
      </div>
    </header>
  );
}
