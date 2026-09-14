import { boxGeometry, cylinderGeometry, planeGeometry, sphereGeometry, type GeometryData } from "./geometry";
import { hexToRgb, lerp, lookAt, mat4TRS, perspective, smoothstep01, type Mat4, type Vec3 } from "./math";

export type FigureOutfit = "qamis_kufi" | "abaya_hijab" | "thobe_ghutra" | "jilbab";

export interface SceneCell {
  readonly position: number;
  readonly x: number;
  readonly z: number;
  readonly rotationY: number;
  readonly label: string;
  readonly sublabel?: string | undefined;
  readonly icon?: string | undefined;
  readonly bg: string;
  readonly bg2: string;
  readonly fg: string;
  readonly accent: string;
  readonly ownerColor?: string | undefined;
}

export interface ScenePlayer {
  readonly id: string;
  readonly x: number;
  readonly z: number;
  readonly color: string;
  readonly outfit: FigureOutfit;
  readonly active: boolean;
  readonly size: number;
}

export interface BoardScene {
  readonly cells: readonly SceneCell[];
  readonly players: readonly ScenePlayer[];
  readonly highlightedCell: number | null;
  readonly arrivalCell: number | null;
  readonly previewPath: readonly number[];
}

interface GLGeometry {
  readonly position: WebGLBuffer;
  readonly normal: WebGLBuffer;
  readonly uv: WebGLBuffer;
  readonly index: WebGLBuffer;
  readonly count: number;
}

interface ProgramInfo {
  readonly program: WebGLProgram;
  readonly aPosition: number;
  readonly aNormal: number;
  readonly aUv: number;
  readonly uProjection: WebGLUniformLocation;
  readonly uView: WebGLUniformLocation;
  readonly uModel: WebGLUniformLocation;
  readonly uColor: WebGLUniformLocation | null;
  readonly uAlpha: WebGLUniformLocation | null;
  readonly uTexture: WebGLUniformLocation | null;
}

interface MotionState {
  fromX: number;
  fromZ: number;
  toX: number;
  toZ: number;
  startedAt: number;
  duration: number;
}

const COLOR_VS = `
attribute vec3 a_position;
attribute vec3 a_normal;
attribute vec2 a_uv;
uniform mat4 u_projection;
uniform mat4 u_view;
uniform mat4 u_model;
varying vec3 v_normal;
varying vec3 v_world;
void main() {
  vec4 world = u_model * vec4(a_position, 1.0);
  v_world = world.xyz;
  v_normal = normalize(mat3(u_model) * a_normal);
  gl_Position = u_projection * u_view * world;
}
`;

const COLOR_FS = `
precision mediump float;
varying vec3 v_normal;
varying vec3 v_world;
uniform vec3 u_color;
uniform float u_alpha;
void main() {
  vec3 n = normalize(v_normal);
  vec3 lightDir = normalize(vec3(-0.45, 1.0, 0.55));
  float diffuse = max(dot(n, lightDir), 0.0);
  float rim = pow(1.0 - max(dot(n, normalize(vec3(0.0, 0.8, 1.0))), 0.0), 2.0);
  vec3 lit = u_color * (0.42 + diffuse * 0.58) + vec3(1.0) * rim * 0.06;
  gl_FragColor = vec4(lit, u_alpha);
}
`;

const TEX_VS = `
attribute vec3 a_position;
attribute vec3 a_normal;
attribute vec2 a_uv;
uniform mat4 u_projection;
uniform mat4 u_view;
uniform mat4 u_model;
varying vec2 v_uv;
varying float v_light;
void main() {
  vec4 world = u_model * vec4(a_position, 1.0);
  vec3 n = normalize(mat3(u_model) * a_normal);
  vec3 lightDir = normalize(vec3(-0.45, 1.0, 0.55));
  v_light = 0.72 + max(dot(n, lightDir), 0.0) * 0.28;
  v_uv = a_uv;
  gl_Position = u_projection * u_view * world;
}
`;

const TEX_FS = `
precision mediump float;
varying vec2 v_uv;
varying float v_light;
uniform sampler2D u_texture;
void main() {
  vec4 c = texture2D(u_texture, v_uv);
  gl_FragColor = vec4(c.rgb * v_light, c.a);
}
`;

