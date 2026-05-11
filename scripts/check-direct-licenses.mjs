#!/usr/bin/env node
/**
 * License compliance gate for GPL-3.0-or-later.
 *
 * Two-pass check:
 *   1. **Production (transitive)** — uses `pnpm licenses list --prod --json`
 *      to verify every package that ships in the built extension.
 *   2. **Dev (direct only)** — reads `devDependencies` from workspace
 *      package.json files and checks only the declared (non-transitive) deps.
 *
 * Exits with code 1 if any dependency uses a disallowed license, has an
 * unrecognised license, or cannot be resolved.
 *
 * Usage: node scripts/check-direct-licenses.mjs
 */

import { execSync } from "node:child_process"
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")

/**
 * Disallowed license patterns (case-insensitive substring/regex match).
 * Anything matching here causes a failure. Compound expressions (e.g.
 * "MIT OR GPL-3.0-or-later") are split on " OR " / " AND " and each side
 * is evaluated separately — an OR expression requires at least one allowed
 * branch and no disallowed branches; an AND expression requires every branch
 * to be allowed.
 */
const DISALLOWED_PATTERNS = [
  /\bDBAD\b/i,
  /\bSSPL\b/i,
  /\bBUSL\b/i,
  /\bElastic-?2/i,
  /\bUNLICENSED\b/i,
  /^SEE LICENSE/i,
  /\bCommons Clause\b/i,
  /\bPolyForm\b/i,
  /\bHippocratic\b/i,
  /\bAnti-?996\b/i,
  /\bCC-BY-NC\b/i,
  /\bCC-BY-ND\b/i,
  /^JSON$/i,
  /^Custom$/i,
  /\bFSL\b/i, // Functional Source License — time-limited restrictions
  /\bproprietary\b/i,
]

/**
 * Allowlist of license strings we know are compatible with GPL-3.0-or-later.
 * Used as a fast-path; anything not in this list is checked against the
 * disallowed patterns and otherwise reported as "needs review".
 */
const KNOWN_COMPATIBLE = new Set(
  [
    "MIT",
    "ISC",
    "Apache-2.0",
    "BSD",
    "BSD-2-Clause",
    "BSD-3-Clause",
    "0BSD",
    "MPL-2.0",
    "LGPL",
    "LGPL-2.1",
    "LGPL-3.0",
    "LGPL-3.0-only",
    "LGPL-3.0-or-later",
    "GPL-2.0-or-later",
    "GPL-3.0",
    "GPL-3.0-only",
    "GPL-3.0-or-later",
    "Unlicense",
    "CC0-1.0",
    "CC-BY-3.0",
    "CC-BY-4.0",
    "WTFPL",
    "Zlib",
    "BlueOak-1.0.0",
    "Python-2.0",
    "public domain",
  ].map((s) => s.toLowerCase())
)

/**
 * Packages whose license field is missing or "Unknown" in the pnpm registry
 * metadata but whose actual license has been manually verified as compatible.
 * Key: package name, Value: verified SPDX identifier (for display only).
 */
const MANUALLY_VERIFIED = new Map([
  // All @metamask scoped packages below are MIT-licensed per their GitHub repos
  // and NPM pages; pnpm just cannot resolve the field from the registry metadata.
  ["@metamask/eth-json-rpc-provider", "MIT"],
  ["@metamask/eth-snap-keyring", "MIT"],
  ["@metamask/keyring-api", "MIT"],
  ["@metamask/keyring-internal-snap-client", "MIT"],
  ["@metamask/keyring-snap-client", "MIT"],
  ["@metamask/keyring-snap-sdk", "MIT"],
  ["@metamask/keyring-utils", "MIT"],
  ["@metamask/sdk", "MIT"],
  ["@metamask/sdk-communication-layer", "MIT"],
  ["@metamask/sdk-install-modal-web", "MIT"],
  ["@metamask/snaps-controllers", "MIT"],
  ["@metamask/snaps-rpc-methods", "MIT"],
  // Other packages with missing/incorrect metadata
  ["eyes", "MIT"],
  ["fast-shallow-equal", "MIT"],
  ["react-universal-interface", "Unlicense"],
  ["text-encoding-utf-8", "MIT"],
  ["valid-url", "MIT"],
])

/**
 * Strip "WITH <exception>" suffixes (e.g. "GPL-3.0-or-later WITH
 * Classpath-exception-2.0"). Exceptions relax the license — never restrict
 * it — so they don't affect GPL-3 compatibility.
 */
function stripExceptions(expr) {
  return expr.replace(/\s+WITH\s+\S+/gi, "").trim()
}

function hasWrappingParentheses(expr) {
  if (!expr.startsWith("(") || !expr.endsWith(")")) return false

  let depth = 0
  for (let i = 0; i < expr.length; i++) {
    const char = expr[i]
    if (char === "(") depth++
    if (char === ")") depth--
    if (depth === 0 && i < expr.length - 1) return false
  }

  return depth === 0
}

function stripWrappingParentheses(expr) {
  let result = expr.trim()
  while (hasWrappingParentheses(result)) {
    result = result.slice(1, -1).trim()
  }
  return result
}

