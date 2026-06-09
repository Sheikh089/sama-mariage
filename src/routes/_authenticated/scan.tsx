import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Camera, CameraOff, CheckCircle2, AlertTriangle, Users, Wifi, WifiOff,
  RefreshCw, LogOut, KeyRound,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { enqueue, getQueue, clearItem, appendSyncedLog, getSyncedLog, clearSyncedLog, type SyncedScan } from "@/lib/scan-queue";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CheckCircle, XCircle, History } from "lucide-react";

export const Route = createFileRoute("/_authenticated/scan")({
  head: () => ({ meta: [{ title: "Scanner QR — Sama Mariage" }] }),
  component: ScanPage,
});

type Result = {
  ok: boolean;
  already?: boolean;
  name?: string;
  event?: string;
  companions?: number;
  error?: string;
  queued?: boolean;
};

const SESSION_KEY = "sama_staff_session_v1";
type StaffSession = { token: string; event_id: string; event_title: string; staff_name: string; expires_at: string };

function loadSession(): StaffSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as StaffSession;
    if (new Date(s.expires_at) < new Date()) return null;
    return s;
  } catch { return null; }
}

function tokenFromInput(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  try {
    const u = new URL(v);
    const m = u.pathname.match(/\/i\/([^/]+)/);
    if (m) return m[1];
  } catch { /* not url */ }
  return v;
}

