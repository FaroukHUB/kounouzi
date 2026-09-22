"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { avatarById } from "@/config/avatars";
import type { PawnLayerProps } from "./PawnLayer";
import { cellCenterPercent, clusterOffset, gridDims } from "./layout";

/** Modèle servi depuis `public` : un seul fichier, recoloré par joueur. */
const MODEL_URL = "/kounouzi/models/pion-fille.glb";
/** Hauteur d'un pion en fraction de la hauteur d'une case. */
const PAWN_HEIGHT = 1.15;

/** Pilotage de la scène, exposé par l'effet de montage : aucune ref n'est mutée de l'extérieur. */
interface SceneApi {
  update(props: PawnLayerProps): void;
}

/**
 * ESSAI — pions 3D superposés au plateau 2D existant.
 *
 * Une seule toile WebGL couvre exactement la zone des pions, et les modèles
 * sont posés aux coordonnées que `layout.ts` calcule déjà pour les pions 2D :
 * le plateau, les cases et l'interface ne changent pas d'un pixel. Le moteur
 * ignore tout de cette couche ; elle ne fait que lire `visuals`, comme
 * `PawnLayer`.
 */
export function PawnLayer3D(props: PawnLayerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [api, setApi] = useState<SceneApi | null>(null);
  const { cellCount } = props;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearAlpha(0);
    host.appendChild(renderer.domElement);
    Object.assign(renderer.domElement.style, { position: "absolute", inset: "0", width: "100%", height: "100%" });

    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xfff6e5, 0x8a7a5c, 2.3));
    const sun = new THREE.DirectionalLight(0xffffff, 1.5);
    sun.position.set(2, 4, 3);
    scene.add(sun);
    // Repère en PIXELS de la couche, origine en haut à gauche, y vers le bas : identique au DOM.
    const camera = new THREE.OrthographicCamera(0, 1, 0, 1, 0.1, 4000);
    camera.position.set(0, 0, 1000);

    // État mutable local à l'effet (jamais une ref mutée de l'extérieur).
    const pawns = new Map<string, { group: THREE.Group; target: THREE.Vector2; scale: number }>();
    let latest: PawnLayerProps | null = null;
    let frame = 0;

    const place = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (w === 0 || h === 0 || latest === null) return;
      const { cols, rows } = gridDims(latest.cellCount);
      const byCell = new Map<number, string[]>();
      for (const p of latest.players) {
        const pos = latest.visuals[p.id] ?? p.position;
        byCell.set(pos, [...(byCell.get(pos) ?? []), p.id]);
      }
      for (const player of latest.players) {
        const pawn = pawns.get(player.id);
        if (!pawn) continue;
        const pos = latest.visuals[player.id] ?? player.position;
        const cluster = byCell.get(pos) ?? [player.id];
        const { x, y } = cellCenterPercent(pos, latest.cellCount);
        const { dx, dy } = clusterOffset(cluster.indexOf(player.id), cluster.length);
        pawn.target.set((x / 100) * w + (dx * w) / cols, (y / 100) * h + (dy * h) / rows);
        pawn.scale = (h / rows) * PAWN_HEIGHT * (player.id === latest.activePlayerId ? 1.12 : 1);
      }
    };

    const resize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      camera.left = 0;
      camera.right = w;
      camera.top = 0;
      camera.bottom = h;
      camera.updateProjectionMatrix();
      place();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    const tick = () => {
      frame = requestAnimationFrame(tick);
      // Glissement amorti vers la case cible : même sensation que la transition 2D.
      const stepMs = latest?.stepMs ?? 300;
      const k = Math.min(1, stepMs > 0 ? 50 / stepMs : 1);
      for (const pawn of pawns.values()) {
        pawn.group.position.x += (pawn.target.x - pawn.group.position.x) * k;
        pawn.group.position.y += (pawn.target.y - pawn.group.position.y) * k;
        const s = pawn.group.scale.x;
        pawn.group.scale.setScalar(s + (pawn.scale - s) * 0.2);
      }
      renderer.render(scene, camera);
    };
    tick();

    new GLTFLoader().load(MODEL_URL, (gltf) => {
      const model = gltf.scene;
      // Le modèle n'a AUCUNE normale : sans ce calcul l'éclairage est plat et sale.
      model.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh) mesh.geometry.computeVertexNormals();
      });
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      for (const player of latest?.players ?? []) {
        const avatar = avatarById(latest?.profiles.find((d) => d.id === player.id)?.avatarId ?? "amber");
        const inst = model.clone(true);
        inst.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (!mesh.isMesh) return;
          const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
          mat.color = new THREE.Color(avatar.color);
          mesh.material = mat;
        });
        // Origine ramenée AUX PIEDS, hauteur normalisée à 1 : le modèle brut est centré sur son milieu.
        inst.position.set(-center.x, -(center.y + size.y / 2), -center.z).multiplyScalar(1 / size.y);
        inst.scale.setScalar(1 / size.y);
        const group = new THREE.Group();
        // Y vers le bas dans le repère pixel : le personnage est retourné pour rester debout.
        group.rotation.x = Math.PI;
        group.rotation.y = Math.PI - 0.5;
        group.scale.setScalar(1);
        group.add(inst);
        scene.add(group);
        pawns.set(player.id, { group, target: new THREE.Vector2(), scale: 1 });
      }
      resize();
      // Aucun glissement au premier rendu : les pions apparaissent en place.
      for (const pawn of pawns.values()) pawn.group.position.set(pawn.target.x, pawn.target.y, 0);
    });

    setApi({
      update(next) {
        latest = next;
        place();
      },
    });

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.dispose();
      renderer.domElement.remove();
      setApi(null);
    };
  }, [cellCount]);

  useEffect(() => {
    api?.update(props);
  }, [api, props]);

  return <div ref={hostRef} className="pointer-events-none absolute inset-0" data-testid="pawn-layer-3d" />;
}