function shader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const s = gl.createShader(type);
  if (!s) throw new Error("WebGL shader indisponible");
  gl.shaderSource(s, source);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s) ?? "erreur shader";
    gl.deleteShader(s);
    throw new Error(log);
  }
  return s;
}

function program(gl: WebGLRenderingContext, vs: string, fs: string): WebGLProgram {
  const p = gl.createProgram();
  if (!p) throw new Error("WebGL program indisponible");
  const v = shader(gl, gl.VERTEX_SHADER, vs);
  const f = shader(gl, gl.FRAGMENT_SHADER, fs);
  gl.attachShader(p, v);
  gl.attachShader(p, f);
  gl.linkProgram(p);
  gl.deleteShader(v);
  gl.deleteShader(f);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(p) ?? "erreur link";
    gl.deleteProgram(p);
    throw new Error(log);
  }
  return p;
}

function uniform(gl: WebGLRenderingContext, p: WebGLProgram, name: string): WebGLUniformLocation {
  const u = gl.getUniformLocation(p, name);
  if (!u) throw new Error(`Uniform absent: ${name}`);
  return u;
}

function createProgramInfo(gl: WebGLRenderingContext, textured: boolean): ProgramInfo {
  const p = program(gl, textured ? TEX_VS : COLOR_VS, textured ? TEX_FS : COLOR_FS);
  return {
    program: p,
    aPosition: gl.getAttribLocation(p, "a_position"),
    aNormal: gl.getAttribLocation(p, "a_normal"),
    aUv: gl.getAttribLocation(p, "a_uv"),
    uProjection: uniform(gl, p, "u_projection"),
    uView: uniform(gl, p, "u_view"),
    uModel: uniform(gl, p, "u_model"),
    uColor: textured ? null : uniform(gl, p, "u_color"),
    uAlpha: textured ? null : uniform(gl, p, "u_alpha"),
    uTexture: textured ? uniform(gl, p, "u_texture") : null,
  };
}

function createGeometry(gl: WebGLRenderingContext, data: GeometryData): GLGeometry {
  const make=(target:number, values:Float32Array | Uint16Array)=>{
    const b=gl.createBuffer();
    if(!b) throw new Error("WebGL buffer indisponible");
    gl.bindBuffer(target,b);
    // TS 5.9 élargit les TypedArray vers ArrayBufferLike ; WebGL attend un BufferSource classique.
    gl.bufferData(target,values as unknown as BufferSource,gl.STATIC_DRAW);
    return b;
  };
  return {
    position: make(gl.ARRAY_BUFFER,data.positions),
    normal: make(gl.ARRAY_BUFFER,data.normals),
    uv: make(gl.ARRAY_BUFFER,data.uvs),
    index: make(gl.ELEMENT_ARRAY_BUFFER,data.indices),
    count: data.indices.length,
  };
}

function bindGeometry(gl: WebGLRenderingContext, p: ProgramInfo, g: GLGeometry): void {
  if(p.aPosition>=0){
    gl.bindBuffer(gl.ARRAY_BUFFER,g.position);
    gl.enableVertexAttribArray(p.aPosition);
    gl.vertexAttribPointer(p.aPosition,3,gl.FLOAT,false,0,0);
  }
  if(p.aNormal>=0){
    gl.bindBuffer(gl.ARRAY_BUFFER,g.normal);
    gl.enableVertexAttribArray(p.aNormal);
    gl.vertexAttribPointer(p.aNormal,3,gl.FLOAT,false,0,0);
  }
  if(p.aUv>=0){
    gl.bindBuffer(gl.ARRAY_BUFFER,g.uv);
    gl.enableVertexAttribArray(p.aUv);
    gl.vertexAttribPointer(p.aUv,2,gl.FLOAT,false,0,0);
  }
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,g.index);
}

function roundedRect(ctx: CanvasRenderingContext2D, x:number,y:number,w:number,h:number,r:number): void {
  const rr=Math.min(r,w/2,h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr,y);
  ctx.arcTo(x+w,y,x+w,y+h,rr);
  ctx.arcTo(x+w,y+h,x,y+h,rr);
  ctx.arcTo(x,y+h,x,y,rr);
  ctx.arcTo(x,y,x+w,y,rr);
  ctx.closePath();
}

