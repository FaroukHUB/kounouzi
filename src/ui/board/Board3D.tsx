"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Holding, PlayerState, PurchasableSite, ResolvedBoard } from "@/core/game";
import type { PlayerProfileDraft } from "@/data/ports";
import { avatarById } from "@/config/avatars";
import { DEFAULT_LOCALE, t } from "@/i18n";
import { Board } from "./Board";
import { PawnLayer } from "./PawnLayer";
import { CELL_STYLE } from "./cellStyles";
import { clusterOffset, gridDims, perimeterPosition } from "./layout";
import { BoardWebGLRenderer, type BoardScene, type FigureOutfit, type SceneCell, type ScenePlayer } from "./webgl/renderer";

export interface Board3DProps {
  readonly board: ResolvedBoard;
  readonly highlightedCell: number | null;
  readonly arrivalCell: number | null;
  readonly previewPath: readonly number[];
  readonly holdings: readonly Holding[];
  readonly sites: Readonly<Record<string, PurchasableSite>>;
  readonly players: readonly PlayerState[];
  readonly profiles: readonly PlayerProfileDraft[];
  readonly visuals: Readonly<Record<string, number>>;
  readonly activePlayerId: string;
  readonly stepMs: number;
  readonly center: ReactNode;
}

const OUTFITS: readonly FigureOutfit[] = ["qamis_kufi","abaya_hijab","qamis_kufi","jilbab","thobe_ghutra","abaya_hijab","qamis_kufi","jilbab"];

function outfitForAvatar(avatarId: string): FigureOutfit {
  const order=["amber","teal","ruby","indigo","olive","sky","plum","copper"];
  const i=Math.max(0,order.indexOf(avatarId));
  return OUTFITS[i % OUTFITS.length] ?? "qamis_kufi";
}

function rotationForSide(side: ReturnType<typeof perimeterPosition>["side"]): number {
  if(side==="top") return Math.PI;
  if(side==="start") return -Math.PI/2;
  if(side==="end") return Math.PI/2;
  return 0;
}

function labelForCell(cell: ResolvedBoard["cells"][number], sites: Readonly<Record<string, PurchasableSite>>): {label:string;sublabel?:string;icon?:string} {
  if(cell.type==="heritage"){
    const est=sites[cell.siteId]?.establishment;
    return {
      label: est ? t(DEFAULT_LOCALE,`cell.family.${est.family}`) : t(DEFAULT_LOCALE,"cell.heritage"),
      ...(est?.name.fr ? {sublabel:est.name.fr} : {}),
      ...(est?.icon ? {icon:est.icon} : {}),
    };
  }
  const icon: Partial<Record<typeof cell.type,string>> = {
    start:"🚩",
    question:"💡",
    challenge:"?",
    halt:"⏸",
    donation:"🤲",
    treasure:"✦",
  };
  return {label:t(DEFAULT_LOCALE,`cell.${cell.type}`), ...(icon[cell.type] ? {icon:icon[cell.type]} : {})};
}

function buildScene(
  board: ResolvedBoard,
  sites: Readonly<Record<string, PurchasableSite>>,
  players: readonly PlayerState[],
  profiles: readonly PlayerProfileDraft[],
  holdings: readonly Holding[],
  visuals: Readonly<Record<string, number>>,
  activePlayerId: string,
  highlightedCell: number|null,
  arrivalCell:number|null,
  previewPath:readonly number[],
): BoardScene {
  const {cols,rows}=gridDims(board.cellCount);
  const spacing=1.08;
  const ownerBySite = new Map(holdings.map((h)=>[h.siteId,h.ownerId]));
  const ownerColor = (siteId:string): string | undefined => {
    const ownerId=ownerBySite.get(siteId);
    if(!ownerId) return undefined;
    const avatarId=profiles.find((p)=>p.id===ownerId)?.avatarId ?? "amber";
    return avatarById(avatarId).color;
  };
  const cells: SceneCell[] = board.cells.map((cell)=>{
    const grid=perimeterPosition(cell.position,board.cellCount);
    const style=CELL_STYLE[cell.type];
    const text=labelForCell(cell,sites);
    return {
      position:cell.position,
      x:(grid.col-(cols-1)/2)*spacing,
      z:(grid.row-(rows-1)/2)*spacing,
      rotationY:rotationForSide(grid.side),
      label:text.label,
      ...("sublabel" in text && text.sublabel ? {sublabel:text.sublabel} : {}),
      ...("icon" in text && text.icon ? {icon:text.icon} : {}),
      bg:style.bg,
      bg2:style.bg2,
      fg:style.fg,
      accent:style.accent,
      ...(cell.type==="heritage" && ownerColor(cell.siteId) ? {ownerColor:ownerColor(cell.siteId)!} : {}),
    };
  });

  const cellByPosition=new Map(cells.map((c)=>[c.position,c]));
  const byCell=new Map<number,string[]>();
  for(const p of players){
    const pos=visuals[p.id] ?? p.position;
    byCell.set(pos,[...(byCell.get(pos)??[]),p.id]);
  }

  const scenePlayers: ScenePlayer[] = players.map((p)=>{
    const pos=visuals[p.id] ?? p.position;
    const c=cellByPosition.get(pos) ?? cells[0]!;
    const cluster=byCell.get(pos) ?? [p.id];
    const off=clusterOffset(cluster.indexOf(p.id),cluster.length);
    const profile=profiles.find((x)=>x.id===p.id);
    const avatarId=profile?.avatarId ?? "amber";
    const avatar=avatarById(avatarId);
    return {
      id:p.id,
      x:c.x+off.dx*.42,
      z:c.z+off.dy*.42,
      color:avatar.color,
      outfit:outfitForAvatar(avatarId),
      active:p.id===activePlayerId,
      size:profile?.profileType==="child" ? .78 : .92,
    };
  });

  return {cells,players:scenePlayers,highlightedCell,arrivalCell,previewPath};
}

