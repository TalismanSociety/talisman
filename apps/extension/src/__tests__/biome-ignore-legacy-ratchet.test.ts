import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { listSourceFiles, REPO_ROOT } from "./listSourceFiles"

/**
 * A `biome-ignore` comment must say why the rule does not apply in this case. "legacy" says
 * nothing, yet most suppressions use it, so new code copies it.
 *
 * The count of bare "legacy" suppressions may only go down. When you remove some, lower
 * `LEGACY_SUPPRESSIONS` to the new count. Never raise it: fix the code, or write the real reason.
 */
const LEGACY_SUPPRESSIONS = 257

const LEGACY_REASON = /biome-ignore(?:-all|-start)?[^:\n]*:\s*legacy\s*(?:\*\/|$)/gim

const WORKSPACES = ["apps", "packages"].flatMap((root) =>
  readdirSync(join(REPO_ROOT, root)).map((name) => join(REPO_ROOT, root, name))
)

const countLegacyReasons = (code: string) => code.match(LEGACY_REASON)?.length ?? 0

describe("biome-ignore reasons", () => {
  it("counts only a bare legacy reason", () => {
    expect(countLegacyReasons("// biome-ignore lint/suspicious/noExplicitAny: legacy")).toBe(1)
    expect(countLegacyReasons("{/* biome-ignore lint/a11y/useButtonType: legacy */}")).toBe(1)
    expect(countLegacyReasons("// biome-ignore-all lint/style/noNonNullAssertion: Legacy")).toBe(1)
    expect(
      countLegacyReasons("// biome-ignore lint/suspicious/noExplicitAny: legacy api returns any")
    ).toBe(0)
    expect(countLegacyReasons("// biome-ignore lint/complexity/noBannedTypes: legacy")).toBe(1)
  })

  it("never add a legacy suppression", () => {
    const count = WORKSPACES.flatMap((dir) => listSourceFiles(dir, { includeTests: true }))
      .filter((file) => file !== import.meta.filename)
      .reduce((total, file) => total + countLegacyReasons(readFileSync(file, "utf8")), 0)

    expect(count, "lower LEGACY_SUPPRESSIONS when you remove some, never raise it").toBe(
      LEGACY_SUPPRESSIONS
    )
  })
})