function splitTopLevel(expr, operator) {
  const parts = []
  let depth = 0
  let start = 0
  const separator = new RegExp(`^\\s+${operator}\\s+`, "i")

  for (let i = 0; i < expr.length; i++) {
    const char = expr[i]
    if (char === "(") {
      depth++
      continue
    }
    if (char === ")") {
      depth--
      continue
    }
    if (depth !== 0) continue

    const match = expr.slice(i).match(separator)
    if (!match) continue

    parts.push(expr.slice(start, i).trim())
    i += match[0].length - 1
    start = i + 1
  }

  if (parts.length === 0) return [expr.trim()]
  parts.push(expr.slice(start).trim())
  return parts.filter(Boolean)
}

/**
 * Classify a license expression: returns "ok", "disallowed", or "review".
 * For OR-disjunctions, "ok" if ANY branch is ok and none are disallowed.
 */
function classifyToken(token) {
  for (const re of DISALLOWED_PATTERNS) {
    if (re.test(token)) return "disallowed"
  }
  return KNOWN_COMPATIBLE.has(token.toLowerCase()) ? "ok" : "review"
}

function classifyExpression(expr) {
  const normalised = stripWrappingParentheses(expr)
  if (!normalised) return "review"

  const orBranches = splitTopLevel(normalised, "OR")
  if (orBranches.length > 1) {
    const verdicts = orBranches.map(classifyExpression)
    if (verdicts.includes("disallowed")) return "disallowed"
    return verdicts.includes("ok") ? "ok" : "review"
  }

  const andBranches = splitTopLevel(normalised, "AND")
  if (andBranches.length > 1) {
    const verdicts = andBranches.map(classifyExpression)
    if (verdicts.includes("disallowed")) return "disallowed"
    return verdicts.every((verdict) => verdict === "ok") ? "ok" : "review"
  }

  return classifyToken(normalised)
}

function classify(licenseExpr) {
  if (!licenseExpr) return "review"
  return classifyExpression(stripExceptions(licenseExpr))
}

// ---------------------------------------------------------------------------
// Pass 1 — production transitive deps via `pnpm licenses list`
// ---------------------------------------------------------------------------

function checkProductionDeps() {
  let json
  try {
    const raw = execSync("pnpm licenses list --prod --json", {
      cwd: ROOT,
      encoding: "utf8",
      maxBuffer: 50 * 1024 * 1024,
      stdio: ["pipe", "pipe", "pipe"],
    })
    json = JSON.parse(raw)
  } catch (err) {
    console.error("Failed to run `pnpm licenses list --prod --json`:")
    console.error(err.stderr?.toString() ?? err.message)
    process.exit(1)
  }

  const disallowed = []
  const review = []
  let okCount = 0

  for (const [license, packages] of Object.entries(json)) {
    const expr = license === "Unknown" ? null : license
    for (const pkg of packages) {
      // Check manual override for packages with missing metadata
      if ((!expr || expr === "Unknown") && MANUALLY_VERIFIED.has(pkg.name)) {
        okCount++
        continue
      }

      const verdict = classify(expr)
      if (verdict === "ok") {
        okCount++
      } else if (verdict === "disallowed") {
        disallowed.push({ dep: pkg.name, license: expr })
      } else {
        review.push({ dep: pkg.name, license: expr })
      }
    }
  }

  return { okCount, disallowed, review }
}

// ---------------------------------------------------------------------------
// Pass 2 — dev direct deps (not shipped, but avoid disallowed licenses)
// ---------------------------------------------------------------------------

/** Read JSON file, returning null on any error. */
function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"))
  } catch {
    return null
  }
}

function findWorkspacePackageJsons() {
  const result = [join(ROOT, "package.json")]
  for (const sub of ["apps", "packages"]) {
    const dir = join(ROOT, sub)
    if (!existsSync(dir)) continue
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const pkg = join(dir, entry.name, "package.json")
      if (existsSync(pkg)) result.push(pkg)
    }
  }
  return result
}

