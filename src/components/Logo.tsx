import logoAsset from "@/assets/sama-logo.asset.json";

export function Logo({ className = "h-12 w-12" }: { className?: string }) {
  return <img src={logoAsset.url} alt="Sama Mariage" className={className} />;
}

export function LogoWithText({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Logo className="h-10 w-10 object-contain" />
      <div className="leading-none">
        <div className="font-display text-xl font-semibold tracking-wide text-gradient-gold">
          SAMA MARIAGE
        </div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Votre mariage, notre passion
        </div>
      </div>
    </div>
  );
}
