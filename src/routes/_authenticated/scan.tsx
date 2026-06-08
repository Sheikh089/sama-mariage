import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Camera, CameraOff, CheckCircle2, AlertTriangle, Users } from "lucide-react";

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
};

function tokenFromInput(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  try {
    const u = new URL(v);
    const m = u.pathname.match(/\/i\/([^/]+)/);
    if (m) return m[1];
  } catch {
    /* not a url */
  }
  return v;
}

function ScanPage() {
  const elId = "qr-reader";
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [running, setRunning] = useState(false);
  const [last, setLast] = useState<Result | null>(null);
  const [manual, setManual] = useState("");
  const [stats, setStats] = useState({ scanned: 0, ok: 0, dup: 0, err: 0 });
  const lastTokenRef = useRef<{ token: string; at: number } | null>(null);

  const submit = async (token: string) => {
    // debounce same code 3s
    const now = Date.now();
    if (lastTokenRef.current && lastTokenRef.current.token === token && now - lastTokenRef.current.at < 3000) return;
    lastTokenRef.current = { token, at: now };

    const { data, error } = await supabase.rpc("checkin_guest", { _token: token });
    if (error) {
      setLast({ ok: false, error: error.message });
      setStats((s) => ({ ...s, scanned: s.scanned + 1, err: s.err + 1 }));
      toast.error(error.message);
      return;
    }
    const row = (data as any[])?.[0];
    if (!row) {
      setLast({ ok: false, error: "Invitation introuvable" });
      setStats((s) => ({ ...s, scanned: s.scanned + 1, err: s.err + 1 }));
      return;
    }
    const res: Result = {
      ok: true,
      already: row.already_checked_in,
      name: row.full_name,
      event: row.event_title,
      companions: row.companions,
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
  };

  const start = async () => {
    if (running) return;
    try {
      const scanner = new Html5Qrcode(elId);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (text) => {
          const t = tokenFromInput(text);
          if (t) submit(t);
        },
        () => {},
      );
      setRunning(true);
    } catch (e: any) {
      toast.error(e?.message ?? "Impossible d'accéder à la caméra");
    }
  };

  const stop = async () => {
    try {
      await scannerRef.current?.stop();
      await scannerRef.current?.clear();
    } catch {
      /* ignore */
    }
    scannerRef.current = null;
    setRunning(false);
  };

  useEffect(() => {
    return () => {
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitManual = (e: React.FormEvent) => {
    e.preventDefault();
    const t = tokenFromInput(manual);
    if (!t) return toast.error("Code invalide");
    submit(t);
    setManual("");
  };

  return (
    <div className="p-6 md:p-10">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold">Scanner les invités</h1>
        <p className="text-sm text-muted-foreground">Pointez la caméra vers le QR code de l'invitation.</p>
      </div>

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
            <Input
              placeholder="Coller un lien ou code"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
            />
            <Button type="submit" variant="outline">Vérifier</Button>
          </form>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Scannés", v: stats.scanned },
              { label: "Validés", v: stats.ok, c: "text-green-600" },
              { label: "Doublons", v: stats.dup, c: "text-amber-500" },
              { label: "Erreurs", v: stats.err, c: "text-red-500" },
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
            {last && last.ok && (
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