function resolveInstalledPackageJson(depName, workspacePkgJsonPath) {
  let dir = dirname(workspacePkgJsonPath)
  while (true) {
    const candidate = join(dir, "node_modules", depName, "package.json")
    if (existsSync(candidate)) return candidate
    const parent = dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

function checkDevDirectDeps(workspacePkgs, prodPackageNames) {
  const devDeps = new Map() // name -> Set<string>

  for (const pkgPath of workspacePkgs) {
    const pkg = readJson(pkgPath)
    if (!pkg) continue
    for (const dep of Object.keys(pkg.devDependencies ?? {})) {
      const version = pkg.devDependencies[dep]
      if (typeof version === "string" && version.startsWith("workspace:")) continue
      // Skip if already covered by the production pass
      if (prodPackageNames.has(dep)) continue
      if (!devDeps.has(dep)) devDeps.set(dep, new Set())
      devDeps.get(dep).add(pkg.name ?? pkgPath)
    }
  }

  const disallowed = []
  const review = []
  const missing = []
  let okCount = 0

  for (const [dep, declarers] of devDeps) {
    let resolved = null
    for (const declarer of declarers) {
      const pkgPath = workspacePkgs.find((p) => readJson(p)?.name === declarer || p === declarer)
      if (pkgPath) {
        resolved = resolveInstalledPackageJson(dep, pkgPath)
        if (resolved) break
      }
    }
    resolved ||= resolveInstalledPackageJson(dep, join(ROOT, "package.json"))

    if (!resolved) {
      missing.push({ dep, declarers: [...declarers] })
      continue
    }

    const installed = readJson(resolved)
    const licenseExpr =
      typeof installed?.license === "string"
        ? installed.license
        : typeof installed?.license === "object" && installed?.license !== null
          ? installed.license.type
          : Array.isArray(installed?.licenses) && installed.licenses[0]?.type
            ? installed.licenses[0].type
            : null

    const verdict = classify(licenseExpr)
    if (verdict === "ok") {
      okCount++
    } else if (verdict === "disallowed") {
      disallowed.push({ dep, license: licenseExpr, declarers: [...declarers] })
    } else {
      review.push({ dep, license: licenseExpr, declarers: [...declarers] })
    }
  }

  return { total: devDeps.size, okCount, disallowed, review, missing }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  let failed = false

  // Pass 1: production (transitive)
  console.log("── Production dependencies (transitive) ──")
  const prod = checkProductionDeps()
  const prodTotal = prod.okCount + prod.disallowed.length + prod.review.length
  console.log(`Checked ${prodTotal} production packages (via pnpm licenses list --prod).`)
  console.log(`  ✅ ${prod.okCount} compatible`)
  if (prod.review.length) console.log(`  ⚠️  ${prod.review.length} need manual review`)
  if (prod.disallowed.length) console.log(`  ❌ ${prod.disallowed.length} disallowed`)

  if (prod.review.length) {
    console.error("\nProduction packages needing manual license review:")
    for (const r of prod.review) {
      console.error(`  - ${r.dep}: license=${JSON.stringify(r.license)}`)
    }
    console.error("  → Verify the license is GPL-3-compatible, then add it to KNOWN_COMPATIBLE")
    console.error("    or MANUALLY_VERIFIED in scripts/check-direct-licenses.mjs.")
    failed = true
  }

  if (prod.disallowed.length) {
    console.error("\n❌ Production packages with disallowed licenses:")
    for (const d of prod.disallowed) {
      console.error(`  - ${d.dep}: license=${JSON.stringify(d.license)}`)
    }
    console.error("\nGPL-3.0-or-later does not permit shipping these. Remove or replace them.")
    failed = true
  }

  // Collect prod package names so pass 2 can skip them
  let prodJson
  try {
    const raw = execSync("pnpm licenses list --prod --json", {
      cwd: ROOT,
      encoding: "utf8",
      maxBuffer: 50 * 1024 * 1024,
      stdio: ["pipe", "pipe", "pipe"],
    })
    prodJson = JSON.parse(raw)
  } catch {
    prodJson = {}
  }
  const prodPackageNames = new Set()
  for (const packages of Object.values(prodJson)) {
    for (const pkg of packages) prodPackageNames.add(pkg.name)
  }

  // Pass 2: dev direct deps
  console.log("\n── Dev dependencies (direct only) ──")
  const workspacePkgs = findWorkspacePackageJsons()
  const dev = checkDevDirectDeps(workspacePkgs, prodPackageNames)
  console.log(
    `Checked ${dev.total} dev-only direct dependencies across ${workspacePkgs.length} workspaces.`
  )
  console.log(`  ✅ ${dev.okCount} compatible`)
  if (dev.missing.length) console.log(`  ⚠️  ${dev.missing.length} could not be resolved`)
  if (dev.review.length) console.log(`  ⚠️  ${dev.review.length} need manual review`)
  if (dev.disallowed.length) console.log(`  ❌ ${dev.disallowed.length} disallowed`)

  if (dev.missing.length) {
    console.error("\nUnresolved dev dependencies (run `pnpm install` first):")
    for (const m of dev.missing) {
      console.error(`  - ${m.dep} (declared in ${m.declarers.join(", ")})`)
    }
    failed = true
  }

  if (dev.review.length) {
    console.error("\nDev dependencies needing manual license review:")
    for (const r of dev.review) {
      console.error(
        `  - ${r.dep}: license=${JSON.stringify(r.license)} (${r.declarers.join(", ")})`
      )
    }
    console.error(
      "  → Add the license to KNOWN_COMPATIBLE if it's GPL-3-compatible, or remove the dep."
    )
    failed = true
  }

  if (dev.disallowed.length) {
    console.error("\n❌ Dev dependencies with disallowed licenses:")
    for (const d of dev.disallowed) {
      console.error(
        `  - ${d.dep}: license=${JSON.stringify(d.license)} (${d.declarers.join(", ")})`
      )
    }
    failed = true
  }

  process.exit(failed ? 1 : 0)
}

main()
