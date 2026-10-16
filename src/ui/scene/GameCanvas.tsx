"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { ResolvedBoard } from "@/core/game";
import { SCENE_3D, type BoardTextureMode } from "@/config/scene3d";
import type { QualityTier } from "@/config/scene3d/tiers";
import { ASSETS } from "@/ui/theme/assets";
import { averageFps, SLOW_WATCH_START, watchSlowness, type SlowWatchState } from "./capability";
import { cameraPosition, fitDistance } from "./boardGeometry";
import { createBoardMesh } from "./boardMesh";

export interface GameCanvasProps {
  readonly board: ResolvedBoard;
  readonly textureMode: BoardTextureMode;
  readonly quality: QualityTier;
  /** Appelé une seule fois si la 3D se révèle trop lente sur cet appareil. La décision de replier appartient à l'appelant. */
  readonly onTooSlow: () => void;
}

const RAD = Math.PI / 180;

/**
 * LA SEULE TOILE WEBGL DU JEU (ADR 0059).
 *
 * Elle lit ce qu'on lui donne et dessine. Elle ne connaît ni le moteur, ni les
 * commandes, ni les règles ; elle ne peut rien retarder. Si elle échoue au
 * montage, l'appelant sert le plateau 2D.
 *
 * RENDU À LA DEMANDE. Le dessin n'a lieu que quand quelque chose a changé —
 * montage, redimensionnement, illustration arrivée. L'essai précédent
 * (`PawnLayer3D`) appelait `requestAnimationFrame` en boucle sans fin et
 * dessinait soixante images par seconde sur un plateau immobile : sur un
 * téléphone, c'est la batterie qui paie, pour zéro pixel de différence.
 *
 * Une exception bornée : au montage, la toile dessine en continu quelques
 * secondes pour MESURER les images par seconde. C'est le seul moment où un
 * plateau statique peut être mesuré, et c'est aussi le moment où un appareil
 * faible souffre le plus (décodage de l'illustration, premier affichage). Passé
 * ce délai, on repasse à la demande. À partir de l'étape 2, les déplacements
 * fourniront d'eux-mêmes de quoi mesurer.
 */
export function GameCanvas({ board, textureMode, quality, onTooSlow }: GameCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  // La fonction de repli change à chaque rendu du parent ; la scène, non. On la
  // lit au moment de s'en servir au lieu de reconstruire la scène pour elle.
  const tooSlowRef = useRef(onTooSlow);
  // Dans un effet, pas pendant le rendu : une ref écrite en cours de rendu est
  // une écriture pendant une phase que React peut refaire ou abandonner.
  useEffect(() => {
    tooSlowRef.current = onTooSlow;
  }, [onTooSlow]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const config = SCENE_3D;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: config.quality.antialias[quality], powerPreference: "high-performance" });
    } catch {
      // Pas de contexte WebGL malgré la détection : l'appelant a déjà un plateau
      // 2D à servir, on ne casse rien et on ne dit rien de plus ici.
      tooSlowRef.current();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, config.quality.pixelRatioCap[quality]));
    renderer.setClearAlpha(0);
    const canvas = renderer.domElement;
    Object.assign(canvas.style, { position: "absolute", inset: "0", width: "100%", height: "100%", display: "block" });
    canvas.setAttribute("aria-hidden", "true");
    host.appendChild(canvas);

    const scene = new THREE.Scene();
    const hemisphere = new THREE.HemisphereLight(new THREE.Color(config.lighting.skyColor), new THREE.Color(config.lighting.groundColor), config.lighting.hemisphere);
    scene.add(hemisphere);
    const sun = new THREE.DirectionalLight(0xffffff, config.lighting.sun);
    const sunTilt = config.lighting.sunTiltDegrees * RAD;
    const sunTurn = config.lighting.sunTurnDegrees * RAD;
    sun.position.set(Math.sin(sunTurn) * Math.cos(sunTilt) * 10, Math.sin(sunTilt) * 10, Math.cos(sunTurn) * Math.cos(sunTilt) * 10);
    scene.add(sun);

    const camera = new THREE.PerspectiveCamera(config.camera.fovDegrees, 1, 0.1, 500);

    let mesh = createBoardMesh({ board, config, textureMode, illustration: null });
    scene.add(mesh.group);

    let disposed = false;
    let pending = 0;
    let continuous = true;

    const draw = () => {
      pending = 0;
      renderer.render(scene, camera);
    };
    const requestDraw = () => {
      if (disposed || pending !== 0) return;
      pending = requestAnimationFrame(draw);
    };

    const placeCamera = (width: number, height: number) => {
      const aspect = width / height;
      camera.aspect = aspect;
      const distance = fitDistance({ cellCount: board.cellCount, fovDegrees: config.camera.fovDegrees, aspect, tiltDegrees: config.board.tiltDegrees, margin: config.camera.margin, minDistance: config.camera.minDistance, maxDistance: config.camera.maxDistance });
      const eye = cameraPosition({ distance, tiltDegrees: config.board.tiltDegrees });
      camera.position.set(eye.x, eye.y, eye.z);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
    };

    const resize = () => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      if (width === 0 || height === 0) return;
      renderer.setSize(width, height, false);
      placeCamera(width, height);
      requestDraw();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    // L'illustration n'est jamais attendue : la scène est déjà dessinée sans
    // elle, et elle n'est remplacée que quand l'image est réellement arrivée.
    const loader = new THREE.TextureLoader();
    loader.load(
      ASSETS.boardCenter,
      (texture) => {
        if (disposed) {
          texture.dispose();
          return;
        }
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
        scene.remove(mesh.group);
        mesh.dispose();
        mesh = createBoardMesh({ board, config, textureMode, illustration: texture });
        scene.add(mesh.group);
        requestDraw();
      },
      undefined,
      // Illustration indisponible : le plateau reste en couleurs unies. Ce n'est
      // pas une raison de replier en 2D ni de laisser un écran vide.
      () => undefined,
    );

    /* ---- mesure des images par seconde, bornée au démarrage ---- */
    const warmupMs = (config.quality.fallbackSeconds + 1) * 1000;
    let watch: SlowWatchState = SLOW_WATCH_START;
    let frames: number[] = [];
    let lastFrame = performance.now();
    let secondStart = lastFrame;
    let loop = 0;

    const measureTick = () => {
      if (disposed || !continuous) return;
      const now = performance.now();
      frames.push(now - lastFrame);
      lastFrame = now;
      renderer.render(scene, camera);
      if (now - secondStart >= 1000) {
        watch = watchSlowness(watch, averageFps(frames), config.quality);
        frames = [];
        secondStart = now;
        if (watch.tooSlow) {
          continuous = false;
          tooSlowRef.current();
          return;
        }
      }
      loop = requestAnimationFrame(measureTick);
    };
    loop = requestAnimationFrame(measureTick);
    const warmupTimer = setTimeout(() => {
      continuous = false;
    }, warmupMs);

    return () => {
      disposed = true;
      continuous = false;
      clearTimeout(warmupTimer);
      cancelAnimationFrame(loop);
      if (pending !== 0) cancelAnimationFrame(pending);
      observer.disconnect();
      mesh.dispose();
      scene.clear();
      renderer.dispose();
      canvas.remove();
    };
  }, [board, textureMode, quality]);

  return <div ref={hostRef} className="absolute inset-0" data-testid="game-canvas" />;
}
