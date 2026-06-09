import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { ArrowLeft, Plus, Upload, Trash2, ImagePlus, Users, CheckCircle2, Clock, XCircle, QrCode, Copy, Sparkles } from "lucide-react";
import Papa from "papaparse";
import { TEMPLATES, type Template } from "@/lib/invitation-templates";
import { InvitationCard } from "@/components/InvitationCard";
import { Textarea } from "@/components/ui/textarea";
import { SendInvitations } from "@/components/SendInvitations";
import { StaffManager } from "@/components/StaffManager";

export const Route = createFileRoute("/_authenticated/events/$id")({
  head: () => ({ meta: [{ title: "Événement — Sama Mariage" }] }),
  component: EventDetail,
});

function EventDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const csvRef = useRef<HTMLInputElement>(null);

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: guests = [], refetch: refetchGuests } = useQuery({
    queryKey: ["guests", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guests")
        .select("*")
        .eq("event_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const [guestForm, setGuestForm] = useState({ full_name: "", email: "", phone: "", companions: 0 });
  const [guestOpen, setGuestOpen] = useState(false);
  const [qrGuest, setQrGuest] = useState<typeof guests[number] | null>(null);
  const [customMessage, setCustomMessage] = useState<string | null>(null);

  const updateTemplate = async (tpl: Template) => {
    const { error } = await supabase.from("events").update({ template: tpl }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Modèle mis à jour");
    qc.invalidateQueries({ queryKey: ["event", id] });
  };

  const saveCustomMessage = async () => {
    const { error } = await supabase.from("events").update({ custom_message: customMessage }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Message enregistré");
    qc.invalidateQueries({ queryKey: ["event", id] });
  };

  const inviteUrlFor = (token: string) =>
    typeof window !== "undefined" ? `${window.location.origin}/i/${token}` : `/i/${token}`;

  const copyLink = async (token: string) => {
    await navigator.clipboard.writeText(inviteUrlFor(token));
    toast.success("Lien copié");
  };

  const addGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("guests").insert({
      event_id: id,
      full_name: guestForm.full_name,
      email: guestForm.email || null,
      phone: guestForm.phone || null,
      companions: guestForm.companions,
    });
    if (error) return toast.error(error.message);
    toast.success("Invité ajouté");
    setGuestForm({ full_name: "", email: "", phone: "", companions: 0 });
    setGuestOpen(false);
    refetchGuests();
  };

  const removeGuest = async (gid: string) => {
    const { error } = await supabase.from("guests").delete().eq("id", gid);
    if (error) return toast.error(error.message);
    toast.success("Invité supprimé");
    refetchGuests();
  };

  const togglePublish = async () => {
    if (!event) return;
    const newStatus = event.status === "publie" ? "brouillon" : "publie";
    const { error } = await supabase.from("events").update({ status: newStatus }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(newStatus === "publie" ? "Événement publié" : "Repassé en brouillon");
    qc.invalidateQueries({ queryKey: ["event", id] });
  };

  const deleteEvent = async () => {
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Événement supprimé");
    navigate({ to: "/events" });
  };

  const uploadCover = async (file: File) => {
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) return;
    const ext = file.name.split(".").pop();
    const path = `${u.id}/${id}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("event-covers").upload(path, file, { upsert: true });
    if (upErr) return toast.error(upErr.message);
    const { data: signed } = await supabase.storage.from("event-covers").createSignedUrl(path, 60 * 60 * 24 * 365);
    if (!signed) return toast.error("Impossible de générer l'URL");
    const { error } = await supabase.from("events").update({ cover_image_url: signed.signedUrl }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Photo de couverture mise à jour");
    qc.invalidateQueries({ queryKey: ["event", id] });
  };

  const importCsv = (file: File) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data
          .map((r) => {
            const name = r.full_name || r.nom || r.name || r.Nom || "";
            if (!name.trim()) return null;
            return {
              event_id: id,
              full_name: name.trim(),
              email: (r.email || r.Email || "").trim() || null,
              phone: (r.phone || r.telephone || r.Téléphone || "").trim() || null,
              companions: parseInt(r.companions || r.accompagnants || "0") || 0,
            };
          })
          .filter(Boolean) as any[];
        if (rows.length === 0) return toast.error("Aucun invité valide trouvé (colonne requise: full_name ou nom)");
        const { error } = await supabase.from("guests").insert(rows);
        if (error) return toast.error(error.message);
        toast.success(`${rows.length} invité(s) importé(s)`);
        refetchGuests();
      },
    });
  };

  if (isLoading || !event) return <div className="p-10 text-muted-foreground">Chargement…</div>;

  const confirmed = guests.filter((g) => g.rsvp_status === "confirme").length;
  const pending = guests.filter((g) => g.rsvp_status === "en_attente").length;
  const refused = guests.filter((g) => g.rsvp_status === "refuse").length;

  return (
    <div className="p-6 md:p-10">
      <Link to="/events" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Tous les événements
      </Link>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="relative aspect-[21/8] bg-muted">
          {event.cover_image_url ? (
            <img src={event.cover_image_url} alt={event.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-gold/10">
              <ImagePlus className="h-12 w-12 text-gold" />
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && uploadCover(e.target.files[0])}
          />
          <Button
            size="sm"
            variant="secondary"
            className="absolute bottom-3 right-3"
            onClick={() => fileRef.current?.click()}
          >
            <ImagePlus className="mr-2 h-4 w-4" /> Changer la photo
          </Button>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-4 p-6">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{event.type}</div>
            <h1 className="mt-1 font-display text-4xl font-semibold">{event.title}</h1>
            <div className="mt-2 text-sm text-muted-foreground">
              {event.event_date && new Date(event.event_date).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })}
              {event.location && <> · 📍 {event.location}</>}
            </div>
            {event.description && <p className="mt-3 max-w-2xl text-sm">{event.description}</p>}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={togglePublish}>
              {event.status === "publie" ? "Repasser en brouillon" : "Publier"}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer l'événement ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est définitive. Tous les invités liés seront supprimés.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteEvent}>Supprimer</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 grid gap-4 md:grid-cols-4">
        {[
          { icon: Users, label: "Invités", value: guests.length, color: "text-gold" },
          { icon: CheckCircle2, label: "Confirmés", value: confirmed, color: "text-green-600" },
          { icon: Clock, label: "En attente", value: pending, color: "text-amber-500" },
          { icon: XCircle, label: "Refusés", value: refused, color: "text-red-500" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </div>
            <div className="mt-2 font-display text-3xl font-semibold">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Template & invitation card */}
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_auto]">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-gold" />
            <h2 className="font-display text-2xl font-semibold">Modèle d'invitation</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Choisissez l'ambiance de votre carte.</p>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => updateTemplate(t.id)}
                className={`group overflow-hidden rounded-xl border-2 text-left transition ${
                  event.template === t.id ? "border-gold ring-2 ring-gold/30" : "border-border hover:border-gold/50"
                }`}
              >
                <div className="aspect-[3/4]" style={{ background: t.preview }} />
                <div className="p-2">
                  <div className="text-xs font-semibold">{t.name}</div>
                  <div className="text-[10px] text-muted-foreground">{t.description}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6">
            <Label>Message personnalisé (optionnel)</Label>
            <Textarea
              rows={2}
              placeholder="Un mot pour vos invités…"
              value={customMessage ?? event.custom_message ?? ""}
              onChange={(e) => setCustomMessage(e.target.value)}
            />
            <Button size="sm" variant="outline" className="mt-2" onClick={saveCustomMessage}>
              Enregistrer le message
            </Button>
          </div>
        </div>

        <div className="lg:w-[380px]">
          <p className="mb-3 text-center text-xs uppercase tracking-widest text-muted-foreground">Aperçu</p>
          <InvitationCard
            data={{
              guestName: "Nom de l'invité",
              eventTitle: event.title,
              eventType: event.type,
              eventDate: event.event_date,
              eventLocation: event.location,
              eventDescription: event.description,
              customMessage: customMessage ?? event.custom_message,
              coverImageUrl: event.cover_image_url,
              template: event.template,
              inviteUrl: inviteUrlFor("preview"),
            }}
          />
        </div>
      </div>

      {/* Guests */}
      <div className="mt-8 rounded-2xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
          <h2 className="font-display text-2xl font-semibold">Invités</h2>
          <div className="flex gap-2">
            <input
              ref={csvRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && importCsv(e.target.files[0])}
            />
            <Button variant="outline" size="sm" onClick={() => csvRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" /> Importer CSV
            </Button>
            <Dialog open={guestOpen} onOpenChange={setGuestOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-gradient-gold text-primary-foreground">
                  <Plus className="mr-2 h-4 w-4" /> Ajouter
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nouvel invité</DialogTitle></DialogHeader>
                <form onSubmit={addGuest} className="space-y-4">
                  <div>
                    <Label>Nom complet *</Label>
                    <Input required value={guestForm.full_name} onChange={(e) => setGuestForm({ ...guestForm, full_name: e.target.value })} />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>Email</Label>
                      <Input type="email" value={guestForm.email} onChange={(e) => setGuestForm({ ...guestForm, email: e.target.value })} />
                    </div>
                    <div>
                      <Label>Téléphone</Label>
                      <Input value={guestForm.phone} onChange={(e) => setGuestForm({ ...guestForm, phone: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label>Accompagnants</Label>
                    <Input type="number" min={0} value={guestForm.companions} onChange={(e) => setGuestForm({ ...guestForm, companions: parseInt(e.target.value) || 0 })} />
                  </div>
                  <DialogFooter>
                    <Button type="submit" className="bg-gradient-gold text-primary-foreground">Ajouter</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        {guests.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            Aucun invité pour l'instant. Ajoutez-en un ou importez un fichier CSV (colonnes : <code>full_name, email, phone, companions</code>).
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Accomp.</TableHead>
                <TableHead>RSVP</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {guests.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">{g.full_name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {g.email}{g.email && g.phone && " · "}{g.phone}
                  </TableCell>
                  <TableCell>{g.companions}</TableCell>
                  <TableCell>
                    <span className={
                      g.rsvp_status === "confirme" ? "text-green-600" :
                      g.rsvp_status === "refuse" ? "text-red-500" : "text-amber-500"
                    }>
                      {g.rsvp_status === "confirme" ? "Confirmé" : g.rsvp_status === "refuse" ? "Refusé" : "En attente"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" title="Copier le lien" onClick={() => copyLink(g.invite_token)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Voir l'invitation & QR" onClick={() => setQrGuest(g)}>
                        <QrCode className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => removeGuest(g.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Send invitations */}
      <div className="mt-8">
        <SendInvitations
          guests={guests}
          event={{ title: event.title, type: event.type, event_date: event.event_date, location: event.location }}
          inviteUrlFor={inviteUrlFor}
        />
      </div>

      {/* Staff / scanners */}
      <StaffManager eventId={id} />

      <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/30 p-4 text-xs text-muted-foreground">
        Identifiant à donner à votre équipe pour se connecter au scanner : <code className="text-foreground">{id}</code>
      </div>

      {/* Per-guest invitation dialog */}
      <Dialog open={!!qrGuest} onOpenChange={(o) => !o && setQrGuest(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invitation de {qrGuest?.full_name}</DialogTitle>
          </DialogHeader>
          {qrGuest && (
            <div className="space-y-4">
              <InvitationCard
                data={{
                  guestName: qrGuest.full_name,
                  eventTitle: event.title,
                  eventType: event.type,
                  eventDate: event.event_date,
                  eventLocation: event.location,
                  eventDescription: event.description,
                  customMessage: event.custom_message,
                  coverImageUrl: event.cover_image_url,
                  template: event.template,
                  inviteUrl: inviteUrlFor(qrGuest.invite_token),
                }}
              />
              <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-2">
                <code className="flex-1 truncate text-xs">{inviteUrlFor(qrGuest.invite_token)}</code>
                <Button size="sm" variant="outline" onClick={() => copyLink(qrGuest.invite_token)}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