function textFit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, startSize: number, minSize: number): number {
  let size=startSize;
  while(size>minSize){
    ctx.font=`700 ${size}px system-ui, -apple-system, Segoe UI, sans-serif`;
    if(ctx.measureText(text).width<=maxWidth) return size;
    size-=2;
  }
  return minSize;
}

function cellCanvas(cell: SceneCell): HTMLCanvasElement {
  const c=document.createElement("canvas");
  c.width=256; c.height=256;
  const ctx=c.getContext("2d");
  if(!ctx) return c;
  const grad=ctx.createLinearGradient(0,0,256,256);
  grad.addColorStop(0,cell.bg);
  grad.addColorStop(1,cell.bg2);
  roundedRect(ctx,3,3,250,250,28);
  ctx.fillStyle=grad; ctx.fill();
  ctx.strokeStyle=cell.accent; ctx.lineWidth=8; ctx.stroke();

  ctx.fillStyle="rgba(255,255,255,.72)";
  roundedRect(ctx,18,154,220,72,28);
  ctx.fill();

  ctx.textAlign="center";
  ctx.textBaseline="middle";
  if(cell.icon){
    ctx.font="70px Apple Color Emoji, Segoe UI Emoji, sans-serif";
    ctx.fillText(cell.icon,128,88);
  } else {
    ctx.fillStyle=cell.accent;
    ctx.beginPath();
    ctx.arc(128,88,38,0,Math.PI*2);
    ctx.fill();
  }

  ctx.fillStyle=cell.fg;
  const labelSize=textFit(ctx,cell.label,205,34,21);
  ctx.font=`800 ${labelSize}px system-ui, -apple-system, Segoe UI, sans-serif`;
  ctx.fillText(cell.label,128,179);
  if(cell.sublabel){
    ctx.font="600 18px system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.fillStyle="rgba(30,35,42,.76)";
    const sub=cell.sublabel.length>25 ? `${cell.sublabel.slice(0,23)}…` : cell.sublabel;
    ctx.fillText(sub,128,208);
  }
  ctx.font="600 14px system-ui, sans-serif";
  ctx.fillStyle="rgba(20,25,30,.35)";
  ctx.textAlign="left";
  ctx.fillText(String(cell.position),16,18);
  return c;
}

function centerCanvas(): HTMLCanvasElement {
  const c=document.createElement("canvas"); c.width=1024; c.height=1024;
  const ctx=c.getContext("2d"); if(!ctx) return c;
  const g=ctx.createRadialGradient(512,440,80,512,512,700);
  g.addColorStop(0,"#fffaf0"); g.addColorStop(1,"#e9dcc3");
  ctx.fillStyle=g; ctx.fillRect(0,0,1024,1024);
  ctx.strokeStyle="rgba(15,118,110,.16)"; ctx.lineWidth=3;
  for(let r=120;r<700;r+=64){ ctx.beginPath(); ctx.arc(512,512,r,0,Math.PI*2); ctx.stroke(); }
  ctx.strokeStyle="rgba(212,160,23,.30)";
  for(let a=0;a<12;a+=1){
    const ang=a*Math.PI/6;
    ctx.beginPath(); ctx.moveTo(512,512); ctx.lineTo(512+Math.cos(ang)*520,512+Math.sin(ang)*520); ctx.stroke();
  }
  ctx.textAlign="center"; ctx.textBaseline="middle";
  ctx.font="900 112px Georgia, serif"; ctx.fillStyle="#0b5f58"; ctx.fillText("KOUNOUZI",512,430);
  ctx.font="700 30px system-ui, sans-serif"; ctx.fillStyle="#8b6b2b"; ctx.fillText("JOUE  •  APPRENDS  •  GÈRE",512,515);
  return c;
}

function createTexture(gl: WebGLRenderingContext, source: TexImageSource): WebGLTexture {
  const t=gl.createTexture();
  if(!t) throw new Error("WebGL texture indisponible");
  gl.bindTexture(gl.TEXTURE_2D,t);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,1);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.generateMipmap(gl.TEXTURE_2D);
  return t;
}

