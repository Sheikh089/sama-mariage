import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { LogoWithText, Logo } from "@/components/Logo";
import {
  Sparkles,
  QrCode,
  Users,
  Send,
  Smartphone,
  ShieldCheck,
  Check,
  Heart,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sama Mariage — Invitations de mariage numériques au Sénégal" },
      {
        name: "description",
        content:
          "Créez et gérez vos invitations de mariage numériques avec QR Code, RSVP et contrôle d'entrée. Élégance, simplicité, premium.",
      },
      { property: "og:title", content: "Sama Mariage" },
      { property: "og:description", content: "Invitations de mariage numériques premium." },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Sparkles, title: "Cartes élégantes", text: "5 modèles premium : Traditionnel sénégalais, Moderne, Luxe, Minimaliste, Gold." },
  { icon: Users, title: "Gestion d'invités", text: "Ajout manuel ou import Excel/CSV. Suivi en temps réel." },
  { icon: QrCode, title: "QR Code unique", text: "Chaque invité reçoit un QR sécurisé personnalisé." },
  { icon: Send, title: "Envoi automatique", text: "WhatsApp, SMS et Email en un clic." },
  { icon: ShieldCheck, title: "Contrôle à l'entrée", text: "Scanner mobile : validez vos invités sans doublons." },
  { icon: Smartphone, title: "PWA mobile", text: "Installable sur Android, iPhone et tablette." },
];

const plans = [
  { name: "Gratuit", price: "0", suffix: "FCFA", features: ["50 invités", "1 événement", "Modèles de base"], cta: "Commencer", highlight: false },
  { name: "Standard", price: "15 000", suffix: "FCFA / évt", features: ["500 invités", "Invitations illimitées", "Tous les modèles", "Statistiques avancées"], cta: "Choisir Standard", highlight: true },
  { name: "Premium", price: "35 000", suffix: "FCFA / évt", features: ["Invités illimités", "WhatsApp automatique", "SMS automatique", "Domaine personnalisé"], cta: "Choisir Premium", highlight: false },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <LogoWithText />
          <nav className="hidden items-center gap-8 text-sm md:flex">
            <a href="#features" className="text-muted-foreground hover:text-foreground">Fonctionnalités</a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground">Tarifs</a>
            <Link to="/auth" className="text-muted-foreground hover:text-foreground">Connexion</Link>
          </nav>
          <Link to="/auth">
            <Button className="bg-gradient-gold text-primary-foreground hover:opacity-90">
              Créer mon invitation
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden px-6 py-24 md:py-32">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.15),transparent_60%)]" />
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/5 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-gold-dark">
            <Heart className="h-3 w-3" /> Made in Senegal
          </div>
          <h1 className="font-display text-5xl font-semibold leading-tight tracking-tight md:text-7xl">
            Vos invitations de mariage,{" "}
            <span className="text-gradient-gold italic">à la hauteur</span>{" "}
            du grand jour.
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-lg text-muted-foreground">
            Sama Mariage est la plateforme premium pour créer, envoyer et gérer vos invitations
            numériques avec QR Code, RSVP et contrôle d'entrée.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/auth">
              <Button size="lg" className="bg-gradient-gold text-primary-foreground hover:opacity-90">
                Démarrer gratuitement
              </Button>
            </Link>
            <a href="#features">
              <Button size="lg" variant="outline" className="border-gold/40">
                Voir les fonctionnalités
              </Button>
            </a>
          </div>
          <div className="mt-16 flex justify-center">
            <div className="rounded-3xl border border-gold/20 bg-card p-8 shadow-2xl shadow-gold/10">
              <Logo className="h-48 w-48 object-contain" />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border/60 px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <div className="text-xs uppercase tracking-[0.3em] text-gold-dark">Fonctionnalités</div>
            <h2 className="mt-3 font-display text-4xl font-semibold md:text-5xl">
              Tout ce qu'il faut pour un mariage <span className="italic text-gradient-gold">inoubliable</span>
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-border bg-card p-8 transition hover:border-gold/40 hover:shadow-lg hover:shadow-gold/5"
              >
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-gold text-primary-foreground">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 font-display text-xl font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-border/60 bg-secondary/30 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <div className="text-xs uppercase tracking-[0.3em] text-gold-dark">Tarifs</div>
            <h2 className="mt-3 font-display text-4xl font-semibold md:text-5xl">
              Choisissez votre <span className="italic text-gradient-gold">formule</span>
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((p) => (
              <div
                key={p.name}
                className={`relative rounded-2xl border bg-card p-8 ${
                  p.highlight ? "border-gold shadow-xl shadow-gold/20 md:scale-105" : "border-border"
                }`}
              >
                {p.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-gold px-3 py-1 text-[10px] uppercase tracking-wider text-primary-foreground">
                    Populaire
                  </div>
                )}
                <h3 className="font-display text-2xl font-semibold">{p.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-display text-5xl font-semibold text-gradient-gold">{p.price}</span>
                  <span className="text-sm text-muted-foreground">{p.suffix}</span>
                </div>
                <ul className="mt-8 space-y-3 text-sm">
                  {p.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-gold" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/auth" className="mt-8 block">
                  <Button
                    className={`w-full ${p.highlight ? "bg-gradient-gold text-primary-foreground" : ""}`}
                    variant={p.highlight ? "default" : "outline"}
                  >
                    {p.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/60 px-6 py-24">
        <div className="mx-auto max-w-3xl rounded-3xl bg-gradient-gold p-12 text-center text-primary-foreground">
          <h2 className="font-display text-4xl font-semibold md:text-5xl">
            Prêt à créer votre invitation ?
          </h2>
          <p className="mt-4 opacity-90">Commencez gratuitement, sans carte bancaire.</p>
          <Link to="/auth" className="mt-8 inline-block">
            <Button size="lg" variant="secondary" className="bg-background text-foreground hover:bg-background/90">
              Créer mon compte
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 px-6 py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 md:flex-row">
          <LogoWithText />
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Sama Mariage. Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  );
}
