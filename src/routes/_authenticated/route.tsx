import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { LogoWithText } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard, Calendar, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthLayout,
});

function AuthLayout() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Déconnecté");
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 flex-shrink-0 border-r border-border bg-card md:flex md:flex-col">
        <div className="border-b border-border p-6">
          <LogoWithText />
        </div>
        <nav className="flex-1 space-y-1 p-4">
          <Link
            to="/dashboard"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
            activeProps={{ className: "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium bg-gradient-gold text-primary-foreground" }}
          >
            <LayoutDashboard className="h-4 w-4" />
            Tableau de bord
          </Link>
          <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            Événements <span className="ml-auto text-[10px]">bientôt</span>
          </div>
          <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            Invités <span className="ml-auto text-[10px]">bientôt</span>
          </div>
        </nav>
        <div className="border-t border-border p-4">
          <div className="mb-3 truncate text-xs text-muted-foreground">{user.email}</div>
          <Button variant="outline" size="sm" className="w-full" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" /> Déconnexion
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <header className="flex items-center justify-between border-b border-border bg-card/50 px-6 py-4 md:hidden">
          <LogoWithText />
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
