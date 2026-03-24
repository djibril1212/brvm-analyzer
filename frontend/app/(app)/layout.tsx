import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { LeftSidebar } from "@/components/layout/LeftSidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider defaultOpen={true}>
      <LeftSidebar />
      <SidebarInset className="min-h-screen flex flex-col overflow-x-hidden">
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
