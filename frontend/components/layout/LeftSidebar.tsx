"use client";

import {
  LayoutDashboard,
  BarChart2,
  TrendingUp,
  Clock,
  Bell,
  Settings,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const NAV = [
  { icon: LayoutDashboard, label: "Tableau de bord", active: true },
  { icon: BarChart2,       label: "Marchés" },
  { icon: TrendingUp,      label: "Tendances" },
  { icon: Clock,           label: "Historique" },
  { icon: Bell,            label: "Alertes" },
];

export function LeftSidebar() {
  return (
    <Sidebar collapsible="icon" variant="sidebar">
      {/* Logo */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2 px-1 py-1">
              <div
                className="w-7 h-7 rounded flex items-center justify-center font-bold text-[13px] text-black shrink-0"
                style={{
                  background:
                    "linear-gradient(135deg, #C9A84C 0%, #E8C96A 50%, #A87A28 100%)",
                }}
              >
                B
              </div>
              <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                <span className="font-semibold text-sm leading-none">
                  BRVM
                </span>
                <span className="text-xs text-muted-foreground leading-none mt-0.5">
                  Analyzer
                </span>
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Nav */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map(({ icon: Icon, label, active }) => (
                <SidebarMenuItem key={label}>
                  <SidebarMenuButton
                    isActive={active}
                    tooltip={label}
                    className={
                      active
                        ? "text-[#C9A84C]"
                        : ""
                    }
                  >
                    <Icon />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Paramètres">
              <Settings />
              <span>Paramètres</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
