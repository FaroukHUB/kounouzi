import type { NextConfig } from "next";

/**
 * QUELLE VERSION EST EN LIGNE ? Sans réponse à cette question, on corrige à
 * l'aveugle : un correctif poussé mais non déployé se diagnostique exactement
 * comme un correctif qui ne marche pas. C'est arrivé — plusieurs échanges à
 * chercher une cause dans le code alors que le navigateur servait un build
 * antérieur au correctif.
 *
 * Vercel fournit l'empreinte du commit déployé (`VERCEL_GIT_COMMIT_SHA`, une
 * variable SYSTÈME, à condition que « Enable access to System Environment
 * Variables » soit coché). On la fige ici au build pour pouvoir l'afficher.
 * En local elle est absente : le marqueur vaut alors « local ».
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_BUILD: (process.env["VERCEL_GIT_COMMIT_SHA"] ?? "local").slice(0, 7),
  },
};

export default nextConfig;