function ScanPage() {
  const [session, setSession] = useState<StaffSession | null>(() => loadSession());
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const [queueCount, setQueueCount] = useState(0);

  // Owner check: does user own any event?
  const { data: ownedEvents = [] } = useQuery({
    queryKey: ["owned_events_simple"],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("id, title").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const refreshQueue = async () => setQueueCount((await getQueue()).length);

  useEffect(() => {
    refreshQueue();
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // auto-sync when back online
  useEffect(() => {
    if (online && queueCount > 0) void syncQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  const callCheckin = async (token: string, sessionToken: string | null) => {
    const { data, error } = await supabase.rpc("checkin_guest", {
      _token: token,
      _session_token: sessionToken as any,
    });
    if (error) throw error;
    return (data as any[])?.[0];
  };

  const syncQueue = async () => {
    const q = await getQueue();
    if (q.length === 0) return;
    let ok = 0, dup = 0, err = 0;
    for (const item of q) {
      try {
        const row = await callCheckin(item.token, item.session_token);
        const synced: SyncedScan = {
          id: item.id, token: item.token, scanned_at: item.scanned_at,
          synced_at: new Date().toISOString(),
          status: row ? (row.already_checked_in ? "already" : "ok") : "error",
          guest_name: row?.full_name, event_title: row?.event_title, companions: row?.companions,
          error: row ? undefined : "Invitation introuvable",
        };
        await appendSyncedLog(synced);
        await clearItem(item.id);
        if (synced.status === "ok") ok++;
        else if (synced.status === "already") dup++;
        else err++;
      } catch (e: any) {
        // network error → stop; other errors → log and continue
        const msg = e?.message ?? "Erreur";
        if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) break;
        await appendSyncedLog({
          id: item.id, token: item.token, scanned_at: item.scanned_at,
          synced_at: new Date().toISOString(), status: "error", error: msg,
        });
        await clearItem(item.id);
        err++;
      }
    }
    await refreshQueue();
    if (ok + dup + err > 0) {
      toast.success(`Sync : ${ok} validés · ${dup} doublons · ${err} erreurs`);
    }
  };

  const isOwner = ownedEvents.length > 0;
  const canScan = isOwner || !!session;

  if (!canScan) {
    return <PinLogin onLogin={(s) => { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); setSession(s); }} />;
  }

  return (
    <Scanner
      session={session}
      ownedEvents={ownedEvents}
      online={online}
      queueCount={queueCount}
      refreshQueue={refreshQueue}
      onLogout={() => { localStorage.removeItem(SESSION_KEY); setSession(null); }}
      callCheckin={callCheckin}
      syncQueue={syncQueue}
    />
  );
}

function PinLogin({ onLogin }: { onLogin: (s: StaffSession) => void }) {
  const [eventId, setEventId] = useState("");
  const [fullName, setFullName] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId) return toast.error("Sélectionnez un événement");
    setLoading(true);
    const { data, error } = await supabase.rpc("staff_login", {
      _event_id: eventId,
      _full_name: fullName,
      _pin: pin,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    const row = (data as any[])?.[0];
    if (!row) return toast.error("Identifiants invalides");
    onLogin({
      token: row.session_token,
      event_id: eventId,
      event_title: row.event_title,
      staff_name: fullName,
      expires_at: row.expires_at,
    });
    toast.success(`Bienvenue, ${fullName}`);
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-card p-6">
        <div className="text-center">
          <KeyRound className="mx-auto h-10 w-10 text-gold" />
          <h1 className="mt-2 font-display text-2xl font-semibold">Connexion équipe</h1>
          <p className="text-sm text-muted-foreground">Entrez votre PIN pour commencer à scanner.</p>
        </div>
        <div>
          <Label>Identifiant événement</Label>
          <Input required placeholder="UUID de l'événement" value={eventId} onChange={(e) => setEventId(e.target.value.trim())} />
          <p className="mt-1 text-xs text-muted-foreground">Demandez-le à l'organisateur (visible dans l'URL de l'événement).</p>
        </div>
        <div>
          <Label>Votre nom</Label>
          <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <Label>PIN</Label>
          <Input required type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} />
        </div>
        <Button type="submit" disabled={loading} className="w-full bg-gradient-gold text-primary-foreground">
          {loading ? "Vérification…" : "Se connecter"}
        </Button>
      </form>
    </div>
  );
}

function Scanner({
  session, ownedEvents, online, queueCount, refreshQueue, onLogout, callCheckin, syncQueue,
}: {
  session: StaffSession | null;
  ownedEvents: { id: string; title: string }[];
  online: boolean;
  queueCount: number;
  refreshQueue: () => Promise<void>;
  onLogout: () => void;
  callCheckin: (token: string, sessionToken: string | null) => Promise<any>;
  syncQueue: () => Promise<void>;
}) {
  const elId = "qr-reader";
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [running, setRunning] = useState(false);
  const [last, setLast] = useState<Result | null>(null);
  const [manual, setManual] = useState("");
  const [stats, setStats] = useState({ scanned: 0, ok: 0, dup: 0, err: 0, queued: 0 });
  const lastTokenRef = useRef<{ token: string; at: number } | null>(null);
  const [activeEventId, setActiveEventId] = useState<string | undefined>(session?.event_id ?? ownedEvents[0]?.id);

  const sessionToken = session?.token ?? null;

  const submit = async (token: string) => {
    const now = Date.now();
    if (lastTokenRef.current && lastTokenRef.current.token === token && now - lastTokenRef.current.at < 3000) return;
    lastTokenRef.current = { token, at: now };

    if (!navigator.onLine) {
      await enqueue({ id: crypto.randomUUID(), token, scanned_at: new Date().toISOString(), session_token: sessionToken });
      await refreshQueue();
      setLast({ ok: true, queued: true, name: "Mise en file" });
      setStats((s) => ({ ...s, scanned: s.scanned + 1, queued: s.queued + 1 }));
      toast.message("Hors-ligne — scan enregistré localement");
      return;
    }

    try {
      const row = await callCheckin(token, sessionToken);
      if (!row) {
        setLast({ ok: false, error: "Invitation introuvable" });
        setStats((s) => ({ ...s, scanned: s.scanned + 1, err: s.err + 1 }));
        return;
      }
      const res: Result = {
        ok: true, already: row.already_checked_in, name: row.full_name,
        event: row.event_title, companions: row.companions,
      };
      setLast(res);
      setStats((s) => ({
        ...s,
        scanned: s.scanned + 1,
        ok: res.already ? s.ok : s.ok + 1,
        dup: res.already ? s.dup + 1 : s.dup,
      }));
      if (res.already) toast.warning(`${res.name} déjà pointé`);
      else toast.success(`${res.name} validé`);
    } catch (e: any) {
      // network error → queue
      if (e?.message?.includes("Failed to fetch") || e?.message?.includes("NetworkError")) {
        await enqueue({ id: crypto.randomUUID(), token, scanned_at: new Date().toISOString(), session_token: sessionToken });
        await refreshQueue();
        setLast({ ok: true, queued: true, name: "Mise en file" });
        setStats((s) => ({ ...s, scanned: s.scanned + 1, queued: s.queued + 1 }));
        toast.message("Réseau indisponible — scan en file");
      } else {
        setLast({ ok: false, error: e?.message ?? "Erreur" });
        setStats((s) => ({ ...s, scanned: s.scanned + 1, err: s.err + 1 }));
        toast.error(e?.message ?? "Erreur");
      }
    }
  };

  const start = async () => {
    if (running) return;
    try {
      const scanner = new Html5Qrcode(elId);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (text) => { const t = tokenFromInput(text); if (t) submit(t); },
        () => {},
      );
      setRunning(true);
    } catch (e: any) {
      toast.error(e?.message ?? "Impossible d'accéder à la caméra");
    }
  };

  const stop = async () => {
    try { await scannerRef.current?.stop(); await scannerRef.current?.clear(); } catch { /* ignore */ }
    scannerRef.current = null;
    setRunning(false);
  };

  useEffect(() => { return () => { stop(); }; /* eslint-disable-next-line */ }, []);

  const submitManual = (e: React.FormEvent) => {
    e.preventDefault();
    const t = tokenFromInput(manual);
    if (!t) return toast.error("Code invalide");
    submit(t);
    setManual("");
  };

  return (
    <div className="p-6 md:p-10">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Scanner les invités</h1>
          <p className="text-sm text-muted-foreground">
            {session ? <>Connecté en tant que <span className="font-medium">{session.staff_name}</span> · {session.event_title}</> :
              "Pointez la caméra vers le QR code de l'invitation."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs ${online ? "bg-green-500/10 text-green-700" : "bg-amber-500/10 text-amber-700"}`}>
            {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {online ? "En ligne" : "Hors ligne"}
          </div>
          {queueCount > 0 && (
            <Button variant="outline" size="sm" onClick={syncQueue} disabled={!online}>
              <RefreshCw className="mr-1 h-3 w-3" /> Sync ({queueCount})
            </Button>
          )}
          <SyncedLogDialog />

          {session && (
            <Button variant="outline" size="sm" onClick={onLogout}>
              <LogOut className="mr-1 h-3 w-3" /> Quitter
            </Button>
          )}
        </div>
      </div>

      {!session && ownedEvents.length > 1 && (
        <div className="mb-4 max-w-sm">
          <Label>Événement actif</Label>
          <Select value={activeEventId} onValueChange={setActiveEventId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ownedEvents.map((e) => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="overflow-hidden rounded-xl bg-black" id={elId} style={{ minHeight: 320 }} />
          <div className="mt-3 flex gap-2">
            {!running ? (
              <Button onClick={start} className="bg-gradient-gold text-primary-foreground">
                <Camera className="mr-2 h-4 w-4" /> Démarrer la caméra
              </Button>
            ) : (
              <Button onClick={stop} variant="outline">
                <CameraOff className="mr-2 h-4 w-4" /> Arrêter
              </Button>
            )}
          </div>

          <form onSubmit={submitManual} className="mt-4 flex gap-2">
            <Input placeholder="Coller un lien ou code" value={manual} onChange={(e) => setManual(e.target.value)} />
            <Button type="submit" variant="outline">Vérifier</Button>
          </form>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-5 gap-2">
            {[
              { label: "Scannés", v: stats.scanned },
              { label: "Validés", v: stats.ok, c: "text-green-600" },
              { label: "Doublons", v: stats.dup, c: "text-amber-500" },
              { label: "Erreurs", v: stats.err, c: "text-red-500" },
              { label: "En file", v: queueCount, c: "text-blue-500" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-card p-3 text-center">
                <div className={`font-display text-2xl font-semibold ${s.c ?? ""}`}>{s.v}</div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            {!last && (
              <div className="text-center text-sm text-muted-foreground">
                En attente du premier scan…
              </div>
            )}
            {last && last.ok && !last.queued && (
              <div className="text-center">
                {last.already ? (
                  <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
                ) : (
                  <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
                )}
                <div className="mt-3 font-display text-2xl font-semibold">{last.name}</div>
                <div className="text-sm text-muted-foreground">{last.event}</div>
                {typeof last.companions === "number" && last.companions > 0 && (
                  <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs">
                    <Users className="h-3 w-3" /> +{last.companions} accompagnant(s)
                  </div>
                )}
                <div className={`mt-3 text-sm font-medium ${last.already ? "text-amber-600" : "text-green-700"}`}>
                  {last.already ? "Déjà enregistré" : "Bienvenue !"}
                </div>
              </div>
            )}
            {last && last.queued && (
              <div className="text-center">
                <WifiOff className="mx-auto h-12 w-12 text-blue-500" />
                <div className="mt-3 font-display text-xl font-semibold">Scan enregistré</div>
                <div className="text-sm text-muted-foreground">Sera envoyé dès le retour du réseau.</div>
              </div>
            )}
            {last && !last.ok && (
              <div className="text-center">
                <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
                <div className="mt-3 font-display text-xl font-semibold">Refusé</div>
                <div className="text-sm text-muted-foreground">{last.error}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
