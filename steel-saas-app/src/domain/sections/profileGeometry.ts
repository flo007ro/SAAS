import type { UnitSystem } from "../units";

export type ProfileGeometry = {
  designation: string;
  unitSystem: UnitSystem;
  depth: number;
  flangeWidth: number;
  flangeThickness: number;
  webThickness: number;
};
export type Point3 = [number, number, number];
export type ProfileFace = { points: Point3[]; cap: boolean };

export function validProfile(p: ProfileGeometry) {
  return [p.depth, p.flangeWidth, p.flangeThickness, p.webThickness].every(n => Number.isFinite(n) && n > 0)
    && p.depth > 2 * p.flangeThickness && p.flangeWidth > p.webThickness;
}

// Nominal W-shape envelope. Root fillets, rolling radii and tolerances are not in
// the current reference schema and are deliberately not invented here.
export function wProfileOutline(p: ProfileGeometry): [number, number][] {
  if (!validProfile(p)) throw new Error("Invalid wide-flange geometry");
  const b = p.flangeWidth / 2, h = p.depth / 2, w = p.webThickness / 2, f = p.flangeThickness;
  return [[-b,h],[b,h],[b,h-f],[w,h-f],[w,-h+f],[b,-h+f],
    [b,-h],[-b,-h],[-b,-h+f],[-w,-h+f],[-w,h-f],[-b,h-f]];
}

export function extrudeProfile(p: ProfileGeometry, length = p.depth * 2.4): ProfileFace[] {
  if (!Number.isFinite(length) || length <= 0) throw new Error("Invalid display length");
  const outline = wProfileOutline(p);
  const front = outline.map(([x,y]): Point3 => [x,y,length / 2]);
  const rear = outline.map(([x,y]): Point3 => [x,y,-length / 2]);
  return [
    { points: [...front].reverse(), cap: true }, { points: rear, cap: true },
    ...outline.map((_,i) => ({ points: [rear[i],front[i],front[(i+1)%12],rear[(i+1)%12]], cap: false })),
  ];
}

export function rotatePoint([x,y,z]: Point3, pitch: number, yaw: number): Point3 {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cx = Math.cos(pitch), sx = Math.sin(pitch);
  const u = x * cy + z * sy, v = -x * sy + z * cy;
  return [u, y * cx - v * sx, y * sx + v * cx];
}

export function faceNormal(points: Point3[]): Point3 {
  // Newell normal remains correct for the concave I-shaped end caps.
  const cross: Point3 = [0,0,0];
  points.forEach((p,i) => {
    const q = points[(i+1)%points.length];
    cross[0] += (p[1]-q[1])*(p[2]+q[2]);
    cross[1] += (p[2]-q[2])*(p[0]+q[0]);
    cross[2] += (p[0]-q[0])*(p[1]+q[1]);
  });
  const magnitude = Math.hypot(...cross);
  return cross.map(n => n / magnitude) as Point3;
}
