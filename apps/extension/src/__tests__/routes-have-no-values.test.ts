// biome-ignore-all lint/suspicious/noTemplateCurlyInString: the fixtures are template-literal source text
import { readFileSync } from "node:fs"
import { join, relative } from "node:path"

import { isRouteWord } from "@common/analytics/screenPattern"
import { describe, expect, it } from "vitest"

import { routePathsIn, stripComments } from "./analyticsScan"
import { lineAt, listSourceFiles, REPO_ROOT } from "./listSourceFiles"

/**
 * `$screen_name` is the route pattern, so a route that holds a value (an address, a token id, a
 * hash, a number) would put that value in every screen event. A pattern holds lowercase words,
 * `:param` segments and `*`.
 *
 * A template may only splice a constant: SIGNING_TYPES.X, a *_PREFIX, or the parameter of a
 * `.map` over a constant array in the same file (the BITTENSOR_NETWORK_IDS routes).
 */
const SRC = join(REPO_ROOT, "apps/extension/src")

const CONSTANT = /^[A-Z][A-Z0-9_]*(?:\.[A-Z][A-Z0-9_]*)*$/

const problemsOf = (text: string, kind: "literal" | "template", code: string): string[] => {
  const problems: string[] = []
  const staticText = text.replace(/\$\{([^}]*)\}/g, (_, expression: string) => {
    const name = expression.trim()
    const mapped = new RegExp(`\\b[A-Z][A-Z0-9_]*\\.map\\(\\s*\\(?\\s*${name}\\b`).test(code)
    if (!CONSTANT.test(name) && !mapped)
      problems.push(
        `\${${name}} is not a constant. Use a ":param" segment and read it with useParams().`
      )
    return "x"
  })
  if (kind === "literal" || problems.length === 0)
    for (const segment of staticText.split("/")) {
      if (segment === "" || segment === "*" || segment === "x" || segment.startsWith(":")) continue
      if (!isRouteWord(segment))
        problems.push(
          `"${segment}" looks like a value, not a route word. Use ":param" and read it with useParams().`
        )
    }
  return problems
}

describe("route patterns", () => {
  it("hold words, :params and * only", () => {
    const violations = listSourceFiles(SRC).flatMap((file) => {
      const raw = readFileSync(file, "utf8")
      const code = stripComments(raw)
      return routePathsIn(code).flatMap(({ index, text, kind }) =>
        problemsOf(text, kind, code).map(
          (problem) =>
            `${relative(SRC, file)}:${lineAt(code, index)} <Route path=${JSON.stringify(text)}>: ${problem}`
        )
      )
    })
    expect(violations).toEqual([])
  })

  describe("problemsOf", () => {
    it.each([
      ["portfolio/tokens/:symbol", "literal"],
      ["*", "literal"],
      ["", "literal"],
      ["/", "literal"],
      ["${SIGNING_TYPES.ETH_SIGN}/:id", "template"],
      ["${AUTH_PREFIX}/:id", "template"],
    ] as const)("accepts %s", (text, kind) => {
      expect(problemsOf(text, kind, "")).toEqual([])
    })

    it("accepts the parameter of a map over a constant array", () => {
      expect(problemsOf("${networkId}/*", "template", "NETWORK_IDS.map((networkId) => (")).toEqual(
        []
      )
    })

    it.each([
      ["send/0x5Eb5f6fE3dbCB4D1B1D2eB5C2BCDF0b0f6Cc2f3a"],
      ["accounts/5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"],
      ["tokens/123"],
      ["tokens/3f2a9c1e-1b2c-4d5e-8f90-a1b2c3d4e5f6"],
      [`tokens/${"a".repeat(40)}`],
      ["Settings"],
    ])("rejects the value in %s", (text) => {
      expect(problemsOf(text, "literal", "")).not.toEqual([])
    })

    it("rejects a template over a variable", () => {
      expect(problemsOf("${address}/send", "template", "")).toEqual([
        '${address} is not a constant. Use a ":param" segment and read it with useParams().',
      ])
    })
  })
})
