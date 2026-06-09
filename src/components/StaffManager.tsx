import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, ShieldCheck, KeyRound, Lock } from "lucide-react";

const ROLE_LABEL: Record<string, string> = {
  scanner: "Scanner",
  validator: "Validateur",
  event_admin: "Admin événement",
};

export function StaffManager({ eventId }: { eventId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    full_name: "", pin: "", role: "scanner",
    can_scan: true, can_view_guests: false, can_manage_guests: false,
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["event_staff", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_staff")
        .select("id, full_name, role, can_scan, can_view_guests, can_manage_guests, created_at")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: lockouts = [] } = useQuery({
    queryKey: ["staff_lockouts", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_pin_lockout").select("full_name_lc, attempts, locked_until")
        .eq("event_id", eventId);
      if (error) throw error;
      return data;
    },
    refetchInterval: 30_000,
  });

  const lockMap = new Map(lockouts.map((l) => [l.full_name_lc, l]));

  const setRole = (role: string) => {
    setForm((f) => ({
      ...f, role,
      can_scan: true,
      can_view_guests: role !== "scanner",
      can_manage_guests: role === "event_admin",
    }));
  };

  const addStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.pin.length < 4) return toast.error("PIN trop court (4 chiffres min)");
    const { data: staffId, error } = await supabase.rpc("create_event_staff", {
      _event_id: eventId, _full_name: form.full_name, _pin: form.pin,
    });
    if (error) return toast.error(error.message);
    // apply role + permissions
    const { error: e2 } = await supabase.from("event_staff").update({
      role: form.role as any,
      can_scan: form.can_scan,
      can_view_guests: form.can_view_guests,
      can_manage_guests: form.can_manage_guests,
    }).eq("id", staffId as any);
    if (e2) toast.error(e2.message);
    toast.success(`${form.full_name} ajouté(e) — PIN : ${form.pin}`);
    setForm({ full_name: "", pin: "", role: "scanner", can_scan: true, can_view_guests: false, can_manage_guests: false });
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["event_staff", eventId] });
  };

  const removeStaff = async (id: string) => {
    const { error } = await supabase.from("event_staff").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Membre retiré");
    qc.invalidateQueries({ queryKey: ["event_staff", eventId] });
  };

  const unlock = async (full_name_lc: string) => {
    const { error } = await supabase.from("staff_pin_lockout").delete()
      .eq("event_id", eventId).eq("full_name_lc", full_name_lc);
    if (error) return toast.error(error.message);
    toast.success("Verrou levé");
    qc.invalidateQueries({ queryKey: ["staff_lockouts", eventId] });
  };

  const randomPin = () => setForm((f) => ({ ...f, pin: String(Math.floor(1000 + Math.random() * 9000)) }));

  return (
    <div className="mt-8 rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-gold" />
          <h2 className="font-display text-2xl font-semibold">Équipe & permissions</h2>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-gradient-gold text-primary-foreground">
              <Plus className="mr-2 h-4 w-4" /> Ajouter un membre
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
                <Label>Rôle</Label>
                <Select value={form.role} onValueChange={setRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scanner">Scanner — scanne uniquement</SelectItem>
                    <SelectItem value="validator">Validateur — scanne + voit la liste</SelectItem>
                    <SelectItem value="event_admin">Admin événement — tous les droits</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                <div className="text-xs font-medium">Permissions fines</div>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={form.can_scan} onCheckedChange={(v) => setForm({ ...form, can_scan: !!v })} /> Peut scanner
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={form.can_view_guests} onCheckedChange={(v) => setForm({ ...form, can_view_guests: !!v })} /> Peut voir la liste d'invités
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={form.can_manage_guests} onCheckedChange={(v) => setForm({ ...form, can_manage_guests: !!v })} /> Peut modifier les invités
                </label>
              </div>
              <div>
                <Label>PIN (4 chiffres ou +) *</Label>
                <div className="flex gap-2">
                  <Input required value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, "") })} maxLength={8} />
                  <Button type="button" variant="outline" onClick={randomPin}><KeyRound className="h-4 w-4" /></Button>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Communiquez ce PIN au membre. 5 tentatives échouées → verrouillage 15 min.</p>
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
          Aucun membre d'équipe. Ajoutez des scanners, validateurs ou admins d'événement pour partager la validation.
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {staff.map((s) => {
            const lock = lockMap.get(s.full_name.toLowerCase());
            const isLocked = lock?.locked_until && new Date(lock.locked_until) > new Date();
            return (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <div className="flex items-center gap-2 font-medium">
                    {s.full_name}
                    {isLocked && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-600">
                        <Lock className="h-3 w-3" /> Verrouillé
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {ROLE_LABEL[s.role] ?? s.role} ·{" "}
                    {[s.can_scan && "scan", s.can_view_guests && "voir", s.can_manage_guests && "modifier"]
                      .filter(Boolean).join(" · ")}
                  </div>
                </div>
                <div className="flex gap-1">
                  {isLocked && (
                    <Button variant="outline" size="sm" onClick={() => unlock(s.full_name.toLowerCase())}>
                      Lever
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => removeStaff(s.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
