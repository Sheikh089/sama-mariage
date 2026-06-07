import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type EventType = Database["public"]["Enums"]["event_type"];

export const Route = createFileRoute("/_authenticated/events/new")({
  head: () => ({ meta: [{ title: "Nouvel événement — Sama Mariage" }] }),
  component: NewEvent,
});

function NewEvent() {
  const navigate = useNavigate();
  const { user } = Route.useRouteContext();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    type: "mariage" as EventType,
    event_date: "",
    location: "",
    description: "",
    max_guests: 50,
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase
      .from("events")
      .insert({
        user_id: user.id,
        title: form.title,
        type: form.type,
        event_date: form.event_date || null,
        location: form.location || null,
        description: form.description || null,
        max_guests: form.max_guests,
      })
      .select("id")
      .single();
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Événement créé");
    navigate({ to: "/events/$id", params: { id: data!.id } });
  };

  return (
    <div className="p-6 md:p-10">
      <Link to="/events" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Retour
      </Link>
      <h1 className="font-display text-4xl font-semibold">Nouvel événement</h1>
      <p className="mt-2 text-muted-foreground">Créez votre événement en quelques secondes.</p>

      <form onSubmit={submit} className="mt-8 max-w-2xl space-y-5 rounded-2xl border border-border bg-card p-6">
        <div>
          <Label htmlFor="title">Titre *</Label>
          <Input id="title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Mariage de Awa & Moussa" />
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as EventType })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mariage">Mariage</SelectItem>
                <SelectItem value="bapteme">Baptême</SelectItem>
                <SelectItem value="fiancailles">Fiançailles</SelectItem>
                <SelectItem value="anniversaire">Anniversaire</SelectItem>
                <SelectItem value="autre">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="date">Date & heure</Label>
            <Input id="date" type="datetime-local" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
          </div>
        </div>
        <div>
          <Label htmlFor="loc">Lieu</Label>
          <Input id="loc" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Dakar, Sénégal" />
        </div>
        <div>
          <Label htmlFor="desc">Description</Label>
          <Textarea id="desc" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Quelques mots sur votre événement…" />
        </div>
        <div>
          <Label htmlFor="max">Nombre max d'invités</Label>
          <Input id="max" type="number" min={1} value={form.max_guests} onChange={(e) => setForm({ ...form, max_guests: parseInt(e.target.value) || 50 })} />
        </div>
        <Button type="submit" disabled={loading} className="w-full bg-gradient-gold text-primary-foreground">
          {loading ? "Création…" : "Créer l'événement"}
        </Button>
      </form>
    </div>
  );
}
