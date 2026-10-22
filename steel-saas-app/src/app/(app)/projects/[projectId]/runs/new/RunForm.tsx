"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CodeProfile } from "@/domain/codeProfiles";
import type { UnitSystem } from "@/domain/units";
import { buildRunInput, parseSectionOptions, runFields, type RunType, type SectionOption } from "@/domain/runForm";

export default function RunForm({ projectId, projectName, unitSystem, codeProfile }: {
  projectId: string; projectName: string; unitSystem: UnitSystem; codeProfile: CodeProfile;
}) {
  const router = useRouter();
  const [type, setType] = useState<RunType | "">("");
  const [title, setTitle] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [section, setSection] = useState("");
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [sectionError, setSectionError] = useState("");
  const [sectionsLoading, setSectionsLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState("");
  const [failedRunId, setFailedRunId] = useState("");
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    setSection("");
    setSections([]);
    setSectionsLoading(true);
    setSectionError("");
    async function load() {
      try {
        const response = await fetch(`/api/sections?unitSystem=${unitSystem}&standard=${codeProfile}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Sections could not be loaded. Check your session and try again.");
        const options = parseSectionOptions(await response.json(), codeProfile, unitSystem);
        if (!controller.signal.aborted) setSections(options);
      } catch (err) {
        if (!controller.signal.aborted) setSectionError(err instanceof Error ? err.message : "Invalid section response. Please retry.");
      } finally {
        if (!controller.signal.aborted) setSectionsLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [projectId, unitSystem, codeProfile, retry]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || !type) return;
    setError("");
    setFailedRunId("");
    if (!sections.some(s => s.designation === section)) { setError("Select an available steel section."); return; }
    if (!title.trim()) { setError("Enter a run title."); return; }
    try {
      const inputJson = buildRunInput(type, unitSystem, codeProfile, fields, section);
      submitting.current = true;
      setPending(true);
      const response = await fetch("/api/design-runs", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, projectId, title: title.trim(), inputJson }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(typeof data?.error === "string" ? data.error : "Could not save the run. Your inputs are retained.");
      if (typeof data?.id !== "string") throw new Error("The save response was incomplete. Check the project before retrying to avoid a duplicate run.");
      if (data.status === "failed") {
        setFailedRunId(data.id);
        throw new Error(`Calculation failed (${typeof data.errorCode === "string" ? data.errorCode : "ENGINE_ERROR"}). Your inputs are retained; correct them and retry.`);
      }
      if (data.status !== "complete") throw new Error("The run is still processing. Check the project before retrying.");
      router.push(`/projects/${projectId}/runs/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request interrupted. Your inputs are retained; check the project before retrying.");
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  return <main className="run-editor">
    <style>{`
      .run-editor { color: #e0f2fe; background: #08111f; max-width: 760px; margin: 32px auto; padding: clamp(20px, 4vw, 40px); border: 1px solid #334155; border-radius: 12px; font-family: system-ui, sans-serif; position: relative; }
      .run-editor a { color: #7dd3fc; }
      .run-editor p { color: #cbd5e1; line-height: 1.6; }
      .run-editor form { display: grid; gap: 20px; }
      .run-editor label { display: grid; gap: 8px; font-size: 15px; font-weight: 500; }
      .run-editor input, .run-editor select { width: 100%; box-sizing: border-box; padding: 12px; background: #0f1c2f; color: #f0f9ff; border: 1px solid #64748b; border-radius: 6px; font-size: 16px; }
      .run-editor input:focus-visible, .run-editor select:focus-visible, .run-editor button:focus-visible { outline: 2px solid #7dd3fc; outline-offset: 3px; }
      .run-editor button { background: #075985; color: white; border: 1px solid #38bdf8; padding: 12px 18px; border-radius: 6px; font: inherit; cursor: pointer; }
      .run-editor button:disabled { opacity: .6; cursor: wait; }
      .run-editor [role=alert] { color: #fecaca; background: #451a1a; padding: 12px; border-radius: 6px; overflow-wrap: anywhere; }
      .run-editor fieldset { border: 0; padding: 0; margin: 0; display: grid; gap: 20px; min-width: 0; }
    `}</style>
    <Link href={`/projects/${projectId}`}>← {projectName}</Link>
    <h1>New design run</h1>
    <p>Project settings: <strong>{codeProfile === "CSA_S16_19" ? "CSA S16-19" : "AISC 360-22"}</strong> · <strong>{unitSystem}</strong>.<br />
      Code and units are inherited from the project. Enter pre-factored positive load magnitudes.</p>
    {error && <div role="alert">{error} {failedRunId && <Link href={`/projects/${projectId}/runs/${failedRunId}`}>View saved failed run</Link>}</div>}
    <form onSubmit={submit}>
      <fieldset disabled={pending}>
        <label>Run title<input name="title" required maxLength={200} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Roof beam B1" /></label>
        <label>Calculation module<select name="type" required value={type} onChange={e => setType(e.target.value as RunType)}>
          <option value="" disabled>Select module…</option>
          <option value="beam">Beam — major-axis flexure and shear</option>
          <option value="column">Column — axial compression</option>
          <option value="base_plate">Axial base plate — bearing and required thickness</option>
        </select></label>
        {type && <>
          <label>{type === "base_plate" ? "Column section" : "Steel section"}
            <select name="selectedSection" required value={section} disabled={sectionsLoading || !!sectionError || !sections.length} onChange={e => setSection(e.target.value)}>
              <option value="" disabled>{sectionsLoading ? "Loading sections…" : "Select section…"}</option>
              {sections.map(s => <option key={`${s.standard}:${s.unitSystem}:${s.designation}`} value={s.designation}>{s.designation}</option>)}
            </select>
          </label>
          {sectionError && <div role="alert">Section data is unavailable. Your inputs are retained. <button type="button" onClick={() => setRetry(n => n + 1)}>Retry section loading</button></div>}
          {!sectionsLoading && !sectionError && !sections.length && <p role="alert">No reference sections support this code and unit combination. No calculation will be saved. Available reference data: CSA metric and AISC imperial.</p>}
          {runFields(type, unitSystem).map(field => <label key={field.key}>{field.label} [{field.unit}]
            <input name={field.key} type="number" inputMode="decimal" required step="any" min="0" value={fields[field.key] ?? ""}
              onChange={e => setFields(prev => ({ ...prev, [field.key]: e.target.value }))} />
          </label>)}
          <p>{type === "beam" ? "Scope: elastic major-axis flexure and simplified web shear. Lateral-torsional buckling and section classification are not checked." : type === "column" ? "Scope: weak-axis flexural buckling under axial compression. Local/torsional buckling and combined bending are not checked." : "Scope: concentric axial compression only. Reports required thickness; supplied thickness, anchors, welds, uplift and moment are not checked."}</p>
        </>}
      </fieldset>
      <button type="submit" disabled={pending || !type || !section || sectionsLoading || !!sectionError}>{pending ? "Calculating…" : "Run calculation"}</button>
    </form>
  </main>;
}
