import * as THREE from "three";

/**
 * LE PION EN OBJETS 3D.
 *
 * Aucune décision ici (ADR 0059) : les positions viennent de `boardGeometry`,
 * le mouvement de `pawnMotion`, la couleur de `pieceForSeat`. Ce fichier ne
 * fabrique que de la géométrie.
 *
 * POURQUOI UNE FORME DESSINÉE ICI, ET PAS LE MODÈLE `pion-fille.glb` ?
 * Parce que ce fichier ne contient QUE des positions : ni normales, ni
 * coordonnées de texture, ni couleur, ni matériau. Recoloré en aplat et vu à la
 * taille d'une case sur un téléphone, il ne donne pas un personnage mais une
 * silhouette informe — et aucun réglage d'éclairage n'y change quoi que ce soit,
 * puisqu'il n'y a rien à éclairer. Un pion de jeu de plateau, lui, se reconnaît
 * instantanément à cette taille, coûte quelques centaines de triangles au lieu
 * de treize mille, et porte la couleur du joueur sans ambiguïté. C'est le visuel
 * PROVISOIRE, et il est fait pour être remplacé : l'emplacement d'un modèle par
 * pion arrive avec le manifeste des illustrations, à l'étape 7.
 *
 * La géométrie est construite UNE fois et partagée par tous les pions : elle ne
 * change pas d'un joueur à l'autre. Seul le matériau est propre à chacun,
 * puisque c'est lui qui porte la couleur.
 */

/**
 * Profil du pion, en fractions de sa hauteur totale : socle large, taille fine,
 * épaule, puis col. La tête est une sphère posée au-dessus.
 */
const PROFIL: readonly (readonly [number, number])[] = [
  [0.0, 0.0],
  [0.3, 0.0],
  [0.3, 0.045],
  [0.255, 0.08],
  [0.135, 0.15],
  [0.115, 0.3],
  [0.165, 0.46],
  [0.185, 0.55],
  [0.14, 0.62],
  [0.095, 0.655],
  [0.0, 0.665],
];

const SEGMENTS = 24;
const TETE_RAYON = 0.165;
const TETE_CENTRE = 0.8;

export interface PawnModel {
  /** Un pion neuf, à la couleur donnée : debout, les pieds à l'origine, une unité de haut. */
  instance(color: string): THREE.Group;
  dispose(): void;
}

export function createPawnModel(): PawnModel {
  const corps = new THREE.LatheGeometry(
    PROFIL.map(([x, y]) => new THREE.Vector2(x, y)),
    SEGMENTS,
  );
  const tete = new THREE.SphereGeometry(TETE_RAYON, SEGMENTS, Math.round(SEGMENTS / 2));
  tete.translate(0, TETE_CENTRE, 0);
  const materials: THREE.Material[] = [];

  return {
    instance(color) {
      const material = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.42, metalness: 0.04 });
      materials.push(material);
      const group = new THREE.Group();
      group.add(new THREE.Mesh(corps, material));
      group.add(new THREE.Mesh(tete, material));
      return group;
    },
    dispose() {
      corps.dispose();
      tete.dispose();
      for (const material of materials) material.dispose();
    },
  };
}
