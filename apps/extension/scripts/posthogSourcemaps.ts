import { spawn } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

/** `pnpm dlx` runs outside the workspace, so `minimumReleaseAge` does not vet a bump: pin it. */
export const POSTHOG_CLI = "@posthog/cli@0.18.3"

/** Per CLI step: an unreachable host or a hung upload fails the build instead of stalling it. */
export const CLI_STEP_TIMEOUT_MS = 5 * 60_000

/**
 * `page.js` runs in the dapp's own window, where an injected `_posthogChunkIds` would let any dapp
 * read it. Content scripts never report.
 */
export const EXCLUDED_FROM_INJECTION = ["**/page.js", "**/content-scripts/**"] as const

/** What inject appends; `_posthogChunkIds` alone also appears in the bundled error builder. */
const CHUNK_ID_COMMENT = "//# chunkId="
const MUST_BE_INJECTED = ["background.js"]
const MUST_NOT_BE_INJECTED = ["page.js", "content-scripts/content.js"]

export type SourcemapPlan =
  | { action: "skip"; reason: "firefox" | "no_sourcemaps" | "dry_run" | "no_credentials" }
  | { action: "fail"; reason: string }
  | { action: "inject_and_upload"; host?: string }

/**
 * The browser is checked first, so a Firefox build (Docker, no network, compared byte for byte by
 * scripts/verify-reproducible-build.sh) never reads credentials or starts the CLI. Only the two
 * canonical variables decide: the CLI's own fallbacks (`--dotenv-file`, a `posthog-cli login`
 * session) never start an upload. `POSTHOG_CLI_DRY_RUN=true`, the CLI's own switch, skips both
 * steps: the zip then carries no chunk ids. Read `env` in the hook, after WXT loaded `.env`.
 */
export const planSourcemapUpload = ({
  browser,
  buildType,
  env,
}: {
  browser: string
  buildType: string | undefined
  env: Readonly<Record<string, string | undefined>>
}): SourcemapPlan => {
  if (browser === "firefox") return { action: "skip", reason: "firefox" }
  if (buildType !== "production" && buildType !== "canary")
    return { action: "skip", reason: "no_sourcemaps" }
  if (env.POSTHOG_CLI_DRY_RUN === "true") return { action: "skip", reason: "dry_run" }
  const apiKey = env.POSTHOG_CLI_API_KEY?.trim()
  const projectId = env.POSTHOG_CLI_PROJECT_ID?.trim()
  if (!apiKey && !projectId) return { action: "skip", reason: "no_credentials" }
  if (!apiKey || !projectId)
    return {
      action: "fail",
      reason: "set both POSTHOG_CLI_API_KEY and POSTHOG_CLI_PROJECT_ID, or neither",
    }
  const host = env.POSTHOG_CLI_HOST?.trim()
  return { action: "inject_and_upload", ...(host && { host }) }
}

/** No `--release-*`: release injection calls the API at build time. Chunk ids alone are content-addressed. */
export const cliSteps = (outDir: string, host?: string): readonly (readonly string[])[] => {
  const global = ["dlx", POSTHOG_CLI, ...(host ? ["--host", host] : [])]
  const selection = [
    "--directory",
    outDir,
    ...EXCLUDED_FROM_INJECTION.flatMap((glob) => ["-e", glob]),
  ]
  return [
    [...global, "sourcemap", "inject", ...selection],
    [...global, "sourcemap", "upload", ...selection],
  ]
}

/** The CLI exits 0 on a glob that matched nothing: check the files that matter. */
export const assertInjection = (outDir: string): void => {
  const injected = (file: string) =>
    readFileSync(join(outDir, file), "utf8").includes(CHUNK_ID_COMMENT)
  const missing = MUST_BE_INJECTED.filter((file) => !injected(file))
  const leaked = MUST_NOT_BE_INJECTED.filter(
    (file) => existsSync(join(outDir, file)) && injected(file)
  )
  if (missing.length || leaked.length)
    throw new Error(
      `[posthog sourcemaps] chunk ids missing from ${missing.join(", ") || "none"}, injected into ${leaked.join(", ") || "none"}`
    )
}

export type RunCli = (args: readonly string[], options: { cwd: string }) => Promise<void>

const runCli: RunCli = (args, { cwd }) =>
  new Promise((resolve, reject) => {
    const child = spawn("pnpm", args, { cwd, stdio: "inherit", timeout: CLI_STEP_TIMEOUT_MS })
    child.on("error", reject)
    child.on("close", (code, signal) =>
      code === 0
        ? resolve()
        : reject(
            new Error(`[posthog sourcemaps] pnpm ${args.join(" ")} failed (${signal ?? code})`)
          )
    )
  })

/**
 * Throws on `fail` and on any CLI failure, so `wxt zip` stops before the archive and before the
 * maps are deleted: a release zip never ships with frames PostHog cannot resolve.
 * The CLI runs from the temp dir: in a git checkout it derives a release from git and calls the
 * releases API.
 */
export const runSourcemapPlan = async (
  plan: SourcemapPlan,
  { outDir, warn, run = runCli }: { outDir: string; warn: (message: string) => void; run?: RunCli }
): Promise<void> => {
  switch (plan.action) {
    case "skip":
      if (plan.reason === "no_credentials" || plan.reason === "dry_run")
        warn(`Source maps are not uploaded to PostHog (${plan.reason})`)
      return
    case "fail":
      throw new Error(`[posthog sourcemaps] ${plan.reason}`)
    case "inject_and_upload": {
      const [inject, upload] = cliSteps(outDir, plan.host)
      await run(inject, { cwd: tmpdir() })
      assertInjection(outDir)
      await run(upload, { cwd: tmpdir() })
    }
  }
}
