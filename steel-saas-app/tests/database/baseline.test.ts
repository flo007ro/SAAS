import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("preserves the exact baseline bytes registered manually in Neon", () => {
  const sql = readFileSync(new URL("../../prisma/migrations/0_init/migration.sql", import.meta.url));
  expect(createHash("sha256").update(sql).digest("hex"))
    .toBe("8e22daa1d639d44d9ff416bdbfdadfa95a0799b9f27a29f6b902342c623452b9");
});
