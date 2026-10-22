import { describe, expect, it } from "vitest";
import { extrudeProfile, faceNormal, rotatePoint, validProfile, wProfileOutline } from "../../src/domain/sections/profileGeometry";
import { sectionSeedV1 } from "../../src/domain/sections/sectionSeed.v1";

describe("nominal wide-flange 3D geometry", () => {
  for (const profile of sectionSeedV1) {
    it(`preserves flange/web dimensions for ${profile.designation}`, () => {
      const outline = wProfileOutline(profile);
      const xs = outline.map(p=>p[0]), ys = outline.map(p=>p[1]);
      expect(Math.max(...xs)-Math.min(...xs)).toBe(profile.flangeWidth);
      expect(Math.max(...ys)-Math.min(...ys)).toBe(profile.depth);
      expect(outline[2][1]-outline[1][1]).toBeCloseTo(-profile.flangeThickness);
      expect(outline[3][0]*2).toBeCloseTo(profile.webThickness);
      const area = Math.abs(outline.reduce((sum,p,i)=>{const next=outline[(i+1)%outline.length];return sum+p[0]*next[1]-next[0]*p[1];},0))/2;
      expect(area).toBeCloseTo(2*profile.flangeWidth*profile.flangeThickness + (profile.depth-2*profile.flangeThickness)*profile.webThickness);
      const faces = extrudeProfile(profile);
      expect(faces).toHaveLength(14);
      expect(faceNormal(faces[0].points)[2]).toBeCloseTo(1);
      expect(faceNormal(faces[1].points)[2]).toBeCloseTo(-1);
      for(const face of faces) expect(Math.hypot(...faceNormal(face.points))).toBeCloseTo(1);
    });
  }
  it("rejects impossible or nonfinite geometry", () => {
    const base = sectionSeedV1[0];
    for (const profile of [{...base,depth:0},{...base,webThickness:base.flangeWidth},{...base,flangeThickness:base.depth},{...base,depth:Infinity}]) {
      expect(validProfile(profile)).toBe(false);
      expect(()=>extrudeProfile(profile)).toThrow();
    }
  });
  it("rotates without stretching the nominal shape", () => {
    const point: [number,number,number] = [2,3,7];
    expect(Math.hypot(...rotatePoint(point,.7,-.5))).toBeCloseTo(Math.hypot(...point));
  });
});
