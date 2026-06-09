import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, ShieldCheck, KeyRound } from "lucide-react";

export function StaffManager({ eventId }: { eventId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ full_name: "", pin: "" });

  const { data: staff = [] } = useQuery({
    queryKey: ["event_staff", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_staff")
        .select("id, full_name, role, created_at")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.pin.length < 4) return toast.error("PIN trop court (4 chiffres min)");
    const { error } = await supabase.rpc("create_event_staff", {
      _event_id: eventId,
      _full_name: form.full_name,
      _pin: form.pin,
    });
    if (error) return toast.error(error.message);
    toast.success(`${form.full_name} ajouté(e) — PIN : ${form.pin}`);
    setForm({ full_name: "", pin: "" });
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["event_staff", eventId] });
  };

  const removeStaff = async (id: string) => {
    const { error } = await supabase.from("event_staff").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Membre retiré");
    qc.invalidateQueries({ queryKey: ["event_staff", eventId] });
  };

  const randomPin = () => setForm((f) => ({ ...f, pin: String(Math.floor(1000 + Math.random() * 9000)) }));

  return (
    <div className="mt-8 rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-gold" />
          <h2 className="font-display text-2xl font-semibold">Équipe de scan</h2>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-gradient-gold text-primary-foreground">
              <Plus className="mr-2 h-4 w-4" /> Ajouter un scanner
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouveau membre d'équipe</DialogTitle></DialogHeader>
            <form onSubmit={addStaff} className="space-y-4">
              <div>
                <Label>Nom complet *</Label>
                <Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Ex. Awa Diop" />
              </div>
              <div>
                <Label>PIN (4 chiffres ou +) *</Label>
                <div className="flex gap-2">
                  <Input required value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, "") })} maxLength={8} />
                  <Button type="button" variant="outline" onClick={randomPin}><KeyRound className="h-4 w-4" /></Button>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Communiquez ce PIN au membre. Il l'utilisera dans Scanner QR.</p>
              </div>
              <DialogFooter>
                <Button type="submit" className="bg-gradient-gold text-primary-foreground">Créer</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {staff.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">
          Aucun membre d'équipe. Ajoutez des scanners avec un PIN pour leur permettre de valider les invités sans accès à votre compte.
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {staff.map((s) => (
            <li key={s.id} className="flex items-center justify-between p-4">
              <div>
                <div className="font-medium">{s.full_name}</div>
                <div className="text-xs text-muted-foreground">Rôle : {s.role}</div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => removeStaff(s.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