function localOffset(x:number,z:number,rotationY:number,lx:number,lz:number): readonly [number,number] {
  const c=Math.cos(rotationY), s=Math.sin(rotationY);
  return [x + lx*c + lz*s, z - lx*s + lz*c];
}

export class BoardWebGLRenderer {
  private readonly gl: WebGLRenderingContext;
  private readonly colorProgram: ProgramInfo;
  private readonly textureProgram: ProgramInfo;
  private readonly box: GLGeometry;
  private readonly plane: GLGeometry;
  private readonly cylinder: GLGeometry;
  private readonly robe: GLGeometry;
  private readonly sphere: GLGeometry;
  private readonly textures = new Map<number,WebGLTexture>();
  private readonly centerTexture: WebGLTexture;
  private scene: BoardScene;
  private motions = new Map<string,MotionState>();
  private raf=0;
  private disposed=false;
  private pointerX=0;
  private pointerY=0;
  private lastFrame=0;
  private motionEnabled=true;

  constructor(private readonly canvas: HTMLCanvasElement, scene: BoardScene) {
    const gl=canvas.getContext("webgl",{antialias:true,alpha:true,premultipliedAlpha:true});
    if(!gl) throw new Error("WEBGL_UNAVAILABLE");
    this.gl=gl;
    this.colorProgram=createProgramInfo(gl,false);
    this.textureProgram=createProgramInfo(gl,true);
    this.box=createGeometry(gl,boxGeometry());
    this.plane=createGeometry(gl,planeGeometry());
    this.cylinder=createGeometry(gl,cylinderGeometry(24,.5,.5));
    this.robe=createGeometry(gl,cylinderGeometry(24,.38,.52));
    this.sphere=createGeometry(gl,sphereGeometry(14,20));
    this.centerTexture=createTexture(gl,centerCanvas());
    this.scene=scene;

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0,0,0,0);

