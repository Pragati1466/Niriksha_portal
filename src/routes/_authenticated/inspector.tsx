import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { InspectorSidebar } from "@/components/inspector-sidebar";
import { requireInspectorRole } from "@/lib/inspector.functions";

export const Route = createFileRoute("/_authenticated/inspector")({
  // Authentication is handled by the parent route. Preserve role-check errors
  // here so an incorrect role is visible instead of creating an auth redirect loop.
  beforeLoad: async () => requireInspectorRole(),
  component: () => <SidebarProvider><div className="flex min-h-screen w-full bg-background"><InspectorSidebar /><div className="flex flex-1 flex-col"><header className="flex h-14 items-center gap-2 border-b border-border bg-card px-4"><SidebarTrigger /><span className="text-sm font-semibold">Field Inspection Console</span><span className="ml-auto text-xs text-muted-foreground">NIRIKSHA v1.0</span></header><main className="flex-1 overflow-auto p-4 sm:p-6"><Outlet /></main></div></div></SidebarProvider>,
});
