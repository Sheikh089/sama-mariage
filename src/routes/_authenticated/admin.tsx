import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ShieldCheck, Search, RefreshCw, RotateCcw, KeyRound,
  CalendarDays, Users, CheckCircle2, BadgeCheck,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Administration — Sama Mariage" }] }),
  beforeLoad: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin");
    if (!roles || roles.length === 0) throw redirect({ to: "/dashboard" });
  },
  component: AdminPage,
});

function StatCard({ icon: Icon, label, value }: any) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className="h-5 w-5 text-gold" />
      </div>
      <div className="mt-2 font-display text-3xl font-semibold">{value ?? "—"}</div>
    </div>
  );
}

function AdminPage() {
  const qc = useQueryClient();

  const { data: overview, refetch: refetchOverview } = useQuery({
    queryKey: ["admin_overview"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_overview");
      if (error) throw error;
      return data as any;
    },
  });

  // Realtime invalidations
  useEffect(() => {
    const ch = supabase.channel("admin-overview")
      .on("postgres_changes", { event: "*", schema: "public", table: "guests" }, () => {
        qc.invalidateQueries({ queryKey: ["admin_overview"] });
        qc.invalidateQueries({ queryKey: ["admin_events"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => {
        qc.invalidateQueries({ queryKey: ["admin_overview"] });
        qc.invalidateQueries({ queryKey: ["admin_events"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  return (
    <div className="p-6 md:p-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-gold" />
            <h1 className="font-display text-3xl font-semibold">Administration</h1>
          </div>
          <p className="text-sm text-muted-foreground">Vue d'ensemble globale — données mises à jour en temps réel.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetchOverview()}>
          <RefreshCw className="mr-1 h-3 w-3" /> Rafraîchir
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={CalendarDays} label="Événements" value={overview?.total_events} />
        <StatCard icon={Users} label="Invités" value={overview?.total_guests} />
        <StatCard icon={BadgeCheck} label="Utilisateurs" value={overview?.total_users} />
        <StatCard icon={CheckCircle2} label="Check-ins aujourd'hui" value={overview?.checked_in_today} />
      </div>

      <Tabs defaultValue="events" className="mt-8">
        <TabsList>
          <TabsTrigger value="events">Événements</TabsTrigger>
          <TabsTrigger value="invitations">Invitations / Tokens</TabsTrigger>
          <TabsTrigger value="users">Utilisateurs & Plans</TabsTrigger>
          <TabsTrigger value="pin-logs">Logs PIN</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="mt-4"><EventsTab /></TabsContent>
        <TabsContent value="invitations" className="mt-4"><InvitationsTab /></TabsContent>
        <TabsContent value="users" className="mt-4"><UsersTab /></TabsContent>
        <TabsContent value="pin-logs" className="mt-4"><PinLogsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function EventsTab() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin_events"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_events");
      if (error) throw error;
      return data as any[];
    },
  });
  if (isLoading) return <div className="p-6 text-muted-foreground">Chargement…</div>;
  return (
    <div className="rounded-2xl border border-border bg-card">
      <Table>
        <TableHeader><TableRow>
          <TableHead>Titre</TableHead><TableHead>Type</TableHead><TableHead>Statut</TableHead>
          <TableHead>Date</TableHead><TableHead>Propriétaire</TableHead>
          <TableHead className="text-right">Invités</TableHead><TableHead className="text-right">Pointés</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {data.map((e) => (
            <TableRow key={e.id}>
              <TableCell className="font-medium">{e.title}</TableCell>
              <TableCell><span className="text-xs uppercase">{e.type}</span></TableCell>
              <TableCell>
                <span className={`rounded-full px-2 py-0.5 text-xs ${
                  e.status === "publie" ? "bg-green-500/10 text-green-700" : "bg-muted text-muted-foreground"
                }`}>{e.status}</span>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {e.event_date ? new Date(e.event_date).toLocaleDateString("fr-FR") : "—"}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{e.owner_email}</TableCell>
              <TableCell className="text-right">{e.guests_count}</TableCell>
              <TableCell className="text-right font-medium">{e.checked_in_count}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function InvitationsTab() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);

  const search = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!q.trim()) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_find_invitation", { _query: q.trim() });
    setLoading(false);
    if (error) return toast.error(error.message);
    setResults(data as any[]);
  };

  const resetCheckin = async (id: string) => {
    const { error } = await supabase.rpc("admin_reset_checkin", { _guest_id: id });
    if (error) return toast.error(error.message);
    toast.success("Check-in réinitialisé");
    search();
  };

  const regenToken = async (id: string) => {
    const { data, error } = await supabase.rpc("admin_regenerate_token", { _guest_id: id });
    if (error) return toast.error(error.message);
    toast.success("Token régénéré");
    navigator.clipboard.writeText(data as string).catch(() => {});
    search();
  };

  return (
    <div className="space-y-4">
      <form onSubmit={search} className="flex gap-2">
        <Input placeholder="Rechercher par token, nom ou email…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button type="submit" disabled={loading}>
          <Search className="mr-1 h-4 w-4" /> {loading ? "…" : "Chercher"}
        </Button>
      </form>
      {results && (
        <div className="rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Invité</TableHead><TableHead>Événement</TableHead><TableHead>RSVP</TableHead>
              <TableHead>Check-in</TableHead><TableHead>Token</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {results.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Aucun résultat</TableCell></TableRow>
              )}
              {results.map((g) => (
                <TableRow key={g.guest_id}>
                  <TableCell>
                    <div className="font-medium">{g.full_name}</div>
                    <div className="text-xs text-muted-foreground">{g.email ?? g.phone ?? ""}</div>
                  </TableCell>
                  <TableCell className="text-sm">{g.event_title}</TableCell>
                  <TableCell><span className="text-xs">{g.rsvp_status}</span></TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {g.checked_in_at ? new Date(g.checked_in_at).toLocaleString("fr-FR") : "—"}
                  </TableCell>
                  <TableCell><code className="text-[10px]">{g.invite_token.slice(0, 12)}…</code></TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" title="Reset check-in" onClick={() => resetCheckin(g.guest_id)}>
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Régénérer token" onClick={() => regenToken(g.guest_id)}>
                        <KeyRound className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function UsersTab() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin_users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_users");
      if (error) throw error;
      return data as any[];
    },
  });
  const setPlan = async (user_id: string, plan: string) => {
    const { error } = await supabase.rpc("admin_set_plan", { _user_id: user_id, _plan: plan as any });
    if (error) return toast.error(error.message);
    toast.success("Plan mis à jour");
    qc.invalidateQueries({ queryKey: ["admin_users"] });
  };
  if (isLoading) return <div className="p-6 text-muted-foreground">Chargement…</div>;
  return (
    <div className="rounded-2xl border border-border bg-card">
      <Table>
        <TableHeader><TableRow>
          <TableHead>Email</TableHead><TableHead>Nom</TableHead>
          <TableHead className="text-right">Événements</TableHead>
          <TableHead>Plan</TableHead><TableHead>Inscrit le</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {data.map((u) => (
            <TableRow key={u.user_id}>
              <TableCell className="font-medium">{u.email}</TableCell>
              <TableCell>{u.full_name ?? "—"}</TableCell>
              <TableCell className="text-right">{u.events_count}</TableCell>
              <TableCell>
                <Select value={u.plan} onValueChange={(v) => setPlan(u.user_id, v)}>
                  <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="essai">Essai</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {new Date(u.created_at).toLocaleDateString("fr-FR")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function PinLogsTab() {
  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ["pin_audit_log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pin_audit_log")
        .select("id, event_id, full_name, success, reason, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });
  if (isLoading) return <div className="p-6 text-muted-foreground">Chargement…</div>;
  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="flex justify-end p-3">
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="mr-1 h-3 w-3" /> Rafraîchir
        </Button>
      </div>
      <Table>
        <TableHeader><TableRow>
          <TableHead>Date</TableHead><TableHead>Nom tenté</TableHead>
          <TableHead>Statut</TableHead><TableHead>Raison</TableHead>
          <TableHead>Événement</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {data.length === 0 && (
            <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Aucune tentative</TableCell></TableRow>
          )}
          {data.map((l) => (
            <TableRow key={l.id}>
              <TableCell className="text-xs">{new Date(l.created_at).toLocaleString("fr-FR")}</TableCell>
              <TableCell>{l.full_name}</TableCell>
              <TableCell>
                <span className={`text-xs ${l.success ? "text-green-600" : "text-red-500"}`}>
                  {l.success ? "Succès" : "Échec"}
                </span>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">{l.reason ?? "—"}</TableCell>
              <TableCell className="text-xs text-muted-foreground"><code>{l.event_id.slice(0, 8)}…</code></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
