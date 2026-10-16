import * as THREE from "three";
import type { EstablishmentFamily } from "@/core/game";
import type { BuiltSite } from "./establishments";

/**
 * L'ÉTABLISSEMENT SUR SA CASE : son illustration, dressée.
 *
 * Aucune décision ici (ADR 0059) : la case, la couleur, l'image et l'animation
 * viennent de `establishments.ts`, qui est pur et testé. Ce fichier ne fabrique
 * que de la géométrie.
 *
 * POURQUOI UN PANNEAU ILLUSTRÉ ET PAS UNE MAQUETTE ?
 *
 * Parce que la première version ÉTAIT une maquette — un volume par famille,
 * hôtel en tour, restaurant bas et large, musée à colonnes — et qu'à l'écran ça
 * ne marchait pas. Un établissement occupe une demi-case sur un téléphone, et le
 * plateau se regarde de haut : ce qu'on en voit, c'est une facette de quelques
 * dizaines de pixels. Toute la silhouette censée le rendre reconnaissable
 * disparaît, et il ne reste qu'une boîte colorée. Constaté à l'écran, pas
 * supposé.
 *
 * Or chaque établissement a DÉJÀ son illustration, son nom peint dessus, et le
 * plateau 2D s'en sert pour habiller la case (ADR 0050). La dresser sur sa case
 * donne quelque chose qui se reconnaît immédiatement et qui vient de la main de
 * l'auteur, pas d'un assemblage de cubes. Le socle, lui, porte la couleur du
 * propriétaire : c'est la seule information que l'illustration ne donne pas.
 *
 * Reste un volume sobre pour un établissement SANS illustration fournie : rien
 * n'est inventé, mais rien ne disparaît non plus.
 */

/** Hauteur du panneau dressé, en unités de case. */
const PANEL_HEIGHT = 1.5;
/** Hauteur du socle coloré sous le panneau. */
const BASE_HEIGHT = 0.1;
/** Emprise du socle sur la tuile, en unités de case. */
const FOOTPRINT = 0.56;
/**
 * Inclinaison du panneau vers l'arrière, depuis la verticale. La caméra regarde
 * de haut : un panneau strictement vertical se verrait par la tranche, un
 * panneau penché en arrière s'offre à elle.
 */
const LEAN_DEGREES = 36;

/** Hauteur de repli, par famille, quand aucune illustration n'est fournie. */
const FALLBACK_HEIGHTS: Readonly<Record<EstablishmentFamily, number>> = {
  maktaba: 0.62,
  madinah_hotel: 1.0,
  makkah_hotel: 1.25,
  maghreb_restaurant: 0.5,
  umrah_agency: 0.72,
  museum: 0.72,
  park: 0.62,
};

export interface EstablishmentModel {
  /** Un établissement neuf, posé au sol. Son socle porte la couleur du propriétaire. */
  instance(site: BuiltSite): THREE.Group;
  dispose(): void;
}

/**
 * Les illustrations sont chargées À LA DEMANDE et partagées : deux
 * établissements qui partagent une carte ne la téléchargent qu'une fois, et une
 * partie où personne n'achète rien n'en télécharge aucune.
 */
function textureCache() {
  const cache = new Map<string, THREE.Texture>();
  const loader = new THREE.TextureLoader();
  return {
    get(url: string, onLoad: () => void): THREE.Texture {
      const existing = cache.get(url);
      if (existing) return existing;
      const texture = loader.load(url, onLoad, undefined, () => undefined);
      texture.colorSpace = THREE.SRGBColorSpace;
      cache.set(url, texture);
      return texture;
    },
    dispose() {
      for (const texture of cache.values()) texture.dispose();
      cache.clear();
    },
  };
}

export function createEstablishmentModel(onArtLoaded: () => void): EstablishmentModel {
  const textures = textureCache();
  const materials: THREE.Material[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  const keep = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  // Le socle est le même pour tous : seul son matériau change de couleur.
  const baseGeometry = keep(new THREE.BoxGeometry(FOOTPRINT, BASE_HEIGHT, FOOTPRINT * 0.55));
  baseGeometry.translate(0, BASE_HEIGHT / 2, 0);

  return {
    instance(site) {
      const group = new THREE.Group();
      const material = new THREE.MeshStandardMaterial({ color: new THREE.Color(site.color), roughness: 0.45, metalness: 0.05 });
      materials.push(material);
      group.add(new THREE.Mesh(baseGeometry, material));

      if (site.art) {
        // Le panneau garde EXACTEMENT les proportions de l'illustration : une
        // carte étirée se voit immédiatement, et ce sont les dessins de l'auteur.
        const width = (PANEL_HEIGHT * site.artWidth) / site.artHeight;
        const panelGeometry = keep(new THREE.PlaneGeometry(width, PANEL_HEIGHT));
        panelGeometry.translate(0, PANEL_HEIGHT / 2, 0);
        const panelMaterial = new THREE.MeshStandardMaterial({
          map: textures.get(site.art, onArtLoaded),
          roughness: 0.6,
          metalness: 0,
          // Visible des deux côtés : le panneau ne doit pas disparaître selon
          // l'endroit du plateau où il se trouve.
          side: THREE.DoubleSide,
        });
        materials.push(panelMaterial);
        const panel = new THREE.Mesh(panelGeometry, panelMaterial);
        panel.position.y = BASE_HEIGHT;
        panel.rotation.x = -(LEAN_DEGREES * Math.PI) / 180;
        group.add(panel);
        return group;
      }

      const height = FALLBACK_HEIGHTS[site.family];
      const blockGeometry = keep(new THREE.BoxGeometry(FOOTPRINT * 0.8, height, FOOTPRINT * 0.6));
      blockGeometry.translate(0, BASE_HEIGHT + height / 2, 0);
      group.add(new THREE.Mesh(blockGeometry, material));
      return group;
    },
    dispose() {
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials) material.dispose();
      textures.dispose();
    },
  };
}

/** Hauteur visible d'un établissement, en unités de case : le panneau penché, ou le volume de repli. */
export const establishmentHeight = (site: Pick<BuiltSite, "art" | "family">): number =>
  site.art ? BASE_HEIGHT + PANEL_HEIGHT * Math.cos((LEAN_DEGREES * Math.PI) / 180) : BASE_HEIGHT + FALLBACK_HEIGHTS[site.family];

/** Emprise d'un établissement sur sa tuile, en unités de case. */
export const ESTABLISHMENT_FOOTPRINT = FOOTPRINT;
