import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { SupervisorSidebar } from "@/components/supervisor-sidebar";

export const Route = createFileRoute("/_authenticated/supervisor")({
  head: () => ({ meta: [{ title: "Supervisor Console — NIRIKSHA" }] }),
  component: SupervisorLayout,
});

function SupervisorLayout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <SupervisorSidebar />
        <div className="flex flex-1 flex-col">
          <header className="flex h-14 items-center gap-2 border-b border-border bg-card px-4">
            <SidebarTrigger />
            <div className="text-sm font-semibold text-foreground">Supervisor Console</div>
            <div className="ml-auto text-xs text-muted-foreground">NIRIKSHA v1.0</div>
          </header>
          <main className="flex-1 overflow-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
