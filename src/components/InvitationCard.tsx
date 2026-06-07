import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import type { Template } from "@/lib/invitation-templates";

export type InvitationData = {
  guestName: string;
  eventTitle: string;
  eventType: string;
  eventDate: string | null;
  eventLocation: string | null;
  eventDescription: string | null;
  customMessage: string | null;
  coverImageUrl: string | null;
  template: Template;
  inviteUrl: string;
};

function QR({ value, size = 140, color = "#000", bg = "#fff" }: { value: string; size?: number; color?: string; bg?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) {
      QRCode.toCanvas(ref.current, value, { width: size, margin: 1, color: { dark: color, light: bg } });
    }
  }, [value, size, color, bg]);
  return <canvas ref={ref} className="rounded-lg" />;
}

function formatDate(d: string | null) {
  if (!d) return "Date à venir";
  return new Date(d).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
function formatTime(d: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function InvitationCard({ data }: { data: InvitationData }) {
  switch (data.template) {
    case "traditionnel": return <Traditionnel data={data} />;
    case "moderne": return <Moderne data={data} />;
    case "luxe": return <Luxe data={data} />;
    case "minimaliste": return <Minimaliste data={data} />;
    case "gold_premium":
    default: return <GoldPremium data={data} />;
  }
}

/* ============ TEMPLATE: GOLD PREMIUM ============ */
function GoldPremium({ data }: { data: InvitationData }) {
  return (
    <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-3xl bg-black text-amber-50 shadow-2xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.2),transparent_60%)]" />
      {data.coverImageUrl && (
        <div className="relative h-48 overflow-hidden">
          <img src={data.coverImageUrl} className="h-full w-full object-cover opacity-80" alt="" />
          <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
        </div>
      )}
      <div className="relative p-8 text-center">
        <div className="mx-auto mb-4 h-px w-16 bg-amber-400" />
        <div className="font-display text-xs uppercase tracking-[0.4em] text-amber-400">{data.eventType}</div>
        <h1 className="font-display mt-4 text-4xl font-light italic leading-tight text-amber-300">{data.eventTitle}</h1>
        <div className="mx-auto my-5 h-px w-16 bg-amber-400" />
        <p className="text-sm text-amber-50/80">Cher(e)</p>
        <p className="font-display text-2xl italic text-amber-200">{data.guestName}</p>
        <p className="mt-4 text-sm leading-relaxed text-amber-50/80">
          {data.customMessage ?? "Nous serions honorés de votre présence à notre événement."}
        </p>
        <div className="mt-6 space-y-1 text-sm">
          <p className="font-display text-lg text-amber-300">{formatDate(data.eventDate)}</p>
          {data.eventDate && <p className="text-xs uppercase tracking-widest text-amber-50/60">à {formatTime(data.eventDate)}</p>}
          {data.eventLocation && <p className="mt-2 text-amber-50/80">📍 {data.eventLocation}</p>}
        </div>
        <div className="mt-8 flex flex-col items-center gap-2">
          <QR value={data.inviteUrl} color="#1a1a1a" bg="#fde68a" />
          <p className="text-[10px] uppercase tracking-widest text-amber-50/60">Votre invitation personnelle</p>
        </div>
      </div>
    </div>
  );
}

/* ============ TEMPLATE: TRADITIONNEL ============ */
function Traditionnel({ data }: { data: InvitationData }) {
  return (
    <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-3xl shadow-2xl" style={{ background: "linear-gradient(135deg, #c44a1a, #8b3a1c)" }}>
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "repeating-linear-gradient(45deg, #fff 0 6px, transparent 6px 12px)" }} />
      {data.coverImageUrl && (
        <div className="relative h-48 overflow-hidden">
          <img src={data.coverImageUrl} className="h-full w-full object-cover" alt="" />
        </div>
      )}
      <div className="relative p-8 text-center text-amber-50">
        <div className="font-display text-xs uppercase tracking-[0.3em] text-yellow-200">{data.eventType}</div>
        <h1 className="font-display mt-3 text-3xl font-semibold leading-tight">{data.eventTitle}</h1>
        <div className="mx-auto my-4 h-1 w-16 rounded-full bg-yellow-300" />
        <p className="text-sm">Bienvenue cher invité</p>
        <p className="font-display mt-1 text-2xl font-semibold text-yellow-100">{data.guestName}</p>
        <p className="mt-3 text-sm leading-relaxed text-amber-50/90">
          {data.customMessage ?? "Nanga def ! Joignez-vous à nous pour partager ce moment unique."}
        </p>
        <div className="mt-5 rounded-2xl bg-black/20 p-4 backdrop-blur">
          <p className="font-display text-lg text-yellow-100">{formatDate(data.eventDate)}</p>
          {data.eventDate && <p className="text-xs text-amber-50/80">à {formatTime(data.eventDate)}</p>}
          {data.eventLocation && <p className="mt-1 text-sm">📍 {data.eventLocation}</p>}
        </div>
        <div className="mt-6 flex flex-col items-center gap-2">
          <QR value={data.inviteUrl} color="#8b3a1c" bg="#fef3c7" />
          <p className="text-[10px] uppercase tracking-widest text-amber-50/70">Scannez à l'entrée</p>
        </div>
      </div>
    </div>
  );
}

