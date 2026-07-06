import { type Dirent, readdirSync, readFileSync } from "node:fs"
import { join, resolve } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * Guard against silent base58 account-data fetches.
 *
 * Unlike web3.js v1's `Connection` (which always requested base64 under the hood), kit's rpc
 * methods forward exactly the params they're given. `getAccountInfo`/`getMultipleAccounts`
 * default to base58 **server-side**, and nodes reject base58 for account data larger than
 * 128 bytes with "Encoded binary (base 58) data should be less than 128 bytes, please use
 * Base64 encoding." — which is how every SPL token transfer broke (token accounts are 165
 * bytes; the ATA existence check blew up before fee estimation).
 *
 * Every call must pass an explicit `encoding` in its config object. Same server-side default
 * applies to every method returning account data.
 */
const GUARDED_METHODS = [
  "getAccountInfo",
  "getMultipleAccounts",
  "getProgramAccounts",
  "getTokenAccountsByOwner",
  "getTokenAccountsByDelegate",
]

const REPO_ROOT = resolve(import.meta.dirname, "../../../..")

const SCAN_DIRS = [
  join(REPO_ROOT, "apps/extension/src"),
  join(REPO_ROOT, "packages/solana/src"),
  join(REPO_ROOT, "packages/balances/src"),
  join(REPO_ROOT, "packages/chain-connectors/src"),
]

const listSourceFiles = (dir: string): string[] => {
  const out: string[] = []
  let entries: Dirent[]
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return out // directory may be absent in a partial checkout
  }
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".turbo")
        continue
      out.push(...listSourceFiles(full))
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.(test|spec)\.tsx?$/.test(entry.name)) {
      out.push(full)
    }
  }
  return out
}

// Extracts the argument list of a `.method(...)` call, handling nested parens/braces.
const callArgsAt = (code: string, openParen: number): string | null => {
  let depth = 0
  for (let i = openParen; i < code.length; i++) {
    if (code[i] === "(") depth++
    else if (code[i] === ")") {
      depth--
      if (depth === 0) return code.slice(openParen + 1, i)
    }
  }
  return null
}

describe("solana rpc account fetches use explicit encoding", () => {
  it("never calls getAccountInfo/getMultipleAccounts without an explicit encoding", () => {
    const violations: string[] = []

    for (const dir of SCAN_DIRS) {
      for (const file of listSourceFiles(dir)) {
        const code = readFileSync(file, "utf8")
        for (const method of GUARDED_METHODS) {
          const re = new RegExp(`\\.${method}\\s*\\(`, "g")
          for (let m = re.exec(code); m; m = re.exec(code)) {
            const args = callArgsAt(code, m.index + m[0].length - 1)
            if (args === null || !/\bencoding\s*:/.test(args)) {
              const line = code.slice(0, m.index).split("\n").length
              violations.push(
                `${file.replace(`${REPO_ROOT}/`, "")}:${line}: \`.${method}(...)\` without explicit \`encoding\``
              )
            }
          }
        }
      }
    }

    expect(
      violations,
      `kit rpc account fetches default to base58, which nodes reject for account data >128 bytes ` +
        `(e.g. any token account). Pass an explicit \`encoding\` (usually "base64"):\n` +
        violations.join("\n")
    ).toEqual([])
  })
})
