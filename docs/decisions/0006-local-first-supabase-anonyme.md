# 0006 — Local-first, session Supabase anonyme dès la V1

**Statut** : acceptée (Phase 0)

## Contexte
La Row Level Security exige une identité ; un prototype « sans
authentification » rendrait la RLS impossible à ajouter proprement ensuite.
Le gameplay ne doit jamais attendre le réseau.

## Décision
- IndexedDB est la source de vérité pendant la partie (Phase 3).
- Une session Supabase anonyme est créée silencieusement au premier lancement
  (Phase 6) : aucun écran, aucune donnée demandée, mais un `auth.uid()` existe
  et la RLS fonctionne dès le premier jour. Un email pourra être rattaché plus
  tard sans migration.
- Synchronisation en arrière-plan, jamais bloquante.

## Conséquences
- Toute table de données familiales porte `family_id` (dénormalisation
  volontaire pour des politiques RLS simples et indexables).
- Le serveur ne sert qu'au contenu, à la synchronisation et au back-office ;
  le jeu reste 100 % client (compatible export statique).
