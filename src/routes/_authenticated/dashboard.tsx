import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar, Users, CheckCircle2, Clock, Plus, Sparkles, QrCode,
  Mail, Heart, TrendingUp, Bell, Search, Crown, MapPin, ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, Tooltip,
} from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Tableau de bord — Sama Mariage" }] }),
  component: Dashboard,
});

/* ---------- Animated counter ---------- */
function Counter({ value, duration = 1.2 }: { value: number; duration?: number }) {
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { duration: duration * 1000, bounce: 0 });
  const display = useTransform(spring, (v) => Math.round(v).toLocaleString("fr-FR"));
  useEffect(() => { mv.set(value); }, [value, mv]);
  return <motion.span>{display}</motion.span>;
}

/* ---------- Countdown ---------- */
function useCountdown(target?: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  if (!target) return null;
  const diff = new Date(target).getTime() - now;
  if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0 };
  return {
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff / 3600000) % 24),
    m: Math.floor((diff / 60000) % 60),
    s: Math.floor((diff / 1000) % 60),
  };
}

/* ---------- Cursor-follow spotlight ---------- */
function useSpotlight() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    el.addEventListener("mousemove", onMove);
    return () => el.removeEventListener("mousemove", onMove);
  }, []);
  return ref;
}

/* ---------- Tilt card ---------- */
function Tilt({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 200, damping: 20 });
  const sry = useSpring(ry, { stiffness: 200, damping: 20 });
  return (
    <motion.div
      ref={ref}
      style={{ rotateX: srx, rotateY: sry, transformPerspective: 1000 }}
      onMouseMove={(e) => {
        const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        ry.set(px * 8);
        rx.set(-py * 8);
      }}
      onMouseLeave={() => { rx.set(0); ry.set(0); }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function Dashboard() {
  const { user } = Route.useRouteContext();
  const spotlightRef = useSpotlight();

  const { data: events = [] } = useQuery({
    queryKey: ["events", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, type, event_date, status, location, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: guests = [] } = useQuery({
    queryKey: ["guests", "all-lite"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guests")
        .select("id, rsvp_status, companions, event_id, created_at, gender");
      if (error) throw error;
      return data ?? [];
    },
  });

  const stats = useMemo(() => {
    const total = guests.length;
    const confirmed = guests.filter((g) => g.rsvp_status === "confirme").length;
    const declined = guests.filter((g) => g.rsvp_status === "refuse").length;
    const pending = guests.filter((g) => g.rsvp_status === "en_attente").length;
    const heads = guests.reduce(
      (a, g) => a + 1 + (g.rsvp_status === "confirme" ? (g.companions ?? 0) : 0), 0,
    );
    return { total, confirmed, declined, pending, heads };
  }, [guests]);

  const nextEvent = useMemo(() => {
    const upcoming = events
      .filter((e) => e.event_date && new Date(e.event_date).getTime() > Date.now())
      .sort((a, b) => new Date(a.event_date!).getTime() - new Date(b.event_date!).getTime());
    return upcoming[0] ?? events[0];
  }, [events]);

  const countdown = useCountdown(nextEvent?.event_date);

  const rsvpData = [
    { name: "Confirmés", value: stats.confirmed, color: "#D4AF37" },
    { name: "En attente", value: stats.pending, color: "#F8E9C4" },
    { name: "Refusés", value: stats.declined, color: "#F9D8E5" },
  ].filter((d) => d.value > 0);

  const activity = useMemo(() => {
    const days = 14;
    const buckets: { day: string; invitations: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const count = guests.filter((g) => (g.created_at ?? "").slice(0, 10) === key).length;
      buckets.push({ day: d.toLocaleDateString("fr-FR", { weekday: "short" }), invitations: count });
    }
    return buckets;
  }, [guests]);

  const firstName = user.email?.split("@")[0] ?? "invité";

  const statCards = [
    { icon: Users, label: "Invités", value: stats.total, hint: `${stats.heads} personnes`, tint: "from-amber-200/60 to-yellow-100/30" },
    { icon: CheckCircle2, label: "Confirmés", value: stats.confirmed, hint: "présences", tint: "from-emerald-200/50 to-lime-100/30" },
    { icon: Clock, label: "En attente", value: stats.pending, hint: "réponses", tint: "from-rose-200/50 to-pink-100/30" },
    { icon: Calendar, label: "Événements", value: events.length, hint: "au total", tint: "from-violet-200/50 to-indigo-100/30" },
  ];

  return (
    <div
      ref={spotlightRef}
      className="relative min-h-screen overflow-hidden"
      style={{
        background:
          "radial-gradient(1200px circle at var(--mx,50%) var(--my,20%), rgba(212,175,55,0.10), transparent 40%), linear-gradient(180deg,#FFFDF9 0%, #FAF8F5 60%, #F4EFEA 100%)",
      }}
    >
      {/* Ambient halos */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-[#D4AF37]/15 blur-3xl" />
        <div className="absolute top-1/3 -right-40 h-[460px] w-[460px] rounded-full bg-[#F9D8E5]/40 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-[380px] w-[380px] rounded-full bg-[#F8E9C4]/50 blur-3xl" />
        {/* particles */}
        {Array.from({ length: 14 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute h-1 w-1 rounded-full bg-[#D4AF37]/60"
            style={{ top: `${(i * 53) % 100}%`, left: `${(i * 37) % 100}%` }}
            animate={{ y: [0, -20, 0], opacity: [0.2, 0.9, 0.2] }}
            transition={{ duration: 6 + (i % 5), repeat: Infinity, delay: i * 0.3 }}
          />
        ))}
      </div>

      <div className="relative z-10 mx-auto max-w-7xl p-5 md:p-10">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 flex flex-wrap items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#8b6f1f] text-white shadow-[0_20px_50px_-15px_rgba(212,175,55,0.6)]">
              <Heart className="h-6 w-6" fill="white" />
              <motion.span
                className="absolute inset-0 rounded-2xl ring-1 ring-white/40"
                animate={{ opacity: [0.3, 0.8, 0.3] }}
                transition={{ duration: 2.4, repeat: Infinity }}
              />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#8b6f1f]/80">Bienvenue</p>
              <h1 className="font-display text-3xl font-semibold md:text-4xl">
                <span className="bg-gradient-to-r from-[#8b6f1f] via-[#D4AF37] to-[#c39a2e] bg-clip-text text-transparent italic">
                  {firstName}
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-full border border-white/70 bg-white/60 px-4 py-2 shadow-sm backdrop-blur-xl md:flex">
              <Search className="h-4 w-4 text-[#8b6f1f]" />
              <input
                placeholder="Rechercher un invité, un événement…"
                className="w-64 bg-transparent text-sm outline-none placeholder:text-neutral-400"
              />
            </div>
            <button className="relative grid h-10 w-10 place-items-center rounded-full border border-white/70 bg-white/60 shadow-sm backdrop-blur-xl transition hover:scale-105">
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#D4AF37]" />
            </button>
            <div className="ml-1 flex items-center gap-1 rounded-full border border-[#D4AF37]/30 bg-gradient-to-r from-[#F8E9C4] to-[#FAF8F5] px-3 py-1.5 text-xs font-medium text-[#8b6f1f] shadow-sm">
              <Crown className="h-3.5 w-3.5" /> Premium
            </div>
            <Button asChild className="rounded-full bg-gradient-to-r from-[#8b6f1f] via-[#D4AF37] to-[#c39a2e] text-white shadow-[0_10px_30px_-10px_rgba(212,175,55,0.7)] hover:opacity-95">
              <Link to="/events/new"><Plus className="mr-1 h-4 w-4" /> Nouvel événement</Link>
            </Button>
          </div>
        </motion.header>

        {/* Hero countdown */}
        {nextEvent && (
          <Tilt className="mb-8">
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="relative overflow-hidden rounded-[28px] border border-white/60 bg-white/50 p-8 shadow-[0_30px_80px_-30px_rgba(139,111,31,0.35)] backdrop-blur-2xl"
            >
              <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-br from-[#D4AF37]/40 to-[#F9D8E5]/40 blur-3xl" />
              <div className="relative flex flex-wrap items-end justify-between gap-6">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-[#8b6f1f]/80">
                    <Sparkles className="h-3.5 w-3.5" /> Prochain événement
                  </div>
                  <h2 className="mt-2 font-display text-4xl font-semibold md:text-5xl">
                    {nextEvent.title}
                  </h2>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-neutral-600">
                    <span className="inline-flex items-center gap-1"><Calendar className="h-4 w-4" />
                      {nextEvent.event_date
                        ? new Date(nextEvent.event_date).toLocaleDateString("fr-FR", { dateStyle: "long" })
                        : "Date à définir"}
                    </span>
                    {nextEvent.location && (
                      <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> {nextEvent.location}</span>
                    )}
                  </div>
                </div>

                {countdown && (
                  <div className="flex gap-3">
                    {[
                      { l: "Jours", v: countdown.d },
                      { l: "Heures", v: countdown.h },
                      { l: "Min", v: countdown.m },
                      { l: "Sec", v: countdown.s },
                    ].map((c) => (
                      <div key={c.l} className="min-w-[72px] rounded-2xl border border-white/70 bg-white/70 px-4 py-3 text-center shadow-inner backdrop-blur-xl">
                        <div className="font-display text-3xl font-semibold tabular-nums text-[#1A1A1A]">
                          {String(c.v).padStart(2, "0")}
                        </div>
                        <div className="text-[10px] uppercase tracking-widest text-neutral-500">{c.l}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative mt-6 flex flex-wrap gap-2">
                <Button asChild variant="secondary" className="rounded-full bg-white/70 backdrop-blur-xl">
                  <Link to="/events/$id" params={{ id: nextEvent.id }}>
                    Ouvrir l'événement <ArrowUpRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="ghost" className="rounded-full">
                  <Link to="/scan"><QrCode className="mr-1 h-4 w-4" /> Scanner</Link>
                </Button>
              </div>
            </motion.section>
          </Tilt>
        )}

        {/* Stat cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.08 }}
            >
              <Tilt>
                <motion.div
                  whileHover={{ y: -4 }}
                  className="group relative overflow-hidden rounded-3xl border border-white/70 bg-white/55 p-5 shadow-[0_20px_60px_-25px_rgba(139,111,31,0.25)] backdrop-blur-2xl"
                >
                  <div className={`absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br ${s.tint} blur-2xl transition-opacity group-hover:opacity-100`} />
                  <div className="relative flex items-center justify-between">
                    <span className="text-xs uppercase tracking-[0.18em] text-neutral-500">{s.label}</span>
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#FAF8F5] to-[#F4EFEA] text-[#8b6f1f] shadow-sm ring-1 ring-white/70">
                      <s.icon className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="relative mt-4 font-display text-4xl font-semibold text-[#1A1A1A]">
                    <Counter value={s.value} />
                  </div>
                  <div className="relative mt-1 text-xs text-neutral-500">{s.hint}</div>
                  <motion.div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-6 -bottom-6 h-6 rounded-full bg-[#D4AF37]/20 blur-xl"
                    animate={{ opacity: [0.4, 0.7, 0.4] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  />
                </motion.div>
              </Tilt>
            </motion.div>
          ))}
        </div>

        {/* Charts row */}
        <div className="mb-8 grid gap-4 lg:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-2 rounded-3xl border border-white/70 bg-white/55 p-6 shadow-[0_20px_60px_-25px_rgba(139,111,31,0.2)] backdrop-blur-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Activité</div>
                <h3 className="font-display text-2xl font-semibold">Invitations sur 14 jours</h3>
              </div>
              <div className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                <TrendingUp className="h-3.5 w-3.5" /> Live
              </div>
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer>
                <AreaChart data={activity} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#D4AF37" stopOpacity={0.55} />
                      <stop offset="100%" stopColor="#D4AF37" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" stroke="#a3a3a3" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(255,255,255,0.9)", border: "1px solid rgba(212,175,55,0.3)",
                      borderRadius: 12, backdropFilter: "blur(10px)",
                    }}
                  />
                  <Area type="monotone" dataKey="invitations" stroke="#D4AF37" strokeWidth={2.5} fill="url(#gold)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.25 }}
            className="rounded-3xl border border-white/70 bg-white/55 p-6 shadow-[0_20px_60px_-25px_rgba(139,111,31,0.2)] backdrop-blur-2xl"
          >
            <div className="mb-2 text-xs uppercase tracking-[0.18em] text-neutral-500">RSVP</div>
            <h3 className="font-display text-2xl font-semibold">Répartition</h3>
            <div className="relative mx-auto mt-2 h-44">
              {rsvpData.length ? (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={rsvpData} innerRadius={48} outerRadius={72} paddingAngle={4} dataKey="value" stroke="none">
                      {rsvpData.map((d) => <Cell key={d.name} fill={d.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="grid h-full place-items-center text-sm text-neutral-400">Aucune donnée</div>
              )}
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <div className="text-center">
                  <div className="font-display text-2xl font-semibold"><Counter value={stats.confirmed} /></div>
                  <div className="text-[10px] uppercase tracking-widest text-neutral-500">confirmés</div>
                </div>
              </div>
            </div>
            <div className="mt-3 space-y-1.5 text-sm">
              {rsvpData.map((d) => (
                <div key={d.name} className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 text-neutral-600">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                    {d.name}
                  </span>
                  <span className="font-medium tabular-nums">{d.value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Events + Timeline */}
        <div className="grid gap-4 lg:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
            className="lg:col-span-2 rounded-3xl border border-white/70 bg-white/55 p-6 shadow-[0_20px_60px_-25px_rgba(139,111,31,0.2)] backdrop-blur-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-2xl font-semibold">Vos événements</h3>
              <Link to="/events" className="text-sm text-[#8b6f1f] hover:underline">Tout voir →</Link>
            </div>
            {events.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#D4AF37]/40 bg-[#F8E9C4]/30 p-10 text-center">
                <h4 className="font-display text-xl font-semibold">Créez votre premier événement ✨</h4>
                <p className="mt-2 text-sm text-neutral-500">Lancez vos invitations digitales en quelques minutes.</p>
                <Button asChild className="mt-4 rounded-full bg-gradient-to-r from-[#8b6f1f] to-[#D4AF37] text-white">
                  <Link to="/events/new">Commencer</Link>
                </Button>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {events.slice(0, 4).map((e, i) => (
                  <motion.div
                    key={e.id}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 + i * 0.06 }}
                  >
                    <Link
                      to="/events/$id" params={{ id: e.id }}
                      className="group block rounded-2xl border border-white/70 bg-gradient-to-br from-white/80 to-[#FAF8F5]/60 p-4 shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-[#D4AF37]/50 hover:shadow-[0_20px_40px_-20px_rgba(212,175,55,0.5)]"
                    >
                      <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-neutral-500">
                        <span>{e.type}</span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#D4AF37]/10 px-2 py-0.5 text-[#8b6f1f]">
                          {e.status}
                        </span>
                      </div>
                      <div className="mt-2 font-display text-xl font-semibold">{e.title}</div>
                      <div className="mt-1 text-xs text-neutral-500">
                        {e.event_date ? new Date(e.event_date).toLocaleDateString("fr-FR", { dateStyle: "long" }) : "Date à définir"}
                      </div>
                      <div className="mt-3 flex items-center justify-end text-[#8b6f1f] opacity-0 transition group-hover:opacity-100">
                        Ouvrir <ArrowUpRight className="ml-1 h-4 w-4" />
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.35 }}
            className="rounded-3xl border border-white/70 bg-white/55 p-6 shadow-[0_20px_60px_-25px_rgba(139,111,31,0.2)] backdrop-blur-2xl"
          >
            <h3 className="font-display text-2xl font-semibold">Timeline</h3>
            <div className="mt-4 relative pl-4">
              <div className="absolute left-[7px] top-1 bottom-1 w-px bg-gradient-to-b from-[#D4AF37]/60 via-[#D4AF37]/20 to-transparent" />
              {[
                { t: "Événement créé", icon: Sparkles, done: events.length > 0 },
                { t: "Invités ajoutés", icon: Users, done: stats.total > 0 },
                { t: "Invitations envoyées", icon: Mail, done: stats.total > 0 },
                { t: "Réponses RSVP", icon: CheckCircle2, done: stats.confirmed + stats.declined > 0 },
                { t: "Jour J", icon: Heart, done: false },
              ].map((s, i) => (
                <motion.div
                  key={s.t}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.08 }}
                  className="relative mb-4 flex items-start gap-3"
                >
                  <span
                    className={`grid h-4 w-4 shrink-0 place-items-center rounded-full ring-4 ring-white ${
                      s.done ? "bg-[#D4AF37]" : "bg-neutral-200"
                    }`}
                  >
                    {s.done && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-sm font-medium">
                      <s.icon className="h-3.5 w-3.5 text-[#8b6f1f]" /> {s.t}
                    </div>
                    <div className="text-xs text-neutral-500">{s.done ? "Terminé" : "À venir"}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
