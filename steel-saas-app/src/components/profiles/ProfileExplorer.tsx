"use client";
import { useState } from "react";
import { sectionSeedV1 } from "@/domain/sections/sectionSeed.v1";
import ProfileViewer from "./ProfileViewer";

export default function ProfileExplorer() {
  const [designation, setDesignation] = useState("W12x40");
  const section = sectionSeedV1.find(s=>s.designation===designation)!;
  return <div className="profile-explorer-grid">
    <div className="profile-intro">
      <span className="eyebrow">REFERENCE LIBRARY / 01</span>
      <h1>Steel, in<br /><span>every dimension.</span></h1>
      <p>Inspect the actual proportions behind your calculation. Explore flange and web geometry, rotate the member, or look directly through its cross-section.</p>
      <label className="profile-selector">Reference profile<select value={designation} onChange={e=>setDesignation(e.target.value)}>
        <optgroup label="AISC · imperial">{sectionSeedV1.filter(s=>s.standard==='AISC_360_22').map(s=><option key={s.designation} value={s.designation}>{s.designation} — wide flange</option>)}</optgroup>
        <optgroup label="CSA · metric">{sectionSeedV1.filter(s=>s.standard==='CSA_S16_19').map(s=><option key={s.designation} value={s.designation}>{s.designation} — wide flange</option>)}</optgroup>
      </select></label>
      <div className="profile-reference"><span>REFERENCE</span><p>{section.sourceNote}</p><p>Yield strength: {section.fy} {section.unitSystem==='metric'?'MPa':'ksi'} · {section.sectionDbVersion}</p></div>
      <p className="profile-note">The current AISC reference entry is W12×40. This is a nominal dimensional visualization, not a fabrication model or verification of all AISC design checks.</p>
    </div>
    <ProfileViewer profile={section} standard={section.standard==='AISC_360_22'?'AISC · W-shape':'CSA · W-shape'} />
  </div>;
}
