import { statSync } from "node:fs"
import { join } from "node:path"

export type ExtensionBuild = { path: string; builtAt: Date }

const PROD_BUILD_PATH = "./apps/extension/dist/chrome-mv3"
const DEV_BUILD_PATH = "./apps/extension/dist/chrome-mv3-dev"

const getBuild = (path: string): ExtensionBuild | null => {
  try {
    return { path, builtAt: statSync(join(path, "manifest.json")).mtime }
  } catch {
    return null
  }
}

/**
 * `E2E_EXTENSION_PATH` when set, else the prod build (what CI builds), else the dev build.
 * Warns when the other build is newer: a stale local build silently tests old code.
 */
export const resolveExtensionBuild = ({
  overridePath = process.env.E2E_EXTENSION_PATH,
  prodPath = PROD_BUILD_PATH,
  devPath = DEV_BUILD_PATH,
}: {
  overridePath?: string
  prodPath?: string
  devPath?: string
} = {}): { build: ExtensionBuild; warning: string | null } => {
  if (overridePath) {
    const build = getBuild(overridePath)
    if (!build) throw new Error(`E2E_EXTENSION_PATH has no manifest.json: ${overridePath}`)
    return { build, warning: null }
  }

  const prod = getBuild(prodPath)
  const dev = getBuild(devPath)
  const build = prod ?? dev
  if (!build)
    throw new Error(
      `No extension build in ${prodPath} or ${devPath}. Run pnpm build:extension or set E2E_EXTENSION_PATH`
    )

  const other = build === prod ? dev : prod
  const warning =
    other && other.builtAt > build.builtAt
      ? `${build.path} is older than ${other.path} (built ${other.builtAt.toISOString()}). Rebuild it, or set E2E_EXTENSION_PATH=${other.path}`
      : null

  return { build, warning }
}
