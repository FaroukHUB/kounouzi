"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { ResolvedBoard } from "@/core/game";
import { SCENE_3D, type BoardTextureMode } from "@/config/scene3d";
import type { QualityTier } from "@/config/scene3d/tiers";
import { pieceForSeat } from "@/config/pawns/pieces";
import { ASSETS } from "@/ui/theme/assets";
import type { PawnLayerProps } from "@/ui/board/PawnLayer";
import { averageFps, SLOW_WATCH_START, watchSlowness, type SlowWatchState } from "./capability";
import { cameraPosition, clusterPoint, type Point3 } from "./boardGeometry";
import { approachShot, followShot, shotSettled, wideShot, type Shot, type ShotInput } from "./cameraFraming";
import { createBoardMesh } from "./boardMesh";
import { createPawnModel } from "./pawnMesh";
import { facing, pawnPoint, stepProgress, turnToward } from "./pawnMotion";

export interface GameCanvasProps {
  readonly board: ResolvedBoard;
  readonly textureMode: BoardTextureMode;
  readonly quality: QualityTier;
  /** Les pions, exactement les propriétés que reçoit la couche 2D : une seule source. */
  readonly pawns: PawnLayerProps;
  /**
   * Plan de caméra. La scène ne décide pas quand prendre du recul : c'est
   * l'écran de jeu qui sait qu'une carte est ouverte ou que la partie est finie.
   */
  readonly shot: "follow" | "wide";
  /** Animations réduites : la caméra se place au lieu de glisser. */
  readonly reduced: boolean;
  /** Appelé une seule fois si la 3D se révèle trop lente sur cet appareil. La décision de replier appartient à l'appelant. */
  readonly onTooSlow: () => void;
}

const RAD = Math.PI / 180;

/** Un pion dans la scène : son objet, le pas en cours, et ce vers quoi il tend. */
interface ScenePawn {
  readonly group: THREE.Group;
  cell: number;
  from: Point3;
  to: Point3;
  startedAt: number;
  stepMs: number;
  /** Un saut n'a lieu qu'en CHANGEANT de case : un réarrangement de grappe glisse. */
  hop: number;
  facing: number;
  scale: number;
  targetScale: number;
}

/** Ce que la scène expose au composant : on pousse des propriétés, on ne mute aucune ref de l'extérieur. */
interface SceneApi {
  update(pawns: PawnLayerProps, shot: "follow" | "wide", reduced: boolean): void;
}

/**
 * LA SEULE TOILE WEBGL DU JEU (ADR 0059).
 *
 * Elle lit ce qu'on lui donne et dessine. Elle ne connaît ni le moteur, ni les
 * commandes, ni les règles ; elle ne peut rien retarder. Si elle échoue au
 * montage, l'appelant sert le plateau 2D.
 *
 * RENDU À LA DEMANDE. Le dessin n'a lieu que quand quelque chose a changé ou
 * bouge : un pion qui avance, un redimensionnement, l'illustration qui arrive.
 * Dès que tout est posé, la boucle s'arrête. L'essai précédent
 * (`PawnLayer3D`) appelait `requestAnimationFrame` sans fin et dessinait
 * soixante images par seconde sur un plateau immobile : sur un téléphone, c'est
 * la batterie qui paie, pour zéro pixel de différence.
 *
 * Les images par seconde sont mesurées PENDANT ces animations — le moment où un
 * appareil faible souffre réellement. Au tout premier affichage, où rien ne
 * bouge encore, une courte mesure de démarrage prend le relais.
 */
