import { randomUUID } from "node:crypto";
import { existsSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseAiscCatalog } from "./aiscCatalog";

export function writeAiscActivation(input: unknown, confirmedRights: boolean,
  output = fileURLToPath(new URL("../src/domain/sections/aiscCatalog.generated.json", import.meta.url))) {
  if (!confirmedRights) throw new Error("Confirm data-use rights before catalog activation");
  const sections = parseAiscCatalog(input);
  const temporary = `${output}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temporary, `${JSON.stringify(input, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    renameSync(temporary, output);
  } finally {
    if (existsSync(temporary)) unlinkSync(temporary);
  }
  return { sections: sections.length, sectionDbVersion: sections[0].sectionDbVersion };
}
