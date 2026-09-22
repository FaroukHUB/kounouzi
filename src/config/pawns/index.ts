/**
 * ESSAI de pions 3D (ADR à écrire si la piste est retenue).
 *
 * `false` par défaut : le jeu sert les pions 2D existants et rien ne change
 * pour les joueurs. Passer à `true` — ou définir `NEXT_PUBLIC_PIONS_3D=1` —
 * remplace UNIQUEMENT la couche des pions par des modèles 3D posés aux mêmes
 * coordonnées. Le plateau, les cases, les cartes et le moteur sont
 * identiques dans les deux cas.
 */
export const PAWNS_3D_ENABLED: boolean = process.env["NEXT_PUBLIC_PIONS_3D"] === "1";
