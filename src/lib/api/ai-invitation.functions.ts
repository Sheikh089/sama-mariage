import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  eventTitle: z.string().min(1).max(200),
  eventType: z.string().min(1).max(100),
  eventDate: z.string().max(100).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  tone: z.enum(["romantique", "professionnel", "chaleureux", "elegant"]).default("elegant"),
  extra: z.string().max(500).optional().nullable(),
});

export const generateInvitationMessage = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY manquant");

    const toneLabel: Record<string, string> = {
      romantique: "romantique et poétique",
      professionnel: "professionnel et élégant",
      chaleureux: "chaleureux et convivial",
      elegant: "raffiné, élégant et professionnel",
    };

    const system = `Tu es un rédacteur d'invitations en français. Rédige un message d'invitation court (4 à 7 lignes), au ton ${toneLabel[data.tone]}, prêt à être envoyé par WhatsApp/SMS/Email.

RÈGLES IMPÉRATIVES :
- Utilise EXACTEMENT ces variables littérales (avec accolades) : {name}, {event}, {date}, {location}, {link}.
- Commence par "Bonjour {name},".
- Mentionne {event} et {date}{location}.
- Termine par une ligne contenant le lien : "Voici votre invitation : {link}".
- Pas d'emojis, pas de markdown, pas de guillemets autour du message.
- Ne remplace JAMAIS les variables par des valeurs réelles.
- Réponds uniquement avec le message final, sans préambule.`;

    const user = `Type d'événement : ${data.eventType}
Titre : ${data.eventTitle}
${data.eventDate ? `Date : ${data.eventDate}` : ""}
${data.location ? `Lieu : ${data.location}` : ""}
${data.extra ? `Détails additionnels : ${data.extra}` : ""}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "vercel-ai-sdk",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (res.status === 429) throw new Error("Trop de requêtes IA. Réessayez dans un instant.");
    if (res.status === 402) throw new Error("Crédits IA épuisés. Ajoutez des crédits.");
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`Erreur IA (${res.status}): ${t.slice(0, 200)}`);
    }

    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const message = json.choices?.[0]?.message?.content?.trim();
    if (!message) throw new Error("Réponse IA vide");
    return { message };
  });
