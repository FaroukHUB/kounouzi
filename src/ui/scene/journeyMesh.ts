import * as THREE from "three";

/**
 * LES MARQUEURS DU CHEMIN.
 *
 * Aucune décision ici (ADR 0059) : les cases, l'ordre et les instants viennent
 * de `journeyReveal.ts`, qui est pur et testé. Ce fichier ne fabrique que de la
 * géométrie.
 *
 * Un anneau de lumière posé sur la case, et au-dessus une colonne très douce.
 * L'anneau est ce qui se lit d'en haut — c'est la surface que la caméra voit le
 * mieux — et la colonne donne la hauteur qui attire l'œil sans masquer le
 * plateau. Les deux sont en ADDITIF : ils éclairent l'illustration au lieu de la
 * recouvrir, ce qui compte quand le dessous est un dessin et pas un aplat.
 */

export interface JourneyMarkerModel {
  /** Un marqueur neuf, à la couleur du joueur. Posé à plat, prêt à être mis à l'échelle. */
  instance(color: string): THREE.Group;
  dispose(): void;
}

/** Rayon de l'anneau, en unités de case. */
const RING_RADIUS = 0.34;
const RING_THICKNESS = 0.07;
/** Hauteur de la colonne de lumière, en unités de case. */
const BEAM_HEIGHT = 0.55;

export function createJourneyMarkerModel(): JourneyMarkerModel {
  const ring = new THREE.RingGeometry(RING_RADIUS - RING_THICKNESS, RING_RADIUS, 28);
  ring.rotateX(-Math.PI / 2);
  const beam = new THREE.CylinderGeometry(RING_RADIUS * 0.72, RING_RADIUS * 0.88, BEAM_HEIGHT, 20, 1, true);
  beam.translate(0, BEAM_HEIGHT / 2, 0);
  const materials: THREE.Material[] = [];

  return {
    instance(color) {
      const tint = new THREE.Color(color);
      const ringMaterial = new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      const beamMaterial = new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      materials.push(ringMaterial, beamMaterial);
      const group = new THREE.Group();
      group.add(new THREE.Mesh(ring, ringMaterial));
      group.add(new THREE.Mesh(beam, beamMaterial));
      return group;
    },
    dispose() {
      ring.dispose();
      beam.dispose();
      for (const material of materials) material.dispose();
    },
  };
}
