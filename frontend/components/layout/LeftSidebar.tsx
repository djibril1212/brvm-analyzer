"use client";

import {
  LayoutDashboard,
  BarChart2,
  TrendingUp,
  Clock,
  Bell,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const NAV = [
  { icon: LayoutDashboard, label: "Tableau de bord", active: true },
  { icon: BarChart2,       label: "Marchés" },
  { icon: TrendingUp,      label: "Tendances" },
  { icon: Clock,           label: "Historique" },
  { icon: Bell,            label: "Alertes" },
];

export function LeftSidebar() {
  return (
    <aside
      className="hidden xl:flex flex-col fixed left-0 top-0 bottom-0 w-12 z-50 items-center py-3 gap-1"
      style={{
        background: "#0D1226",
        borderRight: "0.5px solid rgba(255,255,255,0.07)",
      }}
    >
      {/* Gold "B" logo */}
      <div
        className="w-7 h-7 rounded flex items-center justify-center font-bold text-[13px] text-black shrink-0 mb-3"
        style={{
          background:
            "linear-gradient(135deg, #C9A84C 0%, #E8C96A 50%, #A87A28 100%)",
        }}
      >
        B
      </div>

      {/* Nav icons */}
      <nav className="flex flex-col gap-1 flex-1 w-full items-center">
        {NAV.map(({ icon: Icon, label, active }) => (
          <Button
            key={label}
            variant="ghost"
            size="icon"
            title={label}
            className={
              active
                ? "text-[#C9A84C] bg-[#C9A84C]/10 hover:bg-[#C9A84C]/15 hover:text-[#C9A84C]"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            }
          >
            <Icon className="h-4 w-4" />
          </Button>
        ))}
      </nav>

      {/* Settings pinned at bottom */}
      <Button
        variant="ghost"
        size="icon"
        title="Paramètres"
        className="text-muted-foreground hover:text-foreground hover:bg-white/5"
      >
        <Settings className="h-4 w-4" />
      </Button>
    </aside>
  );
}
