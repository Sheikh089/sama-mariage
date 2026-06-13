import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MessageCircle, Mail, Phone, Send, Copy, Users, Sparkles, Loader2, Wand2, Pencil } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { generateInvitationMessage } from "@/lib/api/ai-invitation.functions";

type Guest = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  invite_token: string;
};

type Props = {
  guests: Guest[];
  event: {
    title: string;
    type: string;
    event_date: string | null;
    location: string | null;
  };
  inviteUrlFor: (token: string) => string;
};

const DEFAULT_TEMPLATE = `Bonjour {name},

Vous êtes cordialement invité(e) à {event} le {date}{location}.

Voici votre invitation personnalisée :
{link}

Au plaisir de vous y voir !`;

function render(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}

function cleanPhone(p?: string | null) {
  if (!p) return "";
  return p.replace(/[^\d+]/g, "").replace(/^00/, "+");
}

export function SendInvitations({ guests, event, inviteUrlFor }: Props) {
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [tone, setTone] = useState<"romantique" | "professionnel" | "chaleureux" | "elegant">("elegant");
  const [generating, setGenerating] = useState(false);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });
  const [personalMessages, setPersonalMessages] = useState<Record<string, string>>({});
  const [personalNotes, setPersonalNotes] = useState<Record<string, string>>({});
  const [busyGuestId, setBusyGuestId] = useState<string | null>(null);
  const [editGuest, setEditGuest] = useState<Guest | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editNote, setEditNote] = useState("");
  const generate = useServerFn(generateInvitationMessage);

  const formattedDate = event.event_date
    ? new Date(event.event_date).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })
    : "";

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { message } = await generate({
        data: {
          eventTitle: event.title,
          eventType: event.type,
          eventDate: event.event_date,
          location: event.location,
          tone,
        },
      });
      setTemplate(message);
      toast.success("Message généré par l'IA");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec de la génération");
    } finally {
      setGenerating(false);
    }
  };

  const generateForGuest = async (g: Guest, note?: string) => {
    const { message } = await generate({
      data: {
        eventTitle: event.title,
        eventType: event.type,
        eventDate: event.event_date,
        location: event.location,
        tone,
        guestName: g.full_name,
        guestNote: note ?? personalNotes[g.id] ?? null,
      },
    });
    return message;
  };

  const handleGenerateOne = async (g: Guest) => {
    setBusyGuestId(g.id);
    try {
      const msg = await generateForGuest(g);
      setPersonalMessages((m) => ({ ...m, [g.id]: msg }));
      toast.success(`Message personnalisé généré pour ${g.full_name}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec de la génération");
    } finally {
      setBusyGuestId(null);
    }
  };

  const handleGenerateAll = async () => {
    if (guests.length === 0) return;
    if (!confirm(`Générer un message IA personnalisé pour les ${guests.length} invités ?`)) return;
    setBulkGenerating(true);
    setBulkProgress({ done: 0, total: guests.length });
    const next: Record<string, string> = { ...personalMessages };
    let ok = 0;
    for (const g of guests) {
      try {
        next[g.id] = await generateForGuest(g);
        ok++;
      } catch (e) {
        toast.error(`${g.full_name} : ${e instanceof Error ? e.message : "échec"}`);
      }
      setBulkProgress((p) => ({ ...p, done: p.done + 1 }));
      setPersonalMessages({ ...next });
      await new Promise((r) => setTimeout(r, 250));
    }
    setBulkGenerating(false);
    toast.success(`${ok} message(s) personnalisé(s) généré(s)`);
  };

  const openEdit = (g: Guest) => {
    setEditGuest(g);
    setEditValue(personalMessages[g.id] ?? "");
    setEditNote(personalNotes[g.id] ?? "");
  };

  const messageFor = (g: Guest) => {
    const personal = personalMessages[g.id];
    if (personal) {
      return personal.replace(/\{link\}/g, inviteUrlFor(g.invite_token));
    }
    return render(template, {
      name: g.full_name,
      event: event.title,
      type: event.type,
      date: formattedDate,
      location: event.location ? ` à ${event.location}` : "",
      link: inviteUrlFor(g.invite_token),
    });
  };

  const waLink = (g: Guest) => {
    const phone = cleanPhone(g.phone).replace(/^\+/, "");
    const text = encodeURIComponent(messageFor(g));
    return phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
  };
  const smsLink = (g: Guest) => `sms:${cleanPhone(g.phone)}?&body=${encodeURIComponent(messageFor(g))}`;
  const mailLink = (g: Guest) =>
    `mailto:${g.email ?? ""}?subject=${encodeURIComponent(`Invitation — ${event.title}`)}&body=${encodeURIComponent(messageFor(g))}`;

  const withPhone = useMemo(() => guests.filter((g) => g.phone), [guests]);
  const withEmail = useMemo(() => guests.filter((g) => g.email), [guests]);

  const openBulkWhatsApp = () => {
    if (withPhone.length === 0) return toast.error("Aucun invité avec téléphone");
    if (!confirm(`Ouvrir ${withPhone.length} onglet(s) WhatsApp ? Autorisez les pop-ups.`)) return;
    withPhone.forEach((g, i) => setTimeout(() => window.open(waLink(g), "_blank"), i * 300));
  };

  const openBulkMail = () => {
    if (withEmail.length === 0) return toast.error("Aucun invité avec email");
    const bcc = withEmail.map((g) => g.email).join(",");
    const subject = encodeURIComponent(`Invitation — ${event.title}`);
    const body = encodeURIComponent(
      render(template, {
        name: "cher(e) invité(e)",
        event: event.title,
        type: event.type,
        date: formattedDate,
        location: event.location ? ` à ${event.location}` : "",
        link: "(votre lien personnalisé sera dans votre invitation)",
      }),
    );
    window.location.href = `mailto:?bcc=${bcc}&subject=${subject}&body=${body}`;
    toast.message("Note : pour des liens uniques par invité, utilisez l'envoi individuel.");
  };

  const copyAll = async () => {
    const text = guests.map((g) => `${g.full_name}\n${inviteUrlFor(g.invite_token)}`).join("\n\n");
    await navigator.clipboard.writeText(text);
    toast.success(`${guests.length} lien(s) copié(s)`);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <Send className="h-5 w-5 text-gold" />
        <h2 className="font-display text-2xl font-semibold">Envoyer les invitations</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Personnalisez le message puis envoyez via WhatsApp, SMS ou Email. Variables : <code>{"{name} {event} {date} {location} {link}"}</code>
      </p>

      <div className="mt-4 rounded-xl border border-dashed border-gold/40 bg-gold/5 p-3">
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[180px]">
            <Label className="text-xs">Ton du message</Label>
            <Select value={tone} onValueChange={(v) => setTone(v as typeof tone)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="elegant">Élégant & professionnel</SelectItem>
                <SelectItem value="romantique">Romantique</SelectItem>
                <SelectItem value="chaleureux">Chaleureux</SelectItem>
                <SelectItem value="professionnel">Strictement professionnel</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleGenerate} disabled={generating} className="bg-gold text-background hover:bg-gold/90">
            {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Générer avec l'IA
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          L'IA rédige un message adapté à votre événement en conservant les variables {"{name} {event} {date} {location} {link}"}.
        </p>
      </div>

      <div className="mt-4">
        <Label>Message</Label>
        <Textarea rows={7} value={template} onChange={(e) => setTemplate(e.target.value)} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          onClick={handleGenerateAll}
          disabled={bulkGenerating || guests.length === 0}
          className="bg-gradient-gold text-primary-foreground"
        >
          {bulkGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
          {bulkGenerating
            ? `Génération… ${bulkProgress.done}/${bulkProgress.total}`
            : `Générer un message IA par invité (${guests.length})`}
        </Button>
        <Button variant="outline" onClick={openBulkWhatsApp}>
          <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp à tous ({withPhone.length})
        </Button>
        <Button variant="outline" onClick={openBulkMail}>
          <Mail className="mr-2 h-4 w-4" /> Email groupé ({withEmail.length})
        </Button>
        <Button variant="outline" onClick={copyAll}>
          <Copy className="mr-2 h-4 w-4" /> Copier tous les liens
        </Button>
        {Object.keys(personalMessages).length > 0 && (
          <Button
            variant="ghost"
            onClick={() => {
              setPersonalMessages({});
              toast.success("Messages personnalisés effacés");
            }}
          >
            Réinitialiser les messages IA
          </Button>
        )}
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-border">
        <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2 text-xs uppercase tracking-wide text-muted-foreground">
          <Users className="h-3.5 w-3.5" /> Envoi individuel
        </div>
        <ul className="divide-y">
          {guests.length === 0 && (
            <li className="p-4 text-sm text-muted-foreground">Ajoutez d'abord des invités.</li>
          )}
          {guests.map((g) => (
            <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{g.full_name}</span>
                  {personalMessages[g.id] && (
                    <Badge variant="secondary" className="gap-1 text-[10px]">
                      <Sparkles className="h-3 w-3" /> IA
                    </Badge>
                  )}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {g.phone || "—"} {g.email && `· ${g.email}`}
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  title="Générer un message IA personnalisé"
                  onClick={() => handleGenerateOne(g)}
                  disabled={busyGuestId === g.id || bulkGenerating}
                >
                  {busyGuestId === g.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                </Button>
                <Button size="sm" variant="outline" title="Voir / éditer le message" onClick={() => openEdit(g)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button asChild size="sm" variant="outline" disabled={!g.phone} title="WhatsApp">
                  <a href={waLink(g)} target="_blank" rel="noreferrer">
                    <MessageCircle className="h-4 w-4" />
                  </a>
                </Button>
                <Button asChild size="sm" variant="outline" disabled={!g.phone} title="SMS">
                  <a href={smsLink(g)}>
                    <Phone className="h-4 w-4" />
                  </a>
                </Button>
                <Button asChild size="sm" variant="outline" disabled={!g.email} title="Email">
                  <a href={mailLink(g)}>
                    <Mail className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <Dialog open={!!editGuest} onOpenChange={(o) => !o && setEditGuest(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Message pour {editGuest?.full_name}</DialogTitle>
          </DialogHeader>
          {editGuest && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Note personnelle pour l'IA (optionnel)</Label>
                <Input
                  placeholder="Ex : ami d'enfance, témoin, collègue de bureau…"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Message envoyé à cet invité</Label>
                <Textarea
                  rows={8}
                  value={editValue || messageFor(editGuest)}
                  onChange={(e) => setEditValue(e.target.value)}
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Variable disponible : <code>{"{link}"}</code> (remplacée par le lien unique de l'invité).
                </p>
              </div>
              <DialogFooter className="gap-2 sm:gap-2">
                <Button
                  variant="outline"
                  disabled={busyGuestId === editGuest.id}
                  onClick={async () => {
                    if (!editGuest) return;
                    setBusyGuestId(editGuest.id);
                    setPersonalNotes((n) => ({ ...n, [editGuest.id]: editNote }));
                    try {
                      const msg = await generateForGuest(editGuest, editNote);
                      setEditValue(msg);
                      setPersonalMessages((m) => ({ ...m, [editGuest.id]: msg }));
                      toast.success("Message régénéré");
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Échec de la génération");
                    } finally {
                      setBusyGuestId(null);
                    }
                  }}
                >
                  {busyGuestId === editGuest.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Régénérer avec l'IA
                </Button>
                <Button
                  onClick={() => {
                    if (!editGuest) return;
                    setPersonalMessages((m) => ({ ...m, [editGuest.id]: editValue }));
                    setPersonalNotes((n) => ({ ...n, [editGuest.id]: editNote }));
                    setEditGuest(null);
                    toast.success("Message enregistré");
                  }}
                  className="bg-gradient-gold text-primary-foreground"
                >
                  Enregistrer
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
