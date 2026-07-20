import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin-sidebar";
import { requireAdminRole } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin Console — NIRIKSHA" }] }),
  beforeLoad: async () => {
    console.log("[ADMIN beforeLoad] ✦ entered — calling requireAdminRole()");
    try {
      const result = await requireAdminRole();
      console.log("[ADMIN beforeLoad] ✔ requireAdminRole succeeded:", result);
    } catch (err: any) {
      // Capture every detail before swallowing the error
      console.error("[ADMIN beforeLoad] ✘ requireAdminRole threw:", err);
      console.error("[ADMIN beforeLoad]   message :", err?.message ?? "(no message)");
      console.error("[ADMIN beforeLoad]   status  :", err?.status ?? err?.statusCode ?? "(none)");
      console.error("[ADMIN beforeLoad]   data    :", JSON.stringify(err?.data ?? err?.body ?? null));
      console.error("[ADMIN beforeLoad]   stack   :", err?.stack ?? "(no stack)");
      console.error("[ADMIN beforeLoad] → redirecting to /auth");
      throw redirect({ to: "/auth" });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AdminSidebar />
        <div className="flex flex-1 flex-col">
          <header className="flex h-14 items-center gap-2 border-b border-border bg-card px-4">
            <SidebarTrigger />
            <div className="text-sm font-semibold text-foreground">Administrator Console</div>
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