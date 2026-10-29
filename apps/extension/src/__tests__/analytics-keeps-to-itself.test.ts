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
const MESSAGE_COVERAGE = join(SRC, "core/domains/analytics/messageCoverage.ts")
const GANDALF_MESSAGE_COVERAGE_KEY = `"pri(gandalf.accessToken.get)":`
const CREDENTIAL = /authorization|credentials\s*:|cookie/i

const touchesGandalf = (file: string, code: string) =>
  GANDALF.test(
    stripComments(file === MESSAGE_COVERAGE ? code.replace(GANDALF_MESSAGE_COVERAGE_KEY, "") : code)
  )

describe("analytics keeps to itself", () => {
  it("finds the analytics source", () => {
    expect(ANALYTICS.length).toBeGreaterThan(50)
  })

  it("never touches Gandalf: not its store, its install id or its fetch", () => {
    const offenders = ANALYTICS.filter((file) => touchesGandalf(file, readFileSync(file, "utf8")))
    expect(offenders.map((file) => relative(SRC, file))).toEqual([])
  })

  const ANALYTICS_FILE = "core/domains/analytics/transport.ts"
  const COVERAGE_FILE = relative(SRC, MESSAGE_COVERAGE)
  const COVERAGE_ENTRY = `{\n  "pri(gandalf.accessToken.get)": { exempt: "housekeeping" },\n}`

  it.each([
    [ANALYTICS_FILE, `import { gandalfStore } from "@core/domains/gandalf/store"`],
    [ANALYTICS_FILE, "await import(`@core/domains/gandalf/accessToken`)"],
    [ANALYTICS_FILE, `getGandalfAuthorization()`],
    [ANALYTICS_FILE, `sendMessage(on ? "pri(gandalf.accessToken.get)" : "pri(keepalive)")`],
    [ANALYTICS_FILE, `track("event", { "gandalf_token": token })`],
    [ANALYTICS_FILE, COVERAGE_ENTRY],
    [COVERAGE_FILE, `{ "@core/domains/gandalf/store": true }`],
    [COVERAGE_FILE, `${COVERAGE_ENTRY}\nsendMessage("pri(gandalf.accessToken.get)")`],
  ])("sees Gandalf in %s: %j", (file, code) => {
    expect(touchesGandalf(join(SRC, file), code)).toBe(true)
  })

  it.each([
    [ANALYTICS_FILE, `// gandalf`],
    [COVERAGE_FILE, COVERAGE_ENTRY],
  ])("lets through, in %s: %j", (file, code) => {
    expect(touchesGandalf(join(SRC, file), code)).toBe(false)
  })

  it("sends no credential with a batch", () => {
    const transport = readFileSync(join(SRC, "core/domains/analytics/transport.ts"), "utf8")
    expect(transport).not.toMatch(CREDENTIAL)
  })
})
