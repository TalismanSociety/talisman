import { readFileSync } from "node:fs"
import { join, relative } from "node:path"

import { describe, expect, it } from "vitest"

import { FLOW_PROVIDERS, type ProviderClass, STEP_STATE_ELSEWHERE } from "./analyticsFlowProviders"
import {
  flowUsesIn,
  hookFile,
  providerCalls,
  readStripped,
  stepStateHits,
  stripComments,
} from "./analyticsScan"
import { lineAt, listSourceFiles, REPO_ROOT } from "./listSourceFiles"

/**
 * A provider that holds the steps of a wizard is a flow, and the flow is `useFlow`'d in its hook.
 * A scan alone cannot find these: some flow providers keep no step value (their screen follows
 * from data or a route), so every `provideContext` is classified in analyticsFlowProviders.ts
 * and the scan only checks the classifications that say "none".
 *
 * The step-state rules are regexes because the repo's TypeScript has no stable compiler API.
 */
const SRC = join(REPO_ROOT, "apps/extension/src")
const UI = join(SRC, "ui")

type Found = { provider: string; file: string; line: number; hookFile: string; hits: string[] }

const found: Found[] = listSourceFiles(UI).flatMap((file) => {
  const code = stripComments(readFileSync(file, "utf8"))
  return providerCalls(code).map(({ provider, hook, index }) => {
    const hooks = hookFile(file, code, hook, SRC)
    return {
      provider,
      file: relative(SRC, file),
      line: lineAt(code, index),
      hookFile: hooks,
      hits: stepStateHits(readStripped(hooks)),
    }
  })
})

const where = ({ file, line }: Found) => `${file}:${line}`
const runsFlow = (cls: ProviderClass, hookCode: string, allCode: string) => {
  if ("flow" in cls)
    return (
      flowUsesIn(hookCode).useFlow.includes(cls.flow) ||
      (!!cls.runBy && flowUsesIn(readStripped(join(SRC, cls.runBy))).useFlow.includes(cls.flow))
    )
  if ("viaProp" in cls)
    return (
      /\buseFlow\(/.test(hookCode) && new RegExp(`flow=\\{flows\\.${cls.viaProp}\\}`).test(allCode)
    )
  return true
}

describe("flow providers", () => {
  it("classifies every provideContext call", () => {
    const missing = found
      .filter(({ provider }) => !(provider in FLOW_PROVIDERS))
      .map(
        (f) =>
          `Provider "${f.provider}" (${where(f)}) is not classified. Add it to FLOW_PROVIDERS in src/__tests__/analyticsFlowProviders.ts: { flow: "<name>" } when its hook holds the steps of a wizard (then call useFlow(flows.<name>, { step }) there), or { none: "<what it holds instead>" }. See .claude/skills/analytics/SKILL.md.`
      )
    expect(missing).toEqual([])
  })

  it("lists no provider that is gone", () => {
    const names = new Set(found.map(({ provider }) => provider))
    const stale = Object.keys(FLOW_PROVIDERS).filter((name) => !names.has(name))
    expect(
      stale,
      `FLOW_PROVIDERS lists providers that no longer exist: ${stale.join(", ")}. Delete them.`
    ).toEqual([])
  })

  it("has no two providers with one name", () => {
    const names = found.map(({ provider }) => provider)
    expect(names.filter((name, i) => names.indexOf(name) !== i)).toEqual([])
  })

  it("does not let a { none } provider hide step state", () => {
    const hidden = found
      .filter(({ provider, hits }) => "none" in (FLOW_PROVIDERS[provider] ?? {}) && hits.length)
      .map(
        (f) =>
          `Provider "${f.provider}" is { none } but its hook (${relative(SRC, f.hookFile)}) holds step state (${f.hits.join(", ")}). Classify it as a flow, or remove the step state.`
      )
    expect(hidden).toEqual([])
  })

  it("starts the flow of every { flow } provider in its hook", () => {
    const allCode = listSourceFiles(UI).map(readStripped).join("\n")
    const wrong = found.flatMap((f) => {
      const cls = FLOW_PROVIDERS[f.provider]
      if (!cls || !("flow" in cls || "viaProp" in cls)) return []
      const name = "flow" in cls ? cls.flow : cls.viaProp
      return runsFlow(cls, readStripped(f.hookFile), allCode)
        ? []
        : [
            `Provider "${f.provider}" is { flow: "${name}" } but ${relative(SRC, f.hookFile)} does not call useFlow(flows.${name}, …).`,
          ]
    })
    expect(wrong).toEqual([])
  })

  it("starts the flow of every { flow } file outside a provider", () => {
    const wrong = Object.entries(STEP_STATE_ELSEWHERE).flatMap(([file, cls]) => {
      if (!("flow" in cls)) return []
      const code = readStripped(join(SRC, file))
      return flowUsesIn(code).useFlow.includes(cls.flow)
        ? []
        : [
            `${file} is { flow: "${cls.flow}" } in STEP_STATE_ELSEWHERE but does not call useFlow(flows.${cls.flow}, …).`,
          ]
    })
    expect(wrong).toEqual([])
  })

  it("accounts for step state outside providers", () => {
    const providerHooks = new Set(found.map(({ hookFile }) => relative(SRC, hookFile)))
    const hits = listSourceFiles(UI)
      .map((file) => ({ file: relative(SRC, file), hits: stepStateHits(readStripped(file)) }))
      .filter(({ hits }) => hits.length)
    const loose = hits
      .filter(({ file }) => !providerHooks.has(file) && !(file in STEP_STATE_ELSEWHERE))
      .map(
        ({ file, hits }) =>
          `${file} holds step state (${hits.join(", ")}) outside a provider. List it in STEP_STATE_ELSEWHERE as { flow } or { none: "<why>" }.`
      )
    const stale = Object.keys(STEP_STATE_ELSEWHERE).filter(
      (file) => !hits.some((hit) => hit.file === file)
    )
    expect(loose).toEqual([])
    expect(
      stale,
      `STEP_STATE_ELSEWHERE lists files with no step state any more: ${stale.join(", ")}. Delete them.`
    ).toEqual([])
  })
})
