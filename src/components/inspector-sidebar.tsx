import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ClipboardCheck, History, LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const items = [
  { title: "Dashboard", icon: LayoutDashboard, view: "overview" as const },
  { title: "Assigned inspections", icon: ClipboardCheck, view: "assignments" as const },
  { title: "Inspection history", icon: History, view: "history" as const },
];

export function InspectorSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const searchStr = useRouterState({ select: (s) => s.location.searchStr });
  const signOut = async () => { queryClient.clear(); await supabase.auth.signOut(); navigate({ to: "/auth", replace: true }); };
  return <Sidebar collapsible="icon">
    <SidebarHeader><div className="flex items-center gap-2 px-2 py-2"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground"><ShieldCheck className="h-4 w-4" /></div>{!collapsed && <div><div className="text-sm font-semibold text-sidebar-foreground">NIRIKSHA</div><div className="text-[10px] text-sidebar-foreground/60">Inspector Workspace</div></div>}</div></SidebarHeader>
    <SidebarContent><SidebarGroup><SidebarGroupLabel>Field operations</SidebarGroupLabel><SidebarGroupContent><SidebarMenu>{items.map((item) => <SidebarMenuItem key={item.title}><SidebarMenuButton asChild isActive={pathname === "/inspector" && (new URLSearchParams(searchStr).get("view") ?? "overview") === item.view}><Link to="/inspector" search={{ view: item.view }} className="flex items-center gap-2"><item.icon className="h-4 w-4" />{!collapsed && <span>{item.title}</span>}</Link></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></SidebarGroupContent></SidebarGroup></SidebarContent>
    <SidebarFooter><SidebarMenu><SidebarMenuItem><SidebarMenuButton onClick={signOut}><LogOut className="h-4 w-4" />{!collapsed && <span>Sign out</span>}</SidebarMenuButton></SidebarMenuItem></SidebarMenu></SidebarFooter>
  </Sidebar>;
}
