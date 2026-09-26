import { readFileSync } from "node:fs"
import { join, relative } from "node:path"

import { describe, expect, it } from "vitest"

import { lineAt, listSourceFiles, REPO_ROOT } from "./listSourceFiles"

/**
 * A substrate payload is mortal: the node rejects it with 1010 "bad signature" once its era
 * (64 blocks) has passed. A plain `useQuery` builds it once, so a form left open long enough
 * submits an expired payload.
 *
 * Build signable payloads with `useSignerPayloadQuery` (`@ui/hooks/sapi/useSignerPayloadQuery`),
 * which rebuilds them within the era and withholds expired ones.
 *
 * Only direct `sapi.getExtrinsicPayload` calls inside the query are detected, not helpers that
 * wrap it.
 */
const UI_DIR = join(REPO_ROOT, "apps/extension/src/ui")

const ALLOWED: Record<string, string> = {
  "apps/extension/src/ui/domains/SendFunds/useSendFundsTransactionDot.ts":
    "own 60 s rebuild interval, migration pending",
  "apps/extension/src/ui/domains/TaoDashboard/subnet/swap/useMevShieldFeeEstimate.ts":
    "payload is only used for a fee estimate, never signed",
}

const QUERY_CALL = /\b(?:useQuery|useSuspenseQuery|queryOptions)\s*(?:<[^()]*>)?\s*\(/g

const callArgsAt = (code: string, openParen: number): string => {
  let depth = 0
  for (let i = openParen; i < code.length; i++) {
    if (code[i] === "(") depth++
    else if (code[i] === ")" && --depth === 0) return code.slice(openParen + 1, i)
  }
  return code.slice(openParen + 1)
}

const findPayloadQueries = (code: string) =>
  [...code.matchAll(QUERY_CALL)]
    .filter((match) =>
      /\bgetExtrinsicPayload\b/.test(callArgsAt(code, match.index + match[0].length - 1))
    )
    .map((match) => lineAt(code, match.index))

describe("substrate payload queries", () => {
  it("flags a plain query that builds a payload", () => {
    expect(
      findPayloadQueries(`useQuery({ queryFn: () => sapi.getExtrinsicPayload("A", "b", {}) })`)
    ).toEqual([1])
    expect(
      findPayloadQueries(`\nqueryOptions({ queryFn: async () => sapi.getExtrinsicPayload() })`)
    ).toEqual([2])
    expect(
      findPayloadQueries(`useQuery<Payload>({ queryFn: () => sapi.getExtrinsicPayload() })`)
    ).toEqual([1])
    expect(
      findPayloadQueries(`useSignerPayloadQuery({ queryFn: () => sapi.getExtrinsicPayload() })`)
    ).toEqual([])
    expect(findPayloadQueries(`useQuery({ queryFn: () => sapi.getFeeEstimate(payload) })`)).toEqual(
      []
    )
  })

  it("use useSignerPayloadQuery", () => {
    const offenders = listSourceFiles(UI_DIR)
      .map((file) => relative(REPO_ROOT, file))
      .filter((file) => !(file in ALLOWED))
      .flatMap((file) =>
        findPayloadQueries(readFileSync(join(REPO_ROOT, file), "utf8")).map(
          (line) => `${file}:${line}`
        )
      )

    expect(offenders).toEqual([])
  })

  it("allow only files that still build a payload in a plain query", () => {
    const stale = Object.keys(ALLOWED).filter(
      (file) => findPayloadQueries(readFileSync(join(REPO_ROOT, file), "utf8")).length === 0
    )

    expect(stale).toEqual([])
  })
})