    this.rebuildCellTextures();
    const now=performance.now();
    for(const p of scene.players) this.motions.set(p.id,{fromX:p.x,fromZ:p.z,toX:p.x,toZ:p.z,startedAt:now,duration:1});
  }

  start(): void {
    const frame=(now:number)=>{
      if(this.disposed) return;
      this.render(now);
      this.raf=requestAnimationFrame(frame);
    };
    this.raf=requestAnimationFrame(frame);
  }

  dispose(): void {
    this.disposed=true;
    cancelAnimationFrame(this.raf);
    for(const t of this.textures.values()) this.gl.deleteTexture(t);
    this.gl.deleteTexture(this.centerTexture);
    this.gl.deleteProgram(this.colorProgram.program);
    this.gl.deleteProgram(this.textureProgram.program);
  }

  setPointer(x:number,y:number): void {
    this.pointerX=Math.max(-1,Math.min(1,x));
    this.pointerY=Math.max(-1,Math.min(1,y));
  }

  setScene(next: BoardScene, stepMs: number): void {
    const now=performance.now();
    this.motionEnabled=stepMs>0;
    for(const p of next.players){
      const m=this.motions.get(p.id);
      if(!m){ this.motions.set(p.id,{fromX:p.x,fromZ:p.z,toX:p.x,toZ:p.z,startedAt:now,duration:1}); continue; }
      if(Math.abs(m.toX-p.x)>.001 || Math.abs(m.toZ-p.z)>.001){
        const current=this.motionPosition(m,now);
        this.motions.set(p.id,{fromX:current[0],fromZ:current[1],toX:p.x,toZ:p.z,startedAt:now,duration:stepMs<=0 ? 0 : Math.max(120,stepMs*.86)});
      }
    }
    const cellsChanged=next.cells.length!==this.scene.cells.length || next.cells.some((c,i)=>{
      const old=this.scene.cells[i];
      return !old || old.label!==c.label || old.sublabel!==c.sublabel || old.icon!==c.icon || old.bg!==c.bg || old.bg2!==c.bg2;
    });
    this.scene=next;
    if(cellsChanged) this.rebuildCellTextures();
  }

  private motionPosition(m:MotionState, now:number): readonly [number,number] {
    if(m.duration<=0) return [m.toX,m.toZ];
    const t=smoothstep01((now-m.startedAt)/m.duration);
    return [lerp(m.fromX,m.toX,t),lerp(m.fromZ,m.toZ,t)];
  }

  private rebuildCellTextures(): void {
    for(const t of this.textures.values()) this.gl.deleteTexture(t);
    this.textures.clear();
    for(const c of this.scene.cells) this.textures.set(c.position,createTexture(this.gl,cellCanvas(c)));
  }

  private resize(): void {
    const dpr=Math.min(window.devicePixelRatio || 1,1.75);
    const rect=this.canvas.getBoundingClientRect();
    const w=Math.max(1,Math.round(rect.width*dpr));
    const h=Math.max(1,Math.round(rect.height*dpr));
    if(this.canvas.width!==w || this.canvas.height!==h){ this.canvas.width=w; this.canvas.height=h; }
    this.gl.viewport(0,0,w,h);
  }

  private matrices(): {projection:Mat4;view:Mat4} {
    const aspect=this.canvas.width/Math.max(1,this.canvas.height);
    const projection=perspective(42*Math.PI/180,aspect,.1,60);
    const eye:Vec3=[this.pointerX*.55,8.7-this.pointerY*.25,10.8+this.pointerY*.35];
    const target:Vec3=[this.pointerX*.12,.1,this.pointerY*.12];
    return {projection,view:lookAt(eye,target,[0,1,0])};
  }

  private drawColor(g:GLGeometry, model:Mat4, color:string, alpha:number, projection:Mat4, view:Mat4): void {
    const gl=this.gl,p=this.colorProgram;
    gl.useProgram(p.program);
    bindGeometry(gl,p,g);
    gl.uniformMatrix4fv(p.uProjection,false,projection);
    gl.uniformMatrix4fv(p.uView,false,view);
    gl.uniformMatrix4fv(p.uModel,false,model);
    const rgb=hexToRgb(color);
    gl.uniform3f(p.uColor!,rgb[0],rgb[1],rgb[2]);
    gl.uniform1f(p.uAlpha!,alpha);
    gl.drawElements(gl.TRIANGLES,g.count,gl.UNSIGNED_SHORT,0);
  }

  private drawTexture(g:GLGeometry, model:Mat4, texture:WebGLTexture, projection:Mat4, view:Mat4): void {
    const gl=this.gl,p=this.textureProgram;
    gl.useProgram(p.program);
    bindGeometry(gl,p,g);
    gl.uniformMatrix4fv(p.uProjection,false,projection);
    gl.uniformMatrix4fv(p.uView,false,view);
    gl.uniformMatrix4fv(p.uModel,false,model);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.uniform1i(p.uTexture!,0);
    gl.drawElements(gl.TRIANGLES,g.count,gl.UNSIGNED_SHORT,0);
  }

  private drawBoard(projection:Mat4,view:Mat4,now:number): void {
    this.drawColor(this.box,mat4TRS([0,-.34,0],[9.75,.58,9.75]),"#5c3a18",1,projection,view);
    this.drawColor(this.box,mat4TRS([0,-.015,0],[9.18,.12,9.18]),"#c9ab75",1,projection,view);
    this.drawColor(this.box,mat4TRS([0,.055,0],[7.05,.09,7.05]),"#efe3cc",1,projection,view);
    this.drawTexture(this.plane,mat4TRS([0,.106,0],[6.65,1,6.65]),this.centerTexture,projection,view);

    const preview=new Set(this.scene.previewPath);
    for(const cell of this.scene.cells){
      const arrival=this.scene.arrivalCell===cell.position;
      const selected=this.scene.highlightedCell===cell.position || preview.has(cell.position);
      const pulse=arrival && this.motionEnabled ? 1+Math.sin(now*.009)*.035 : 1;
      const lift=arrival ? .10 : selected ? .05 : 0;
      this.drawColor(this.box,mat4TRS([cell.x,.235+lift,cell.z],[1.02*pulse,.28,1.02*pulse],cell.rotationY),cell.bg2,1,projection,view);
      if(arrival || selected){
        this.drawColor(this.box,mat4TRS([cell.x,.385+lift,cell.z],[1.085*pulse,.025,1.085*pulse],cell.rotationY),cell.accent,arrival ? .8 : .42,projection,view);
      }
      const tex=this.textures.get(cell.position);
      if(tex) this.drawTexture(this.plane,mat4TRS([cell.x,.386+lift,cell.z],[.96*pulse,1,.96*pulse],cell.rotationY),tex,projection,view);
      if(cell.ownerColor){
        const [mx,mz]=localOffset(cell.x,cell.z,cell.rotationY,.34,.34);
        this.drawColor(this.cylinder,mat4TRS([mx,.51+lift,mz],[.16,.13,.16],cell.rotationY),cell.ownerColor,1,projection,view);
        this.drawColor(this.cylinder,mat4TRS([mx,.585+lift,mz],[.11,.025,.11],cell.rotationY),"#ffffff",.82,projection,view);
      }
    }
  }

  private drawPlayer(p:ScenePlayer,now:number,projection:Mat4,view:Mat4): void {
    const motion=this.motions.get(p.id);
    const [x,z]=motion ? this.motionPosition(motion,now) : [p.x,p.z];
    const face=Math.atan2(-x,-z);
    const bob=this.motionEnabled ? (p.active ? Math.sin(now*.004)*.045 : Math.sin(now*.002+p.id.length)*.015) : 0;
    const s=p.size;
    const skin="#d8a47f";
    const [sx,sz]=localOffset(x,z,face,0,.11*s);

    // contact shadow
    this.drawColor(this.cylinder,mat4TRS([x,.48,z],[.43*s,.025,.32*s],face),"#2a2018",.24,projection,view);

    // robe / thobe
    const bodyColor=p.outfit==="thobe_ghutra" ? "#f3efe5" : p.color;
    this.drawColor(this.robe,mat4TRS([x,.91+bob,z],[.64*s,.86*s,.64*s],face),bodyColor,1,projection,view);

    // arms
    const [lax,laz]=localOffset(x,z,face,-.29*s,.02*s);
    const [rax,raz]=localOffset(x,z,face,.29*s,.02*s);
    this.drawColor(this.cylinder,mat4TRS([lax,.98+bob,laz],[.12*s,.58*s,.12*s],face-.18),bodyColor,1,projection,view);
    this.drawColor(this.cylinder,mat4TRS([rax,.98+bob,raz],[.12*s,.58*s,.12*s],face+.18),bodyColor,1,projection,view);

    if(p.outfit==="abaya_hijab" || p.outfit==="jilbab"){
      // hijab / jilbab outer shell, then a plain faceless oval
      this.drawColor(this.sphere,mat4TRS([x,1.53+bob,z],[.72*s,.78*s,.68*s],face),p.color,1,projection,view);
      this.drawColor(this.sphere,mat4TRS([sx,1.54+bob,sz],[.38*s,.43*s,.24*s],face),skin,1,projection,view);
      if(p.outfit==="jilbab"){
        this.drawColor(this.robe,mat4TRS([x,1.28+bob,z],[.76*s,.58*s,.72*s],face),p.color,1,projection,view);
      }
    } else {
      this.drawColor(this.sphere,mat4TRS([x,1.52+bob,z],[.45*s,.50*s,.45*s],face),skin,1,projection,view);
      if(p.outfit==="qamis_kufi"){
        this.drawColor(this.cylinder,mat4TRS([x,1.81+bob,z],[.37*s,.13*s,.37*s],face),"#f3efe5",1,projection,view);
      } else {
        // ghutra + agal
        this.drawColor(this.sphere,mat4TRS([x,1.62+bob,z],[.56*s,.40*s,.54*s],face),"#f7f4ed",1,projection,view);
        this.drawColor(this.cylinder,mat4TRS([x,1.80+bob,z],[.43*s,.055*s,.43*s],face),"#24221f",1,projection,view);
      }
    }

    // active marker as a floating gold ring/disc
    if(p.active){
      const glow=this.motionEnabled ? .75+Math.sin(now*.006)*.18 : .82;
      this.drawColor(this.cylinder,mat4TRS([x,2.08+bob,z],[.18*s,.035*s,.18*s],face),"#d4a017",glow,projection,view);
    }
  }

  private render(now:number): void {
    this.lastFrame=now;
    this.resize();
    const gl=this.gl;
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    const {projection,view}=this.matrices();
    this.drawBoard(projection,view,now);
    for(const p of this.scene.players) this.drawPlayer(p,now,projection,view);
  }
}
