"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { extrudeProfile, faceNormal, rotatePoint, validProfile, type ProfileGeometry } from "@/domain/sections/profileGeometry";

export default function ProfileViewer({ profile, standard }: { profile: ProfileGeometry; standard: string }) {
  const [view, setView] = useState({ pitch: -.32, yaw: -.58 });
  const [spinning, setSpinning] = useState(false);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const id = useId();
  const valid = validProfile(profile);
  const faces = useMemo(() => valid ? extrudeProfile(profile) : [], [profile, valid]);
  useEffect(() => {
    if (!spinning) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame: number;
    let previous = 0;
    const step = (time: number) => {
      if (!reduced.matches && previous) setView(v => ({ ...v, yaw: v.yaw + Math.min(time-previous,50) * .00025 }));
      previous = time;
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [spinning]);
  if (!valid) return <p role="status">Profile geometry is unavailable for this saved section.</p>;

  const scale = 270 / Math.hypot(profile.depth, profile.flangeWidth, profile.depth * 2.4);
  const projected = faces.map(face => {
    const points = face.points.map(p => rotatePoint(p, view.pitch, view.yaw));
    const normal = faceNormal(points);
    const light = Math.max(0, normal[0] * -.45 + normal[1] * .65 + normal[2] * .6);
    const shade = Math.round(82 + 112 * light);
    return { ...face, normal, points, depth: points.reduce((n,p) => n+p[2],0)/points.length, fill: `rgb(${shade-8},${shade+3},${shade+10})` };
  }).filter(face => face.normal[2] > .000001).sort((a,b) => a.depth-b.depth);
  const unit = profile.unitSystem === "metric" ? "mm" : "in";
  const dims = [["Depth · d",profile.depth], ["Flange width · bf",profile.flangeWidth], ["Web · tw",profile.webThickness], ["Flange · tf",profile.flangeThickness]] as const;
  return <section className="profile-viewer" aria-label={`${profile.designation} 3D profile`}>
    <div className="profile-viewer-heading"><div><span className="eyebrow">SECTION GEOMETRY</span><h2>{profile.designation.replace('x',' × ')}</h2></div><span className="profile-standard">{standard}</span></div>
    <div className="profile-stage">
      <svg viewBox="0 0 520 340" role="img" aria-labelledby={`${id}-title ${id}-desc`} tabIndex={0}
        style={{touchAction:"none", cursor: "grab"}}
        onKeyDown={e => {
          const delta: Record<string,[number,number]> = { ArrowLeft:[0,-.1], ArrowRight:[0,.1], ArrowUp:[-.1,0], ArrowDown:[.1,0] };
          if (delta[e.key]) { e.preventDefault(); setSpinning(false); const [p,y]=delta[e.key];setView(v=>({pitch: Math.max(-1.4,Math.min(1.4,v.pitch+p)), yaw:v.yaw+y})); }
        }}
        onPointerDown={e => {setSpinning(false); pointer.current={x:e.clientX,y:e.clientY};e.currentTarget.setPointerCapture(e.pointerId);}}
        onPointerMove={e => {const prev=pointer.current;if(!prev)return;const dx=e.clientX-prev.x,dy=e.clientY-prev.y;pointer.current={x:e.clientX,y:e.clientY};setView(v=>({pitch:Math.max(-1.4,Math.min(1.4,v.pitch+dy*.008)),yaw:v.yaw+dx*.008}));}}
        onPointerUp={()=>{pointer.current=null;}} onPointerCancel={()=>{pointer.current=null;}} onLostPointerCapture={()=>{pointer.current=null;}}>
        <title id={`${id}-title`}>{`${profile.designation} wide-flange steel profile, 3D nominal geometry`}</title>
        <desc id={`${id}-desc`}>Depth {profile.depth} {unit}, flange width {profile.flangeWidth} {unit}, web thickness {profile.webThickness} {unit}, flange thickness {profile.flangeThickness} {unit}. Drag or use arrow keys to rotate.</desc>
        <defs><radialGradient id={`${id}-light`}><stop offset="0" stopColor="#718796" stopOpacity=".16"/><stop offset="1" stopColor="#111820" stopOpacity="0"/></radialGradient></defs>
        <rect width="520" height="340" fill={`url(#${id}-light)`}/>
        <g stroke="#849aa8" strokeOpacity=".12" strokeWidth=".6">
          {[0,1,2,3,4,5,6,7,8].map(n=><path key={n} d={`M${n*65} 0V340 M0 ${n*45}H520`}/>)}
        </g>
        <ellipse cx="260" cy="303" rx="110" ry="14" fill="#000" opacity=".25"/>
        <g stroke="#d0dce3" strokeOpacity=".5" strokeWidth=".7" strokeLinejoin="round">
          {projected.map((face,i)=><polygon key={i} data-profile-face="true" points={face.points.map(([x,y])=>`${260+x*scale},${165-y*scale}`).join(' ')} fill={face.fill}/>)}
        </g>
        <text x="20" y="320" fill="#a5b6c1" fontSize="10" fontFamily="system-ui, sans-serif">NOMINAL W-SHAPE · {unit.toUpperCase()}</text>
        <g transform="translate(458 290)" strokeWidth="1.5" fill="none"><path d="M0 0h26" stroke="#c4a38a"/><path d="M0 0v-26" stroke="#9bb7aa"/><path d="M0 0l-18 14" stroke="#9bb0c6"/></g>
      </svg>
    </div>
    <div className="profile-controls" aria-label="Profile view controls">
      <button type="button" onClick={()=>{setSpinning(false);setView({pitch:-.32,yaw:-.58});}}>Isometric</button>
      <button type="button" onClick={()=>{setSpinning(false);setView({pitch:0,yaw:0});}}>Cross-section</button>
      <button type="button" aria-pressed={spinning} onClick={()=>setSpinning(s=>!s)}>{spinning?'Pause rotation':'Rotate'}</button>
    </div>
    <dl className="profile-dimensions">{dims.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value} <span>{unit}</span></dd></div>)}</dl>
    <p className="profile-note">Nominal flange and web dimensions from the reference section. Root fillets, rolling tolerances and connections are not modeled. Display length is illustrative.</p>
  </section>;
}
