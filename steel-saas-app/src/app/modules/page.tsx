import Link from "next/link";
import { engineeringModules } from "@/domain/engineeringModules";

export default function ModulesPage() {
  return <main className="modules-page">
    <span className="eyebrow">ENGINEERING WORKSPACE</span>
    <h1>The next design modules.</h1>
    <p className="modules-lead">Developed in stages, with explicit calculation scope and versioned results. Brace member screening is the first implementation; the remaining modules require additional verified reference data and benchmarks.</p>
    <div className="modules-grid">{engineeringModules.map(module => <section className="module-card" key={module.id} id={module.id}>
      <span className="eyebrow">{module.icon} {module.status}</span>
      <h2>{module.title}</h2><p>{module.scope}</p>
      <h3>Required inputs</h3><ul>{module.inputs.map(input => <li key={input}>{input}</li>)}</ul>
      <h3>Remaining scope</h3><p>{module.remaining}</p>
      {module.id === "brace" && <><Link className="steel-btn" href="/projects">Open a project to run brace member checks →</Link><p className="profile-note">Requires the additive brace enum update on the application database. Results require engineering review and do not approve a brace, connection or seismic system.</p></>}
    </section>)}</div>
  </main>;
}
