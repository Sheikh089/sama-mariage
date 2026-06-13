import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Check, Crown, Sparkles, ArrowLeft, Lock } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const searchSchema = z.object({
  event: z.string().optional(),
  from: z.string().optional(),
}).optional();

export const Route = createFileRoute("/_authenticated/upgrade")({
  head: () => ({ meta: [{ title: "Mise à niveau — Sama Mariage" }] }),
  validateSearch: (s) => searchSchema.parse(s) ?? {},
  component: UpgradePage,
});

type Plan = "essai" | "pro" | "premium";

const PLANS: Array<{
  id: Plan;
  name: string;
  price: string;
  period: string;
  highlight?: boolean;
  features: string[];
}> = [
  {
    id: "essai",
    name: "Essai",
    price: "Gratuit",
    period: "",
    features: ["1 événement", "30 invités max", "Modèles de base", "Scanner basique"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "9 900 FCFA",
    period: "/ mois",
    highlight: true,
    features: [
      "5 événements",
      "Jusqu'à 300 invités / événement",
      "Équipe scanner (PIN + rôles)",
      "Envois WhatsApp / Email illimités",
      "Support prioritaire",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: "24 900 FCFA",
    period: "/ mois",
    features: [
      "Événements illimités",
      "Jusqu'à 2 000 invités / événement",
      "Modèles premium exclusifs",
      "Back-office admin avancé",
      "Accompagnement dédié",
    ],
  },
];

function nextPlan(current: Plan): Plan {
  if (current === "essai") return "pro";
  return "premium";
}

function UpgradePage() {
  const search = Route.useSearch() as { event?: string; from?: string };

  const { data: status } = useQuery({
    queryKey: ["event_plan_status", search.event ?? "none"],
    queryFn: async () => {
      if (!search.event) return null;
      const { data, error } = await supabase.rpc("event_plan_status", { _event_id: search.event });
      if (error) throw error;
      return data as { plan: Plan; locked: boolean; guests_count: number; limits: any } | null;
    },
    enabled: !!search.event,
  });

  const { data: sub } = useQuery({
    queryKey: ["my_subscription"],
    queryFn: async () => {
      const { data } = await supabase.from("subscriptions").select("plan").maybeSingle();
      return (data?.plan as Plan | undefined) ?? "essai";
    },
  });

  const currentPlan: Plan = (status?.plan ?? sub ?? "essai") as Plan;
  const recommended: Plan = currentPlan === "premium" ? "premium" : nextPlan(currentPlan);
  const locked = !!status?.locked;

  const handleSubscribe = (plan: Plan) => {
    toast.message("Paiement bientôt disponible", {
      description: `Le plan ${plan.toUpperCase()} sera activable directement ici dès l'ouverture des paiements. En attendant, contactez-nous pour activer votre abonnement.`,
    });
  };

  const backHref = search.event ? `/events/${search.event}` : "/events";

  return (
    <div className="mx-auto max-w-5xl p-6 md:p-10">
      <Link to={backHref as any} className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Retour
      </Link>

      <div className="text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-medium text-gold">
          <Crown className="h-3.5 w-3.5" /> Mise à niveau
        </div>
        <h1 className="mt-4 font-display text-4xl font-semibold md:text-5xl">Choisissez votre palier</h1>
        <p className="mt-3 text-muted-foreground">
          Palier actuel : <strong className="text-foreground">{currentPlan.toUpperCase()}</strong>
          {search.event ? ` · événement lié` : ""}
        </p>
      </div>

      {locked && (
        <div className="mx-auto mt-6 flex max-w-2xl items-start gap-3 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">
          <Lock className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <div className="font-semibold">Événement verrouillé</div>
            <div className="opacity-90">
              Vous avez atteint la limite du palier {currentPlan.toUpperCase()} ({status?.guests_count} invités).
              Passez au palier <strong>{recommended.toUpperCase()}</strong> pour réactiver la validation et continuer à ajouter des invités.
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {PLANS.map((p) => {
          const isCurrent = p.id === currentPlan;
          const isRecommended = p.id === recommended && p.id !== currentPlan;
          return (
            <div
              key={p.id}
              className={`relative flex flex-col rounded-2xl border bg-card p-6 transition ${
                isRecommended
                  ? "border-gold ring-2 ring-gold/30 shadow-lg shadow-gold/10"
                  : "border-border"
              }`}
            >
              {isRecommended && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-gold px-3 py-1 text-xs font-semibold text-primary-foreground">
                  Recommandé
                </span>
              )}
              <div className="flex items-center gap-2">
                {p.id === "premium" ? <Crown className="h-5 w-5 text-gold" /> : <Sparkles className="h-5 w-5 text-gold" />}
                <h3 className="font-display text-2xl font-semibold">{p.name}</h3>
              </div>
              <div className="mt-3">
                <span className="font-display text-3xl font-semibold">{p.price}</span>
                <span className="ml-1 text-sm text-muted-foreground">{p.period}</span>
              </div>
              <ul className="mt-5 flex-1 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                className={`mt-6 ${isRecommended ? "bg-gradient-gold text-primary-foreground" : ""}`}
                variant={isRecommended ? "default" : "outline"}
                disabled={isCurrent}
                onClick={() => handleSubscribe(p.id)}
              >
                {isCurrent ? "Palier actuel" : `Passer au plan ${p.name}`}
              </Button>
            </div>
          );
        })}
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Les paiements en ligne arrivent très bientôt. Pour activer immédiatement un palier, contactez le support.
      </p>
    </div>
  );
}
