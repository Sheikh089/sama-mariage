import { createFileRoute } from "@tanstack/react-router";
import { Users, Send, CheckCircle2, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Tableau de bord — Sama Mariage" }] }),
  component: Dashboard,
});

const stats = [
  { icon: Users, label: "Total invités", value: "0", color: "text-gold" },
  { icon: Send, label: "Invitations envoyées", value: "0", color: "text-blue-500" },
  { icon: CheckCircle2, label: "Confirmées", value: "0", color: "text-green-600" },
  { icon: Clock, label: "En attente", value: "0", color: "text-amber-500" },
];

function Dashboard() {
  const { user } = Route.useRouteContext();
  return (
    <div className="p-6 md:p-10">
      <div className="mb-8">
        <h1 className="font-display text-4xl font-semibold">
          Bienvenue <span className="text-gradient-gold italic">{user.email?.split("@")[0]}</span>
        </h1>
        <p className="mt-2 text-muted-foreground">
          Votre espace pour gérer vos invitations de mariage.
        </p>
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

      <div className="mt-10 rounded-2xl border border-dashed border-gold/40 bg-gold/5 p-10 text-center">
        <h2 className="font-display text-2xl font-semibold">Créez votre premier événement</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          La gestion d'événements et d'invités arrive dans la prochaine phase. ✨
        </p>
      </div>
    </div>
  );
}
