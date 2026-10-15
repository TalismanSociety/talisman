import { readFileSync } from "node:fs"
import { join, relative } from "node:path"

import { describe, expect, it } from "vitest"

import { listSourceFiles, REPO_ROOT } from "./listSourceFiles"

/**
 * Analytics has no id of the install. The Gandalf install id exists to rate limit Talisman's own
 * endpoints: an event that carried it, or a request that went through `gandalfFetch`, would tie a
 * user's API traffic to their usage. So analytics code never imports Gandalf, and its transport
 * sends no credential.
 */
const SRC = join(REPO_ROOT, "apps/extension/src")
const ANALYTICS = [
  "core/domains/analytics",
  "common/analytics",
  "ui/hooks/analytics",
  "ui/api/track.ts",
  "ui/api/errorReporting.ts",
].flatMap((path) => (path.endsWith(".ts") ? [join(SRC, path)] : listSourceFiles(join(SRC, path))))

const GANDALF = /gandalf/i
const CREDENTIAL = /authorization|credentials\s*:|cookie/i

describe("analytics keeps to itself", () => {
  it("finds the analytics source", () => {
    expect(ANALYTICS.length).toBeGreaterThan(50)
  })

  it("never touches Gandalf: not its store, its install id or its fetch", () => {
    const offenders = ANALYTICS.filter((file) => GANDALF.test(readFileSync(file, "utf8")))
    expect(offenders.map((file) => relative(SRC, file))).toEqual([])
  })

  it("sends no credential with a batch", () => {
    const transport = readFileSync(join(SRC, "core/domains/analytics/transport.ts"), "utf8")
    expect(transport).not.toMatch(CREDENTIAL)
  })
})
