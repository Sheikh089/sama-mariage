import type { Database } from "@/integrations/supabase/types";

export type Template = Database["public"]["Enums"]["invitation_template"];

export const TEMPLATES: { id: Template; name: string; description: string; preview: string }[] = [
  { id: "gold_premium", name: "Gold Premium", description: "Or & noir, élégance suprême", preview: "linear-gradient(135deg, #0a0a0a, #1a1a1a 50%, #2a2010)" },
  { id: "traditionnel", name: "Traditionnel Sénégalais", description: "Motifs wax & couleurs chaudes", preview: "linear-gradient(135deg, #c44a1a, #8b3a1c, #d97324)" },
  { id: "moderne", name: "Moderne", description: "Lignes pures & couleurs douces", preview: "linear-gradient(135deg, #f5f3ee, #e8e4dd, #d4d0c8)" },
  { id: "luxe", name: "Luxe", description: "Marbre & dorures fines", preview: "linear-gradient(135deg, #1a1a2e, #16213e, #c9a84c)" },
  { id: "minimaliste", name: "Minimaliste", description: "Blanc, noir, typographie soignée", preview: "linear-gradient(135deg, #ffffff, #f8f8f8, #e0e0e0)" },
];

export const TEMPLATE_LABEL: Record<Template, string> = Object.fromEntries(
  TEMPLATES.map((t) => [t.id, t.name]),
) as Record<Template, string>;
