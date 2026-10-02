import { existsSync, readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"

import { lineAt } from "./listSourceFiles"

const STRING_OR_COMMENT =
  /("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\[\s\S]|[^`\\])*`)|\/\/[^\n]*|\/\*[\s\S]*?\*\//g

/** Replaces comments with spaces, keeping strings, template literals and every newline. */
export const stripComments = (code: string): string =>
  code.replace(
    STRING_OR_COMMENT,
    (match, string?: string) => string ?? match.replace(/[^\n]/g, " ")
  )

export const STEP_STATE_RULES = {
  S1_destructured_step:
    /\[\s*(?:\{[^}]*\b(?:step|stage)\b[^}]*\}|(?:step|stage|\w+View))\s*,\s*set\w+\s*,?\s*\]\s*=\s*useState\b/,
  S2_step_member:
    /[{;,\s](?:step|stage|route)\??\s*:\s*(?:"[^"\n]+"\s*\||[A-Z]\w*(?:Step|Stage|Page)\b)/,
  S3_reducer: /\buseReducer\s*[<(]/,
  S4_page_route: /`[^`]*\/\$\{page\}[^`]*`/,
} as const

export const stepStateHits = (code: string): string[] =>
  Object.entries(STEP_STATE_RULES)
    .filter(([, rule]) => rule.test(code))
    .map(([name]) => name)

export type ProviderCall = { provider: string; hook: string; index: number }

const PROVIDER_CALL = /\[\s*(\w+)\s*,\s*\w+\s*,?\s*\]\s*=\s*provideContext\(\s*(\w+)/g

export const providerCalls = (code: string): ProviderCall[] =>
  [...code.matchAll(PROVIDER_CALL)].map((match) => ({
    provider: match[1],
    hook: match[2],
    index: match.index,
  }))

const EXTENSIONS = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]

/** The file that defines `hook`: this one, or the one it imports it from (one hop, as Swap needs). */
export const hookFile = (file: string, code: string, hook: string, srcRoot: string): string => {
  const defined = new RegExp(`(?:const|function)\\s+${hook}\\b`)
  if (defined.test(code)) return file
  const imported = code.match(
    new RegExp(`import\\s*\\{[^}]*\\b${hook}\\b[^}]*\\}\\s*from\\s*["']([^"']+)["']`)
  )
  if (!imported) return file
  const specifier = imported[1]
  const base = specifier.startsWith("@ui/")
    ? join(srcRoot, "ui", specifier.slice(4))
    : specifier.startsWith("@common/")
      ? join(srcRoot, "common", specifier.slice(8))
      : resolve(dirname(file), specifier)
  const found = EXTENSIONS.map((ext) => base + ext).find(
    (candidate) => existsSync(candidate) && !candidate.endsWith("/")
  )
  return found && /\.tsx?$/.test(found) ? found : file
}

export const readStripped = (file: string) => stripComments(readFileSync(file, "utf8"))

const TRACK_LITERAL = /\btrack\(\s*["']([$A-Za-z0-9_]+)["']/g
const TRACK_DYNAMIC = /(?<![.\w])track\(\s*(?!["'])/g
const ENVELOPE = /\bevent:\s*["']([$A-Za-z0-9_]+)["']/g

export type Emitters = { literal: string[]; dynamic: number[]; envelope: string[] }

export const emittersIn = (strippedCode: string): Emitters => ({
  literal: [...strippedCode.matchAll(TRACK_LITERAL)].map((match) => match[1]),
  dynamic: [...strippedCode.matchAll(TRACK_DYNAMIC)].map((match) =>
    lineAt(strippedCode, match.index)
  ),
  envelope: [...strippedCode.matchAll(ENVELOPE)].map((match) => match[1]),
})

export const callArguments = (strippedCode: string, openIndex: number): string => {
  let depth = 0
  for (let i = openIndex; i < strippedCode.length; i++) {
    if (strippedCode[i] === "(") depth++
    else if (strippedCode[i] === ")" && --depth === 0) return strippedCode.slice(openIndex + 1, i)
  }
  return strippedCode.slice(openIndex + 1)
}

export type FlowUse = {
  useFlow: string[]
  boundSteps: string[]
  reports: { flow: string; method: string }[]
}

export const flowUsesIn = (strippedCode: string): FlowUse => ({
  useFlow: [...strippedCode.matchAll(/\buseFlow\(\s*flows\.(\w+)/g)].map((match) => match[1]),
  boundSteps: [...strippedCode.matchAll(/\buseFlow\(\s*flows\.(\w+)/g)]
    .filter((match) => /\bstep\b/.test(callArguments(strippedCode, match.index + 7)))
    .map((match) => match[1]),
  reports: [
    ...strippedCode.matchAll(/\bflows\.(\w+)\.(step|submitted|completed|failed)\b\s*[(,})]/g),
  ].map((match) => ({ flow: match[1], method: match[2] })),
})

export type RoutePath = { index: number; text: string; kind: "literal" | "template" }

export const routePathsIn = (strippedCode: string): RoutePath[] => {
  const found: RoutePath[] = []
  for (const open of strippedCode.matchAll(/<Route\b/g)) {
    let depth = 0
    let i = open.index + 6
    let quote: string | null = null
    for (; i < strippedCode.length; i++) {
      const c = strippedCode[i]
      if (quote) {
        if (c === quote && strippedCode[i - 1] !== "\\") quote = null
        continue
      }
      if (c === '"' || c === "'" || c === "`") quote = c
      else if (c === "{") depth++
      else if (c === "}") depth--
      else if (c === ">" && depth === 0) break
    }
    const tag = strippedCode.slice(open.index, i)
    const prop = tag.match(/\bpath=(?:"([^"]*)"|\{\s*"([^"]*)"\s*\}|\{\s*`([^`]*)`\s*\})/)
    if (!prop) continue
    const literal = prop[1] ?? prop[2]
    found.push(
      literal !== undefined
        ? { index: open.index, text: literal, kind: "literal" }
        : { index: open.index, text: prop[3], kind: "template" }
    )
  }
  return found
}