/**
 * Vraie scène 3D WebGL : géométrie, perspective, éclairage et personnages 3D.
 * Le moteur ne change pas. Si WebGL n'est pas disponible, l'ancien plateau 2D
 * reste automatiquement utilisable.
 */
export function Board3D(props: Board3DProps) {
  const canvasRef=useRef<HTMLCanvasElement|null>(null);
  const rendererRef=useRef<BoardWebGLRenderer|null>(null);
  const [fallback,setFallback]=useState(false);

  const scene=useMemo(
    ()=>buildScene(props.board,props.sites,props.players,props.profiles,props.holdings,props.visuals,props.activePlayerId,props.highlightedCell,props.arrivalCell,props.previewPath),
    [props.board,props.sites,props.players,props.profiles,props.holdings,props.visuals,props.activePlayerId,props.highlightedCell,props.arrivalCell,props.previewPath],
  );
  const sceneRef=useRef(scene);
  sceneRef.current=scene;

  useEffect(()=>{
    const canvas=canvasRef.current;
    if(!canvas) return;
    try{
      const renderer=new BoardWebGLRenderer(canvas,sceneRef.current);
      rendererRef.current=renderer;
      renderer.start();
      return ()=>{
        renderer.dispose();
        rendererRef.current=null;
      };
    }catch{
      setFallback(true);
    }
  },[]);

  useEffect(()=>{
    rendererRef.current?.setScene(scene,props.stepMs);
  },[scene,props.stepMs]);

  if(fallback){
    return (
      <Board
        board={props.board}
        highlightedCell={props.highlightedCell}
        arrivalCell={props.arrivalCell}
        previewPath={props.previewPath}
        holdings={props.holdings}
        sites={props.sites}
        players={props.players}
        profiles={props.profiles}
        pawns={<PawnLayer players={props.players} profiles={props.profiles} visuals={props.visuals} activePlayerId={props.activePlayerId} cellCount={props.board.cellCount} stepMs={props.stepMs} />}
        center={props.center}
      />
    );
  }

  return (
    <div className="relative aspect-square w-full max-w-[min(96vw,78vh)] overflow-visible" data-testid="board-3d">
      <canvas
        ref={canvasRef}
        className="block size-full touch-none rounded-[1.6rem]"
        aria-label="Plateau Kounouzi en 3D"
        onPointerMove={(e)=>{
          const rect=e.currentTarget.getBoundingClientRect();
          const x=((e.clientX-rect.left)/Math.max(1,rect.width))*2-1;
          const y=((e.clientY-rect.top)/Math.max(1,rect.height))*2-1;
          rendererRef.current?.setPointer(x,y);
        }}
        onPointerLeave={()=>rendererRef.current?.setPointer(0,0)}
      />
      <div className="pointer-events-none absolute inset-[26%] z-10 flex items-center justify-center">
        <div className="pointer-events-auto w-full max-w-sm rounded-[1.4rem] bg-[rgba(255,250,240,0.78)] p-2 shadow-[0_18px_50px_-28px_rgba(40,25,10,0.75)] backdrop-blur-sm">
          {props.center}
        </div>
      </div>
      <ol className="sr-only" aria-label="Cases du plateau">
        {props.board.cells.map((cell)=><li key={cell.position}>{labelForCell(cell,props.sites).label}</li>)}
      </ol>
    </div>
  );
}
