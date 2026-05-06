#!/usr/bin/env node
/**
 * Direct-dependency license gate.
 *
 * Reads `dependencies` and `devDependencies` from every workspace package.json
 * (root, apps/*, packages/*) and verifies the license of each declared package
 * against an allowlist. Transitive dependencies are not checked.
 *
 * Exits with code 1 if any direct dependency uses a disallowed license, or
 * if a license cannot be determined.
 *
 * Usage: node scripts/check-direct-licenses.mjs
 */

import { existsSync, readdirSync, readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")

/**
 * Disallowed license patterns (case-insensitive substring/regex match).
 * Anything matching here causes a failure. Compound expressions (e.g.
 * "MIT OR GPL-3.0-or-later") are split on " OR " / " AND " and each side
 * is evaluated separately — at least one OR-branch must be allowed.
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
 * Allowlist of license strings (or compound expressions) we know are
 * compatible with GPL-3.0-or-later. Used as a fast-path; anything not in
 * this list is checked against the disallowed patterns and otherwise
 * reported as "needs review".
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

/** Read JSON file, returning null on any error. */
function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"))
  } catch {
    return null
  }
}

/** Collect every workspace package.json (root + apps/* + packages/*). */
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

/**
 * Resolve a dep's installed package.json, walking up from the workspace
 * package.json's directory. pnpm hoists most deps to the workspace root, but
 * occasionally a workspace has its own local node_modules.
 */
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

/** Normalise a license expression to its constituent identifiers. */
function tokeniseLicense(expr) {
  if (!expr) return []
  // Strip parens and split on OR/AND while keeping individual identifiers.
  return expr
    .replace(/[()]/g, " ")
    .split(/\s+(?:OR|AND)\s+/i)
    .map((s) => s.trim())
    .filter(Boolean)
}

/**
 * Classify a license expression: returns "ok", "disallowed", or "review".
 * For OR-disjunctions, "ok" if ANY branch is ok and none are disallowed.
 */
function classify(licenseExpr) {
  if (!licenseExpr) return "review"

  // Block on disallowed pattern anywhere in the raw string.
  for (const re of DISALLOWED_PATTERNS) {
    if (re.test(licenseExpr)) return "disallowed"
  }

  const isOrExpression = /\sOR\s/i.test(licenseExpr)
  const tokens = tokeniseLicense(licenseExpr)

  if (isOrExpression) {
    // OR — any compatible branch is sufficient.
    if (tokens.some((t) => KNOWN_COMPATIBLE.has(t.toLowerCase()))) return "ok"
    return "review"
  }

  // AND or single license — every constituent must be compatible.
  if (tokens.every((t) => KNOWN_COMPATIBLE.has(t.toLowerCase()))) return "ok"
  return "review"
}

function main() {
  const workspacePkgs = findWorkspacePackageJsons()
  const directDeps = new Map() // name -> Set<string> (which workspace declared it)

  for (const pkgPath of workspacePkgs) {
    const pkg = readJson(pkgPath)
    if (!pkg) continue
    for (const field of ["dependencies", "devDependencies"]) {
      for (const dep of Object.keys(pkg[field] ?? {})) {
        // Skip workspace-internal packages (workspace:* protocol).
        const version = pkg[field][dep]
        if (typeof version === "string" && version.startsWith("workspace:")) continue
        if (!directDeps.has(dep)) directDeps.set(dep, new Set())
        directDeps.get(dep).add(pkg.name ?? pkgPath)
      }
    }
  }

  const disallowed = []
  const review = []
  const missing = []

  for (const [dep, declarers] of directDeps) {
    // Try resolving from any of the declaring workspaces, falling back to root.
    let resolved = null
    for (const declarer of declarers) {
      // declarer may be a package name; find its package.json path.
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
    if (verdict === "disallowed") {
      disallowed.push({ dep, license: licenseExpr, declarers: [...declarers] })
    } else if (verdict === "review") {
      review.push({ dep, license: licenseExpr, declarers: [...declarers] })
    }
  }

  const total = directDeps.size
  const okCount = total - disallowed.length - review.length - missing.length
  console.log(`Checked ${total} direct dependencies across ${workspacePkgs.length} workspaces.`)
  console.log(`  ✅ ${okCount} compatible`)
  if (missing.length) console.log(`  ⚠️  ${missing.length} could not be resolved`)
  if (review.length) console.log(`  ⚠️  ${review.length} need manual review (unrecognised license)`)
  if (disallowed.length) console.log(`  ❌ ${disallowed.length} disallowed`)

  if (missing.length) {
    console.error("\nUnresolved direct dependencies (run `pnpm install` first):")
    for (const m of missing) {
      console.error(`  - ${m.dep} (declared in ${m.declarers.join(", ")})`)
    }
  }

  if (review.length) {
    console.error("\nDirect dependencies needing manual license review:")
    for (const r of review) {
      console.error(
        `  - ${r.dep}: license=${JSON.stringify(r.license)} (${r.declarers.join(", ")})`
      )
    }
    console.error(
      "  → Either add the license to KNOWN_COMPATIBLE in scripts/check-direct-licenses.mjs"
    )
    console.error(
      "    if you've verified it's compatible with GPL-3.0-or-later, or remove the dep."
    )
  }

  if (disallowed.length) {
    console.error("\n❌ Direct dependencies with disallowed licenses:")
    for (const d of disallowed) {
      console.error(
        `  - ${d.dep}: license=${JSON.stringify(d.license)} (${d.declarers.join(", ")})`
      )
    }
    console.error("\nGPL-3.0-or-later does not permit shipping these. Remove or replace them.")
  }

  const failed = disallowed.length + review.length + missing.length > 0
  process.exit(failed ? 1 : 0)
}

main()
