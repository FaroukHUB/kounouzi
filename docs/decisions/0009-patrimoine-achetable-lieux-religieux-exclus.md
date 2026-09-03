# 0009 — Monuments patrimoniaux achetables, lieux religieux jamais

**Statut** : acceptée (Phase 0)

## Contexte
Le pilier GÉRER repose sur l'acquisition fictive de monuments (Casbah d'Alger,
Maqam Echahid, Alhambra, palais, citadelles…). Les mosquées et lieux religieux
apparaissent comme contenu historique, géographique, architectural ou
pédagogique, jamais comme biens.

## Décision
- `heritage_sites.kind ∈ { purchasable_monument, religious_place,
  educational_site, city, country, event, other }`.
- Contrainte SQL : `base_price` non nul **si et seulement si** `kind =
  'purchasable_monument'`.
- Mécanique V1 : prix, décision d'achat, débit, entrée au patrimoine, valeur
  patrimoniale comptée dans le résultat final. Pas de revenu passif en V1 ;
  revenus, améliorations, bonus et interactions restent ajoutables par
  configuration.

## Conséquences
- La règle « pas de mosquée achetable » est impossible à violer par une erreur
  de saisie.