/* ============ TEMPLATE: MODERNE ============ */
function Moderne({ data }: { data: InvitationData }) {
  return (
    <div className="mx-auto w-full max-w-md overflow-hidden rounded-3xl bg-stone-50 text-stone-900 shadow-2xl">
      {data.coverImageUrl && (
        <div className="h-56 overflow-hidden">
          <img src={data.coverImageUrl} className="h-full w-full object-cover" alt="" />
        </div>
      )}
      <div className="p-8 text-center">
        <div className="text-xs uppercase tracking-[0.4em] text-stone-500">{data.eventType}</div>
        <h1 className="font-display mt-4 text-4xl font-light leading-tight text-stone-900">{data.eventTitle}</h1>
        <div className="mx-auto my-5 h-px w-12 bg-stone-400" />
        <p className="text-xs uppercase tracking-widest text-stone-500">Invité</p>
        <p className="font-display mt-1 text-xl italic">{data.guestName}</p>
        <p className="mt-4 text-sm leading-relaxed text-stone-600">
          {data.customMessage ?? "Votre présence rendra ce moment inoubliable."}
        </p>
        <div className="mt-6 grid grid-cols-2 gap-4 text-left">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-stone-500">Date</p>
            <p className="mt-1 text-sm font-medium">{formatDate(data.eventDate)}</p>
            {data.eventDate && <p className="text-xs text-stone-500">{formatTime(data.eventDate)}</p>}
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-stone-500">Lieu</p>
            <p className="mt-1 text-sm font-medium">{data.eventLocation ?? "À venir"}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-col items-center gap-2 border-t border-stone-200 pt-6">
          <QR value={data.inviteUrl} />
          <p className="text-[10px] uppercase tracking-widest text-stone-500">Votre QR code</p>
        </div>
      </div>
    </div>
  );
}

/* ============ TEMPLATE: LUXE ============ */
function Luxe({ data }: { data: InvitationData }) {
  return (
    <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-3xl text-slate-100 shadow-2xl" style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)" }}>
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #c9a84c 1px, transparent 0)", backgroundSize: "20px 20px" }} />
      {data.coverImageUrl && (
        <div className="relative h-44 overflow-hidden">
          <img src={data.coverImageUrl} className="h-full w-full object-cover opacity-70" alt="" />
        </div>
      )}
      <div className="relative p-8 text-center">
        <div className="mx-auto mb-3 flex items-center justify-center gap-2">
          <span className="h-px w-8 bg-[#c9a84c]" />
          <span className="text-[10px] uppercase tracking-[0.4em] text-[#c9a84c]">{data.eventType}</span>
          <span className="h-px w-8 bg-[#c9a84c]" />
        </div>
        <h1 className="font-display text-4xl font-light leading-tight text-[#c9a84c]">{data.eventTitle}</h1>
        <p className="mt-6 text-xs uppercase tracking-widest text-slate-300">L'honneur de la présence de</p>
        <p className="font-display mt-2 text-2xl italic text-white">{data.guestName}</p>
        <p className="mt-4 text-sm leading-relaxed text-slate-300">
          {data.customMessage ?? "Est sollicité à cette cérémonie d'exception."}
        </p>
        <div className="mt-6 border-y border-[#c9a84c]/30 py-4">
          <p className="font-display text-lg text-[#c9a84c]">{formatDate(data.eventDate)}</p>
          {data.eventDate && <p className="text-xs uppercase tracking-widest text-slate-300">à {formatTime(data.eventDate)}</p>}
          {data.eventLocation && <p className="mt-1 text-sm text-slate-200">{data.eventLocation}</p>}
        </div>
        <div className="mt-6 flex flex-col items-center gap-2">
          <QR value={data.inviteUrl} color="#16213e" bg="#c9a84c" />
        </div>
      </div>
    </div>
  );
}

/* ============ TEMPLATE: MINIMALISTE ============ */
function Minimaliste({ data }: { data: InvitationData }) {
  return (
    <div className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-neutral-200 bg-white text-neutral-900 shadow-xl">
      {data.coverImageUrl && (
        <div className="aspect-[4/3] overflow-hidden">
          <img src={data.coverImageUrl} className="h-full w-full object-cover grayscale" alt="" />
        </div>
      )}
      <div className="p-10 text-center">
        <p className="text-[10px] uppercase tracking-[0.5em] text-neutral-400">{data.eventType}</p>
        <h1 className="mt-6 text-2xl font-light leading-snug">{data.eventTitle}</h1>
        <div className="mx-auto my-6 h-px w-10 bg-neutral-300" />
        <p className="text-xs text-neutral-500">Invité</p>
        <p className="mt-1 text-lg font-medium">{data.guestName}</p>
        {data.customMessage && <p className="mt-4 text-sm text-neutral-600">{data.customMessage}</p>}
        <div className="mt-8 space-y-1">
          <p className="text-sm font-medium">{formatDate(data.eventDate)}</p>
          {data.eventDate && <p className="text-xs text-neutral-500">{formatTime(data.eventDate)}</p>}
          {data.eventLocation && <p className="mt-2 text-xs text-neutral-500">{data.eventLocation}</p>}
        </div>
        <div className="mt-8 flex flex-col items-center gap-2">
          <QR value={data.inviteUrl} />
        </div>
      </div>
    </div>
  );
}
