import { createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { InvitationCard, type InvitationData } from "@/components/InvitationCard";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";
import { Check, X, Plus, Minus } from "lucide-react";

export const Route = createFileRoute("/i/$token")({
  ssr: false,
  head: () => ({ meta: [{ title: "Votre invitation — Sama Mariage" }] }),
  component: PublicInvitation,
  errorComponent: ({ error }) => (
    <div className="grid min-h-screen place-items-center bg-black p-6 text-amber-50">
      <div className="text-center">
        <p className="font-display text-2xl">Invitation introuvable</p>
        <p className="mt-2 text-sm opacity-70">{error.message}</p>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="grid min-h-screen place-items-center bg-black p-6 text-amber-50">
      <p className="font-display text-2xl">Invitation introuvable</p>
    </div>
  ),
});

function PublicInvitation() {
  const { token } = Route.useParams();
  const [companions, setCompanions] = useState<number | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["invitation", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_invitation_by_token", { _token: token });
      if (error) throw error;
      if (!data || data.length === 0) throw notFound();
      return data[0];
    },
  });

  const submitMut = useMutation({
    mutationFn: async (status: "confirme" | "refuse") => {
      const { error } = await supabase.rpc("submit_rsvp", {
        _token: token,
        _status: status,
        _companions: companions ?? data?.companions ?? 0,
      });
      if (error) throw error;
    },
    onSuccess: (_, status) => {
      toast.success(status === "confirme" ? "Merci, votre présence est confirmée 🎉" : "Réponse enregistrée");
      refetch();
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading || !data) {
    return <div className="grid min-h-screen place-items-center bg-black text-amber-50">Chargement…</div>;
  }

  const inviteUrl = typeof window !== "undefined" ? window.location.href : "";
  const cardData: InvitationData = {
    guestName: data.full_name,
    eventTitle: data.event_title,
    eventType: data.event_type,
    eventDate: data.event_date,
    eventLocation: data.event_location,
    eventDescription: data.event_description,
    customMessage: data.event_custom_message,
    coverImageUrl: data.event_cover_image_url,
    template: data.event_template,
    inviteUrl,
  };
  const currentCompanions = companions ?? data.companions ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-stone-900 to-black p-4 py-10">
      <div className="mx-auto max-w-md">
        <InvitationCard data={cardData} />

        <div className="mt-6 rounded-2xl border border-amber-400/30 bg-black/50 p-6 text-amber-50 backdrop-blur">
          <h2 className="font-display text-center text-xl">Confirmez votre présence</h2>

          <div className="mt-4 flex items-center justify-between rounded-xl bg-white/5 p-3">
            <span className="text-sm">Accompagnants</span>
            <div className="flex items-center gap-3">
              <Button size="icon" variant="outline" className="h-8 w-8 bg-transparent border-amber-400/40 text-amber-200" onClick={() => setCompanions(Math.max(0, currentCompanions - 1))}>
                <Minus className="h-3 w-3" />
              </Button>
              <span className="w-6 text-center font-semibold">{currentCompanions}</span>
              <Button size="icon" variant="outline" className="h-8 w-8 bg-transparent border-amber-400/40 text-amber-200" onClick={() => setCompanions(currentCompanions + 1)}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Button
              disabled={submitMut.isPending}
              onClick={() => submitMut.mutate("confirme")}
              className="bg-gradient-to-r from-amber-500 to-amber-300 text-black hover:opacity-90"
            >
              <Check className="mr-1 h-4 w-4" /> Je viens
            </Button>
            <Button
              disabled={submitMut.isPending}
              variant="outline"
              onClick={() => submitMut.mutate("refuse")}
              className="border-amber-400/40 bg-transparent text-amber-100 hover:bg-white/5"
            >
              <X className="mr-1 h-4 w-4" /> Empêché
            </Button>
          </div>

          {data.rsvp_status !== "en_attente" && (
            <p className="mt-4 text-center text-xs text-amber-200/70">
              Statut actuel : <span className="font-semibold">{data.rsvp_status === "confirme" ? "Confirmé ✓" : "Refusé"}</span>
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-amber-50/40">
          Sama Mariage — Invitation digitale
        </p>
      </div>
    </div>
  );
}
