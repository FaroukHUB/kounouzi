export interface GeometryData {
  readonly positions: Float32Array;
  readonly normals: Float32Array;
  readonly uvs: Float32Array;
  readonly indices: Uint16Array;
}

function pack(pos: number[], norm: number[], uv: number[], idx: number[]): GeometryData {
  return { positions: new Float32Array(pos), normals: new Float32Array(norm), uvs: new Float32Array(uv), indices: new Uint16Array(idx) };
}

export function boxGeometry(): GeometryData {
  const p: number[] = [];
  const n: number[] = [];
  const uv: number[] = [];
  const i: number[] = [];
  const faces = [
    { normal:[0,0,1],  verts:[[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]] },
    { normal:[0,0,-1], verts:[[.5,-.5,-.5],[-.5,-.5,-.5],[-.5,.5,-.5],[.5,.5,-.5]] },
    { normal:[1,0,0],  verts:[[.5,-.5,.5],[.5,-.5,-.5],[.5,.5,-.5],[.5,.5,.5]] },
    { normal:[-1,0,0], verts:[[-.5,-.5,-.5],[-.5,-.5,.5],[-.5,.5,.5],[-.5,.5,-.5]] },
    { normal:[0,1,0],  verts:[[-.5,.5,.5],[.5,.5,.5],[.5,.5,-.5],[-.5,.5,-.5]] },
    { normal:[0,-1,0], verts:[[-.5,-.5,-.5],[.5,-.5,-.5],[.5,-.5,.5],[-.5,-.5,.5]] },
  ] as const;
  for (const face of faces) {
    const base = p.length / 3;
    for (const v of face.verts) {
      p.push(v[0],v[1],v[2]);
      n.push(face.normal[0],face.normal[1],face.normal[2]);
    }
    uv.push(0,0, 1,0, 1,1, 0,1);
    i.push(base,base+1,base+2, base,base+2,base+3);
  }
  return pack(p,n,uv,i);
}

export function planeGeometry(): GeometryData {
  return pack(
    [-.5,0,-.5, .5,0,-.5, .5,0,.5, -.5,0,.5],
    [0,1,0, 0,1,0, 0,1,0, 0,1,0],
    [0,1, 1,1, 1,0, 0,0],
    [0,1,2, 0,2,3],
  );
}

export function cylinderGeometry(segments = 24, topRadius = .5, bottomRadius = .5): GeometryData {
  const p:number[]=[]; const n:number[]=[]; const uv:number[]=[]; const idx:number[]=[];
  const sideStart = 0;
  for (let s=0; s<=segments; s+=1) {
    const a=(s/segments)*Math.PI*2;
    const c=Math.cos(a), z=Math.sin(a);
    const slope = bottomRadius - topRadius;
    const len = Math.hypot(c,z,slope) || 1;
    const nx=c/len, ny=slope/len, nz=z/len;
    p.push(c*bottomRadius,-.5,z*bottomRadius, c*topRadius,.5,z*topRadius);
    n.push(nx,ny,nz, nx,ny,nz);
    uv.push(s/segments,0, s/segments,1);
  }
  for (let s=0;s<segments;s+=1) {
    const a=sideStart+s*2, b=a+1, c=a+2, d=a+3;
    idx.push(a,c,b, b,c,d);
  }

  const addCap=(y:number,r:number,normalY:number)=>{
    const center=p.length/3;
    p.push(0,y,0); n.push(0,normalY,0); uv.push(.5,.5);
    const ring=p.length/3;
    for(let s=0;s<=segments;s+=1){
      const a=(s/segments)*Math.PI*2;
      const x=Math.cos(a)*r, z=Math.sin(a)*r;
      p.push(x,y,z); n.push(0,normalY,0); uv.push(.5+x/(2*r || 1),.5+z/(2*r || 1));
    }
    for(let s=0;s<segments;s+=1){
      if(normalY>0) idx.push(center,ring+s,ring+s+1);
      else idx.push(center,ring+s+1,ring+s);
    }
  };
  addCap(.5,topRadius,1);
  addCap(-.5,bottomRadius,-1);
  return pack(p,n,uv,idx);
}

export function sphereGeometry(latSegments=12, lonSegments=18): GeometryData {
  const p:number[]=[]; const n:number[]=[]; const uv:number[]=[]; const idx:number[]=[];
  for(let y=0;y<=latSegments;y+=1){
    const v=y/latSegments;
    const phi=v*Math.PI;
    const sy=Math.cos(phi);
    const sr=Math.sin(phi);
    for(let x=0;x<=lonSegments;x+=1){
      const u=x/lonSegments;
      const th=u*Math.PI*2;
      const sx=Math.cos(th)*sr;
      const sz=Math.sin(th)*sr;
      p.push(sx*.5,sy*.5,sz*.5);
      n.push(sx,sy,sz);
      uv.push(u,1-v);
    }
  }
  const stride=lonSegments+1;
  for(let y=0;y<latSegments;y+=1){
    for(let x=0;x<lonSegments;x+=1){
      const a=y*stride+x, b=a+stride, c=b+1, d=a+1;
      idx.push(a,b,d, d,b,c);
    }
  }
  return pack(p,n,uv,idx);
}
