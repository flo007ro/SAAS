import { readFileSync, statSync } from "node:fs";
import { writeAiscActivation } from "./aiscActivation";

try {
  const [path, confirmation, ...extra] = process.argv.slice(2);
  if (!path || confirmation !== "--confirm-data-use-rights" || extra.length) {
    throw new Error("Expected local catalog path and rights confirmation");
  }
  if (statSync(path).size > 5_000_000) throw new Error("Catalog exceeds 5 MB limit");
  const result = writeAiscActivation(JSON.parse(readFileSync(path, "utf8")), true);
  console.log(JSON.stringify({ ...result, mode: "local-build-catalog-activated" }));
  console.warn("Local source updated only. Rebuild/restart to consume it; nothing deployed and no SQL executed.");
} catch {
  console.error("Activation failed: supply a validated local catalog and --confirm-data-use-rights. Active catalog was not replaced unless validation and the atomic write succeeded.");
  process.exitCode = 1;
}
