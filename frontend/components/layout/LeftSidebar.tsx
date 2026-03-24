"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Building2,
  Layers,
  CalendarDays,
  Briefcase,
  FlaskConical,
  Settings,
  MessageSquare,
  LogOut,
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
  { icon: LayoutDashboard, label: "Tableau de bord", href: "/" },
  { icon: Building2,       label: "Sociétés",        href: "/stocks" },
  { icon: Layers,          label: "Secteurs",         href: "/sectors" },
  { icon: CalendarDays,    label: "Historique",       href: "/history" },
  { icon: Briefcase,       label: "Portefeuille",     href: "/portfolio" },
  { icon: FlaskConical,    label: "Pipeline",         href: "/admin/pipeline" },
];

export function LeftSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      {/* Logo */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href="/" className="flex items-center gap-2.5 px-1 py-1">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-bold text-[13px] text-white"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(38 70% 36%) 100%)",
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
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Nav */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map(({ icon: Icon, label, href }) => {
                const active =
                  href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(href);
                return (
                  <SidebarMenuItem key={label}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={label}
                      className={
                        active
                          ? "text-primary font-medium"
                          : "text-muted-foreground hover:text-foreground"
                      }
                    >
                      <Link href={href}>
                        <Icon />
                        <span>{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Avis"
              className="text-muted-foreground hover:text-foreground"
            >
              <MessageSquare />
              <span>Avis</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Paramètres"
              className="text-muted-foreground hover:text-foreground"
            >
              <Settings />
              <span>Paramètres</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Déconnexion"
              className="text-muted-foreground hover:text-destructive"
              onClick={handleLogout}
            >
              <LogOut />
              <span>Déconnexion</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
