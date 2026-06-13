import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Lock, Sparkles } from "lucide-react";

const PLAN_LABEL: Record<string, string> = { essai: "Essai", pro: "Pro", premium: "Premium" };

export function PlanLockBanner({ eventId, sessionToken }: { eventId: string; sessionToken?: string }) {
  const { data } = useQuery({
    queryKey: ["event_plan_status", eventId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("event_plan_status", { _event_id: eventId });
      if (error) throw error;
      return data as any;
    },
    refetchInterval: 30_000,
    enabled: !!eventId,
  });

  if (!data) return null;
  const limits = data.limits ?? {};
  const maxGuests = limits.max_guests_per_event;
  const maxEvents = limits.max_events;
  const usagePct = maxGuests > 0 ? Math.min(100, Math.round((data.guests_count / maxGuests) * 100)) : 0;
  const near = !data.locked && maxGuests > 0 && usagePct >= 80;

  if (!data.locked && !near) return null;

  return (
    <div
      className={`mb-4 flex items-start gap-3 rounded-xl border p-4 ${
        data.locked
          ? "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300"
          : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
      }`}
    >
      {data.locked ? <Lock className="mt-0.5 h-5 w-5 shrink-0" /> : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />}
      <div className="flex-1 text-sm">
        <div className="font-semibold">
          {data.locked
            ? `Palier ${PLAN_LABEL[data.plan] ?? data.plan} dépassé — scanner et ajouts bloqués`
            : `Bientôt à la limite du palier ${PLAN_LABEL[data.plan] ?? data.plan}`}
        </div>
        <div className="mt-1 opacity-90">
          {data.guests_count} / {maxGuests === -1 ? "∞" : maxGuests} invités
          {maxEvents !== -1 && ` · ${data.events_count} / ${maxEvents} événements`}
          {data.over_guests && " · trop d'invités"}
          {data.over_events && " · trop d'événements"}
        </div>
        {data.locked && (
          <div className="mt-2 inline-flex items-center gap-1 text-xs font-medium">
            <Sparkles className="h-3 w-3" /> Mettez à niveau l'abonnement pour réactiver la validation.
          </div>
        )}
      </div>
    </div>
  );
}
