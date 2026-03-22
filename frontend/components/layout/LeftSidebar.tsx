"use client";

import {
  LayoutDashboard,
  Building2,
  Layers,
  Bell,
  Settings,
  LogIn,
  MessageSquare,
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
  { icon: Building2,       label: "Sociétés" },
  { icon: Layers,          label: "Secteurs" },
  { icon: Bell,            label: "Alertes" },
];

export function LeftSidebar() {
  return (
    <Sidebar collapsible="icon" variant="sidebar">
      {/* Logo */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2.5 px-1 py-1">
              {/* Doli-style circle logo */}
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-bold text-[13px] text-white"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(41 60% 38%) 100%)",
                }}
              >
                B
              </div>
              <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                <span className="font-display font-bold text-sm leading-none text-foreground tracking-tight">
                  BRVM
                </span>
                <span className="text-[11px] text-muted-foreground leading-none mt-0.5 tracking-wide uppercase">
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
                    className={active ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"}
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
            <SidebarMenuButton tooltip="Avis" className="text-muted-foreground hover:text-foreground">
              <MessageSquare />
              <span>Avis</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Paramètres" className="text-muted-foreground hover:text-foreground">
              <Settings />
              <span>Paramètres</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Se connecter" className="text-muted-foreground hover:text-foreground">
              <LogIn />
              <span>Se connecter</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
