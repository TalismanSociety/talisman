import { readFileSync } from "node:fs"
import { join, relative } from "node:path"

import { describe, expect, it } from "vitest"

import { stripComments } from "./analyticsScan"
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
const QUOTED_OBJECT_KEY = /(?<=(?:^|[{,])\s*)(?:"[^"\n]*"|'[^'\n]*')(?=[ \t]*:)/gm
const CREDENTIAL = /authorization|credentials\s*:|cookie/i

const touchesGandalf = (code: string) =>
  GANDALF.test(stripComments(code).replace(QUOTED_OBJECT_KEY, ""))

describe("analytics keeps to itself", () => {
  it("finds the analytics source", () => {
    expect(ANALYTICS.length).toBeGreaterThan(50)
  })

  it("never touches Gandalf: not its store, its install id or its fetch", () => {
    const offenders = ANALYTICS.filter((file) => touchesGandalf(readFileSync(file, "utf8")))
    expect(offenders.map((file) => relative(SRC, file))).toEqual([])
  })

  it.each([
    `import { gandalfStore } from "@core/domains/gandalf/store"`,
    "await import(`@core/domains/gandalf/accessToken`)",
    `getGandalfAuthorization()`,
    `sendMessage("pri(gandalf.accessToken.get)")`,
    `sendMessage(on ? "pri(gandalf.accessToken.get)" : "pri(keepalive)")`,
    `sendMessage(on ?\n  "pri(gandalf.accessToken.get)"\n  : "pri(keepalive)")`,
  ])("sees Gandalf in %j", (code) => {
    expect(touchesGandalf(code)).toBe(true)
  })

  it.each([
    `// gandalf`,
    `const coverage = {\n  "pri(gandalf.accessToken.get)": { exempt: "housekeeping" },\n}`,
    `const coverage = { 'pri(keepalive)': 1, "pri(gandalf.accessToken.get)": 2 }`,
  ])("lets a message coverage key or a comment through: %j", (code) => {
    expect(touchesGandalf(code)).toBe(false)
  })

  it("sends no credential with a batch", () => {
    const transport = readFileSync(join(SRC, "core/domains/analytics/transport.ts"), "utf8")
    expect(transport).not.toMatch(CREDENTIAL)
  })
})
