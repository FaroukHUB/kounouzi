import { VOICE_CONFIG } from "@/config/narration";
import { handleVoiceRequest } from "@/experience/narration/voiceRoute";

/**
 * Voix en ligne Kounouzi (ADR 0036) : GET /api/voix?lang=fr&text=… → audio/mpeg.
 * La clé reste côté serveur (variables d'environnement Vercel). Jamais appelée
 * par le moteur ; si elle manque, le jeu continue avec la voix de l'appareil.
 */
export const dynamic = "force-dynamic";

export function GET(request: Request): Promise<Response> {
  return handleVoiceRequest(request, { env: process.env, fetch, maxTextLength: VOICE_CONFIG.maxTextLength, languages: VOICE_CONFIG.languages });
}
