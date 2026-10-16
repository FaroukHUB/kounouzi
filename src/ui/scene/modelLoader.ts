import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/**
 * LE CHARGEUR DE MODÈLES FOURNIS.
 *
 * Il normalise ce qui arrive pour que la scène n'ait pas à s'en soucier :
 * origine ramenée AUX PIEDS et hauteur ramenée à 1, afin qu'une mise à
 * l'échelle par la scène soit une simple hauteur en unités de case. Un modèle
 * exporté centré sur son milieu s'enfoncerait sinon à mi-corps dans le plateau.
 *
 * CE QUI MANQUE EST COMPLÉTÉ, PAS DEVINÉ. Un modèle sans normales est éclairé à
 * plat et paraît sale : on les recalcule. Mais un modèle sans texture ni
 * matériau reste ce qu'il est — un volume uni — et aucun code ne peut inventer
 * son habillage.
 *
 * RIEN N'EST BLOQUANT. Le chargement est asynchrone, le jeu tourne pendant ce
 * temps avec son visuel provisoire, et un fichier absent ou illisible le laisse
 * en place : une partie ne s'arrête jamais parce qu'un modèle manque.
 */

export interface LoadedModel {
  /** Un exemplaire neuf, debout, les pieds à l'origine et d'une unité de haut. */
  instance(color: string | null): THREE.Group;
  dispose(): void;
}

function normalise(scene: THREE.Group): THREE.Group {
  let sansNormales = false;
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (!mesh.geometry.getAttribute("normal")) {
      mesh.geometry.computeVertexNormals();
      sansNormales = true;
    }
  });
  if (sansNormales && typeof console !== "undefined") {
    // Dit une fois, pour que l'auteur sache que son export est incomplet.
    console.info("Kounouzi : modèle sans normales, éclairage recalculé — l'export gagnerait à les inclure.");
  }
  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const height = size.y === 0 ? 1 : size.y;
  scene.position.set(-center.x, -(center.y - size.y / 2), -center.z).multiplyScalar(1 / height);
  scene.scale.setScalar(1 / height);
  return scene;
}

/**
 * Charge un modèle une seule fois et le prête en exemplaires.
 *
 * La géométrie est PARTAGÉE entre les exemplaires — elle ne change pas d'un
 * joueur à l'autre. Seul le matériau est propre à chacun quand il faut le
 * teinter ; sans teinte, le matériau d'origine est gardé tel quel, pour ne pas
 * écraser l'habillage de l'auteur.
 */
export async function loadModel(url: string): Promise<LoadedModel> {
  const gltf = await new GLTFLoader().loadAsync(url);
  const base = normalise(gltf.scene);
  const materials: THREE.Material[] = [];
  const geometries = new Set<THREE.BufferGeometry>();
  base.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) geometries.add(mesh.geometry);
  });

  return {
    instance(color) {
      const clone = base.clone(true);
      if (color !== null) {
        clone.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (!mesh.isMesh) return;
          const material = (mesh.material as THREE.MeshStandardMaterial).clone();
          material.color = new THREE.Color(color);
          mesh.material = material;
          materials.push(material);
        });
      }
      const group = new THREE.Group();
      group.add(clone);
      return group;
    },
    dispose() {
      for (const material of materials) material.dispose();
      for (const geometry of geometries) geometry.dispose();
    },
  };
}

/** Compte les triangles d'un modèle : sert à vérifier qu'un fichier tient dans le budget d'un téléphone. */
export function triangleCount(object: THREE.Object3D): number {
  let total = 0;
  object.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const index = mesh.geometry.getIndex();
    const position = mesh.geometry.getAttribute("position");
    total += index ? index.count / 3 : position ? position.count / 3 : 0;
  });
  return Math.round(total);
}
