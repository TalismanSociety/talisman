import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { dirname, join, relative } from "node:path"

import { describe, expect, it } from "vitest"

import { lineAt, listSourceFiles, REPO_ROOT } from "./listSourceFiles"

/**
 * `vi.mock(path)` does not fail when `path` matches no module: the test keeps running against
 * the real module, and the mock silently does nothing. That happens when a file is renamed or
 * deleted and the mock string is not updated.
 *
 * Every relative or aliased (`@ui`, `@core`, `@common`, `inject`) mock path must resolve to a
 * file. When the module is gone, delete the mock. Package specifiers are not checked.
 */
const EXTENSION_SRC = join(REPO_ROOT, "apps/extension/src")

const ALIASES: Record<string, string> = {
  "@ui": join(EXTENSION_SRC, "ui"),
  "@core": join(EXTENSION_SRC, "core"),
  "@common": join(EXTENSION_SRC, "common"),
  inject: join(EXTENSION_SRC, "inject"),
}

const RESOLVED_SUFFIXES = ["", ".ts", ".tsx", ".js", "/index.ts", "/index.tsx"]

const MOCK_CALL = /\bvi\.(?:mock|doMock|unmock|doUnmock)\(\s*["']([^"']+)["']/g

const workspaceDirs = (root: string, sub: string) =>
  readdirSync(join(REPO_ROOT, root)).map((name) => join(REPO_ROOT, root, name, sub))

const SCAN_DIRS = [
  ...workspaceDirs("apps", "src"),
  ...workspaceDirs("apps", "tests"),
  ...workspaceDirs("packages", "src"),
]

const toFilePath = (specifier: string, fromFile: string): string | null => {
  const path = specifier.replace(/\?.*$/, "")
  if (path.startsWith(".")) return join(dirname(fromFile), path)
  const [head, ...rest] = path.split("/")
  return head in ALIASES ? join(ALIASES[head], ...rest) : null
}

const isFile = (path: string) =>
  RESOLVED_SUFFIXES.some((suffix) => existsSync(path + suffix) && statSync(path + suffix).isFile())

const findUnresolvedMocks = (code: string, file: string) =>
  [...code.matchAll(MOCK_CALL)].flatMap((match) => {
    const path = toFilePath(match[1], file)
    return path && !isFile(path) ? [`${lineAt(code, match.index)} ${match[1]}`] : []
  })

describe("vi.mock paths", () => {
  it("flags a path that resolves to no file", () => {
    const file = join(EXTENSION_SRC, "ui/domains/Swap/__tests__/example.test.ts")
    expect(findUnresolvedMocks('vi.mock("../SwapProvider", () => ({}))', file)).toEqual([])
    expect(findUnresolvedMocks('vi.mock("@ui/api", () => ({}))', file)).toEqual([])
    expect(findUnresolvedMocks('vi.mock("react-i18next", () => ({}))', file)).toEqual([])
    expect(findUnresolvedMocks('vi.mock("../swap-modules/bittensor-logo.svg?url")', file)).toEqual(
      []
    )
    expect(findUnresolvedMocks('vi.mock("../hooks/useGone", () => ({}))', file)).toEqual([
      "1 ../hooks/useGone",
    ])
    expect(findUnresolvedMocks('\nvi.doMock("@core/gone")', file)).toEqual(["2 @core/gone"])
  })

  it("resolve to a file", () => {
    const offenders = SCAN_DIRS.flatMap((dir) => listSourceFiles(dir, { includeTests: true }))
      .filter((file) => file !== import.meta.filename)
      .flatMap((file) =>
        findUnresolvedMocks(readFileSync(file, "utf8"), file).map(
          (hit) => `${relative(REPO_ROOT, file)}:${hit}`
        )
      )

    expect(offenders).toEqual([])
  })
})