export function GameCanvas({ board, textureMode, quality, pawns, shot, reduced, onTooSlow }: GameCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<SceneApi | null>(null);
  // La fonction de repli change à chaque rendu du parent ; la scène, non. On la
  // lit au moment de s'en servir au lieu de reconstruire la scène pour elle.
  const tooSlowRef = useRef(onTooSlow);
  // Dans un effet, pas pendant le rendu : une ref écrite en cours de rendu est
  // une écriture pendant une phase que React peut refaire ou abandonner.
  useEffect(() => {
    tooSlowRef.current = onTooSlow;
  }, [onTooSlow]);

  const pawnsRef = useRef(pawns);
  const shotRef = useRef(shot);
  const reducedRef = useRef(reduced);
  useEffect(() => {
    pawnsRef.current = pawns;
    shotRef.current = shot;
    reducedRef.current = reduced;
    apiRef.current?.update(pawns, shot, reduced);
  }, [pawns, shot, reduced]);

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
    scene.add(new THREE.HemisphereLight(new THREE.Color(config.lighting.skyColor), new THREE.Color(config.lighting.groundColor), config.lighting.hemisphere));
    const sun = new THREE.DirectionalLight(0xffffff, config.lighting.sun);
    const sunTilt = config.lighting.sunTiltDegrees * RAD;
    const sunTurn = config.lighting.sunTurnDegrees * RAD;
    sun.position.set(Math.sin(sunTurn) * Math.cos(sunTilt) * 10, Math.sin(sunTilt) * 10, Math.cos(sunTurn) * Math.cos(sunTilt) * 10);
    scene.add(sun);

    const camera = new THREE.PerspectiveCamera(config.camera.fovDegrees, 1, 0.1, 500);

    let mesh = createBoardMesh({ board, config, textureMode, illustration: null });
    scene.add(mesh.group);

    const GROUND_Y = config.board.tileHeight;
    const scenePawns = new Map<string, ScenePawn>();
    const pawnModel = createPawnModel();

    let disposed = false;
    let pending = 0;
    /** Mesure de démarrage : quelques secondes de rendu continu, le temps d'avoir des images à compter. */
    let warmingUp = true;
    let looping = false;

    /* ---- où doit se trouver chaque pion, d'après les propriétés reçues ---- */
    const targetsFor = (props: PawnLayerProps): Map<string, { readonly cell: number; readonly point: Point3 }> => {
      const byCell = new Map<number, string[]>();
      for (const player of props.players) {
        const cell = props.visuals[player.id] ?? player.position;
        byCell.set(cell, [...(byCell.get(cell) ?? []), player.id]);
      }
      const out = new Map<string, { cell: number; point: Point3 }>();
      for (const player of props.players) {
        const cell = props.visuals[player.id] ?? player.position;
        const cluster = byCell.get(cell) ?? [player.id];
        out.set(player.id, { cell, point: clusterPoint(cell, props.cellCount, cluster.indexOf(player.id), cluster.length) });
      }
      return out;
    };

    const applyTargets = (props: PawnLayerProps) => {
      const targets = targetsFor(props);
      const now = performance.now();
      for (const player of props.players) {
        const target = targets.get(player.id);
        const pawn = scenePawns.get(player.id);
        if (!target || !pawn) continue;
        if (target.cell !== pawn.cell || target.point.x !== pawn.to.x || target.point.z !== pawn.to.z) {
          // Le nouveau pas part d'OÙ LE PION EST VRAIMENT, pas de sa case
          // précédente : sans cela, deux pas enchaînés plus vite que l'animation
          // font revenir le pion en arrière avant de repartir.
          pawn.from = { x: pawn.group.position.x, y: 0, z: pawn.group.position.z };
          pawn.to = target.point;
          pawn.startedAt = now;
          pawn.stepMs = props.stepMs;
          pawn.hop = target.cell !== pawn.cell ? config.board.pawnHop : 0;
          pawn.cell = target.cell;
        }
        pawn.targetScale = config.board.pawnHeight * (player.id === props.activePlayerId ? config.board.pawnActiveScale : 1);
      }
      ensureLoop();
    };

    /* ---- la boucle : elle tourne tant que quelque chose bouge ---- */
    let watch: SlowWatchState = SLOW_WATCH_START;
    let frames: number[] = [];
    let lastFrame = performance.now();
    let secondStart = lastFrame;

    /** Rapproche la caméra de son plan ; rend vrai tant qu'elle bouge encore. */
    const stepCamera = (elapsedMs: number): boolean => {
      const wanted = wantedShot();
      if (!current) {
        applyShot(wanted);
        return false;
      }
      // Animations réduites : la caméra se PLACE, elle ne glisse pas. Même
      // séquence, durée nulle — rien à poursuivre à l'image suivante.
      if (reducedRef.current) {
        applyShot(wanted);
        return false;
      }
      if (shotSettled(current, wanted)) return false;
      applyShot(approachShot(current, wanted, elapsedMs, config.camera.smoothMs));
      return true;
    };

    const stepPawns = (now: number): boolean => {
      let moving = false;
      const props = pawnsRef.current;
      // Durée nulle = mode « animations réduites » : tout se pose d'un coup,
      // mêmes étapes, aucune transition (REDUCED_TIMINGS met toutes les durées à zéro).
      const instant = !(props.stepMs > 0);
      for (const pawn of scenePawns.values()) {
        const progress = stepProgress(now - pawn.startedAt, pawn.stepMs);
        const point = pawnPoint({ from: pawn.from, to: pawn.to, progress, groundY: GROUND_Y, hop: pawn.hop });
        pawn.group.position.set(point.x, point.y, point.z);
        const wanted = facing(pawn.from, pawn.to, pawn.facing);
        pawn.facing = instant ? wanted : turnToward(pawn.facing, wanted, config.pawns.turnFactor);
        pawn.group.rotation.y = pawn.facing;
        pawn.scale = instant ? pawn.targetScale : pawn.scale + (pawn.targetScale - pawn.scale) * config.pawns.settleFactor;
        pawn.group.scale.setScalar(pawn.scale);
        if (progress < 1 || Math.abs(pawn.targetScale - pawn.scale) > 0.002 || Math.abs(wanted - pawn.facing) > 0.01) moving = true;
      }
      return moving;
    };

    const tick = () => {
      pending = 0;
      if (disposed) return;
      const now = performance.now();
      const elapsed = now - lastFrame;
      frames.push(elapsed);
      lastFrame = now;
      // Les pions d'abord : la caméra suit le pion là où il EST à cette image.
      const pawnsMoving = stepPawns(now);
      const cameraMoving = stepCamera(elapsed);
      const moving = pawnsMoving || cameraMoving;
      renderer.render(scene, camera);
      if (now - secondStart >= 1000) {
        watch = watchSlowness(watch, averageFps(frames), config.quality);
        frames = [];
        secondStart = now;
        if (watch.tooSlow) {
          looping = false;
          warmingUp = false;
          tooSlowRef.current();
          return;
        }
      }
      if (moving || warmingUp) {
        pending = requestAnimationFrame(tick);
        looping = true;
      } else {
        looping = false;
      }
    };

    const ensureLoop = () => {
      if (disposed || looping || pending !== 0) return;
      lastFrame = performance.now();
      pending = requestAnimationFrame(tick);
      looping = true;
    };

    /** Un seul dessin, sans démarrer de boucle : redimensionnement, illustration arrivée. */
    const requestDraw = () => {
      if (disposed || looping || pending !== 0) return;
      pending = requestAnimationFrame(tick);
    };

    /* ---- la caméra : deux plans, un glissement, aucune rotation ---- */
    let shotInput: ShotInput | null = null;
    /** Plan réellement appliqué ; il rattrape le plan voulu, il ne saute pas. */
    let current: Shot | null = null;

    /** Le point suivi : le pion du joueur actif, à défaut le centre du plateau. */
    const focusPoint = (): Point3 => {
      const active = scenePawns.get(pawnsRef.current.activePlayerId);
      return active ? { x: active.group.position.x, y: 0, z: active.group.position.z } : { x: 0, y: 0, z: 0 };
    };

    const wantedShot = (): Shot => {
      if (!shotInput) return { target: { x: 0, y: 0, z: 0 }, distance: config.camera.maxDistance };
      // Plan large dès qu'une carte occupe l'écran ou que la partie est finie :
      // le plateau redevient un tout, et plus rien ne bouge derrière la carte.
      return shotRef.current === "wide" ? wideShot(shotInput) : followShot(focusPoint(), shotInput);
    };

    const applyShot = (next: Shot) => {
      current = next;
      const eye = cameraPosition({ distance: next.distance, tiltDegrees: config.board.tiltDegrees, target: next.target });
      camera.position.set(eye.x, eye.y, eye.z);
      camera.lookAt(next.target.x, next.target.y, next.target.z);
      camera.updateProjectionMatrix();
    };

    const resize = () => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      if (width === 0 || height === 0) return;
      renderer.setSize(width, height, false);
      const aspect = width / height;
      camera.aspect = aspect;
      shotInput = { cellCount: board.cellCount, fovDegrees: config.camera.fovDegrees, aspect, tiltDegrees: config.board.tiltDegrees, margin: config.camera.margin, minDistance: config.camera.minDistance, maxDistance: config.camera.maxDistance, followSpan: config.camera.followSpan };
      // Un changement de taille d'écran n'est pas un mouvement de caméra : on se
      // replace tout de suite, sinon la vue dérive pendant une rotation d'écran.
      applyShot(wantedShot());
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

    // Les pions : une géométrie partagée, un matériau par joueur. Rien à
    // télécharger, donc rien à attendre et rien qui puisse échouer.
    {
      const props = pawnsRef.current;
      const targets = targetsFor(props);
      for (const [seat, player] of props.players.entries()) {
        const target = targets.get(player.id);
        if (!target) continue;
        const group = pawnModel.instance(pieceForSeat(seat).color);
        const scale = config.board.pawnHeight * (player.id === props.activePlayerId ? config.board.pawnActiveScale : 1);
        group.position.set(target.point.x, GROUND_Y, target.point.z);
        group.scale.setScalar(scale);
        scene.add(group);
        // Aucun glissement au premier affichage : les pions apparaissent en place.
        scenePawns.set(player.id, { group, cell: target.cell, from: target.point, to: target.point, startedAt: 0, stepMs: 0, hop: 0, facing: 0, scale, targetScale: scale });
      }
    }

    apiRef.current = {
      update(nextPawns) {
        applyTargets(nextPawns);
        // Le plan a pu changer sans qu'un pion bouge (une carte s'ouvre) : la
        // boucle doit repartir, sinon la caméra reste où elle était.
        ensureLoop();
      },
    };

    const warmupTimer = setTimeout(() => {
      warmingUp = false;
    }, (config.quality.fallbackSeconds + 1) * 1000);
    ensureLoop();

    return () => {
      disposed = true;
      warmingUp = false;
      looping = false;
      clearTimeout(warmupTimer);
      if (pending !== 0) cancelAnimationFrame(pending);
      observer.disconnect();
      apiRef.current = null;
      for (const pawn of scenePawns.values()) scene.remove(pawn.group);
      scenePawns.clear();
      pawnModel.dispose();
      mesh.dispose();
      scene.clear();
      renderer.dispose();
      canvas.remove();
    };
  }, [board, textureMode, quality]);

  return <div ref={hostRef} className="absolute inset-0" data-testid="game-canvas" />;
}
