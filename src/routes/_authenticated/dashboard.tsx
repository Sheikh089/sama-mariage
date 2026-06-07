import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, Calendar, CheckCircle2, Clock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Tableau de bord — Sama Mariage" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = Route.useRouteContext();

  const { data: events = [] } = useQuery({
    queryKey: ["events", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, type, event_date, status")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: guestStats } = useQuery({
    queryKey: ["guests", "stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guests")
        .select("rsvp_status, companions, event_id");
      if (error) throw error;
      const total = data.length;
      const confirmed = data.filter((g) => g.rsvp_status === "confirme").length;
      const pending = data.filter((g) => g.rsvp_status === "en_attente").length;
      const heads = data.reduce(
        (acc, g) => acc + 1 + (g.rsvp_status === "confirme" ? g.companions : 0),
        0,
      );
      return { total, confirmed, pending, heads };
    },
  });

  const stats = [
    { icon: Calendar, label: "Événements", value: events.length, color: "text-gold" },
    { icon: Users, label: "Total invités", value: guestStats?.total ?? 0, color: "text-blue-500" },
    { icon: CheckCircle2, label: "Confirmés", value: guestStats?.confirmed ?? 0, color: "text-green-600" },
    { icon: Clock, label: "En attente", value: guestStats?.pending ?? 0, color: "text-amber-500" },
  ];

  return (
    <div className="p-6 md:p-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold">
            Bienvenue <span className="text-gradient-gold italic">{user.email?.split("@")[0]}</span>
          </h1>
          <p className="mt-2 text-muted-foreground">Votre espace pour gérer vos invitations.</p>
        </div>
        <Button asChild className="bg-gradient-gold text-primary-foreground">
          <Link to="/events/new">
            <Plus className="mr-2 h-4 w-4" /> Nouvel événement
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </div>
            <div className="mt-3 font-display text-4xl font-semibold">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold">Vos événements récents</h2>
          <Link to="/events" className="text-sm text-gold hover:underline">
            Tout voir →
          </Link>
        </div>
        {events.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gold/40 bg-gold/5 p-10 text-center">
            <h3 className="font-display text-xl font-semibold">Créez votre premier événement ✨</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Lancez vos invitations digitales en quelques minutes.
            </p>
            <Button asChild className="mt-4 bg-gradient-gold text-primary-foreground">
              <Link to="/events/new">Commencer</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {events.slice(0, 6).map((e) => (
              <Link
                key={e.id}
                to="/events/$id"
                params={{ id: e.id }}
                className="rounded-2xl border border-border bg-card p-5 transition hover:border-gold/60"
              >
                <div className="text-xs uppercase tracking-wide text-muted-foreground">{e.type}</div>
                <div className="mt-1 font-display text-xl font-semibold">{e.title}</div>
                <div className="mt-2 text-sm text-muted-foreground">
                  {e.event_date ? new Date(e.event_date).toLocaleDateString("fr-FR", { dateStyle: "long" }) : "Date à définir"}
                </div>
                <div className="mt-3 inline-flex rounded-full bg-gold/10 px-2 py-0.5 text-xs text-gold">
                  {e.status}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
