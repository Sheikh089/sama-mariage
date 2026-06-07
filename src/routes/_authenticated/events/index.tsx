import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Calendar } from "lucide-react";

export const Route = createFileRoute("/_authenticated/events/")({
  head: () => ({ meta: [{ title: "Événements — Sama Mariage" }] }),
  component: EventsList,
});

function EventsList() {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="p-6 md:p-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl font-semibold">Événements</h1>
          <p className="mt-2 text-muted-foreground">Gérez tous vos événements.</p>
        </div>
        <Button asChild className="bg-gradient-gold text-primary-foreground">
          <Link to="/events/new">
            <Plus className="mr-2 h-4 w-4" /> Créer
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Chargement…</p>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gold/40 bg-gold/5 p-12 text-center">
          <Calendar className="mx-auto h-10 w-10 text-gold" />
          <h2 className="mt-4 font-display text-2xl font-semibold">Aucun événement</h2>
          <p className="mt-2 text-sm text-muted-foreground">Créez votre premier événement.</p>
          <Button asChild className="mt-4 bg-gradient-gold text-primary-foreground">
            <Link to="/events/new">Créer un événement</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => (
            <Link
              key={e.id}
              to="/events/$id"
              params={{ id: e.id }}
              className="group overflow-hidden rounded-2xl border border-border bg-card transition hover:border-gold/60"
            >
              <div className="relative aspect-[16/9] bg-muted">
                {e.cover_image_url ? (
                  <img src={e.cover_image_url} alt={e.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gradient-gold/10">
                    <Calendar className="h-10 w-10 text-gold" />
                  </div>
                )}
                <span className="absolute right-3 top-3 rounded-full bg-background/90 px-2 py-0.5 text-xs">
                  {e.status}
                </span>
              </div>
              <div className="p-5">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">{e.type}</div>
                <div className="mt-1 font-display text-xl font-semibold">{e.title}</div>
                <div className="mt-2 text-sm text-muted-foreground">
                  {e.event_date ? new Date(e.event_date).toLocaleDateString("fr-FR", { dateStyle: "long" }) : "Date à définir"}
                </div>
                {e.location && <div className="mt-1 text-xs text-muted-foreground">📍 {e.location}</div>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
