import { type Dirent, readdirSync } from "node:fs"
import { join, resolve } from "node:path"

export const REPO_ROOT = resolve(import.meta.dirname, "../../../..")

const SKIPPED_DIRS = new Set(["node_modules", "dist", ".turbo"])

const TEST_FILE = /\.(test|spec)\.tsx?$/

type Options = { includeTests?: boolean }

export const listSourceFiles = (dir: string, { includeTests = false }: Options = {}): string[] => {
  let entries: Dirent[]
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return []
  }
  return entries.flatMap((entry) => {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      const skipped = SKIPPED_DIRS.has(entry.name) || (!includeTests && entry.name === "__tests__")
      return skipped ? [] : listSourceFiles(full, { includeTests })
    }
    if (!/\.tsx?$/.test(entry.name)) return []
    return includeTests || !TEST_FILE.test(entry.name) ? [full] : []
  })
}

export const lineAt = (code: string, index: number) => code.slice(0, index).split("\n").length
