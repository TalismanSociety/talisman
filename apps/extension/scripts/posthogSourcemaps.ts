import { spawn } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { POSTHOG_API_HOST, POSTHOG_PROJECT_ID } from "../src/core/domains/analytics/posthogProject"

/** `pnpm dlx` runs outside the workspace, so `minimumReleaseAge` does not vet a bump: pin it. */
export const POSTHOG_CLI = "@posthog/cli@0.18.3"

const RELEASE_NAME = "talisman-extension"

export const CLI_STEP_TIMEOUT_MS = 5 * 60_000

/**
 * `page.js` runs in the dapp's own window, where an injected `_posthogChunkIds` would let any dapp
 * read it.
 */
export const EXCLUDED_FROM_INJECTION = ["**/page.js", "**/content-scripts/**"] as const

/** What inject appends; `_posthogChunkIds` alone also appears in the bundled error builder. */
const CHUNK_ID_COMMENT = "//# chunkId="
const MUST_BE_INJECTED = ["background.js"]
const MUST_NOT_BE_INJECTED = ["page.js", "content-scripts/content.js"]

export type SourcemapPlan =
  | { action: "skip"; reason: "firefox" | "no_sourcemaps" | "dry_run" }
  | { action: "fail"; reason: string }
  | { action: "inject_and_upload"; host: string; apiKey: string; version: string }

/** Read `env` in the hook, after WXT loaded `.env`. */
export const planSourcemapUpload = ({
  browser,
  buildType,
  env,
  version,
}: {
  browser: string
  buildType: string | undefined
  env: Readonly<Record<string, string | undefined>>
  version: string
}): SourcemapPlan => {
  if (browser === "firefox") return { action: "skip", reason: "firefox" }
  if (buildType !== "production" && buildType !== "canary")
    return { action: "skip", reason: "no_sourcemaps" }
  if (env.POSTHOG_CLI_DRY_RUN === "true") return { action: "skip", reason: "dry_run" }
  const apiKey = env.POSTHOG_CLI_API_KEY?.trim()
  if (!apiKey)
    return {
      action: "fail",
      reason: "POSTHOG_CLI_API_KEY is not set. POSTHOG_CLI_DRY_RUN=true builds without uploading",
    }
  return {
    action: "inject_and_upload",
    host: env.POSTHOG_CLI_HOST?.trim() || POSTHOG_API_HOST,
    apiKey,
    version,
  }
}

const UPLOAD_SCOPE = "error_tracking:write"

type PersonalApiKey = {
  scopes?: readonly string[]
  scoped_teams?: readonly number[] | null
  scoped_organizations?: readonly string[] | null
}

export const uploadKeyProblem = (status: number, key: PersonalApiKey): string | null => {
  if (status === 401) return "POSTHOG_CLI_API_KEY is not a valid personal API key"
  if (status !== 200) return `PostHog answered HTTP ${status} to the POSTHOG_CLI_API_KEY check`
  if (!key.scopes?.some((scope) => scope === "*" || scope === UPLOAD_SCOPE))
    return `POSTHOG_CLI_API_KEY lacks the ${UPLOAD_SCOPE} scope`
  const teams = key.scoped_teams ?? []
  const reachesProject = teams.length
    ? teams.includes(Number(POSTHOG_PROJECT_ID))
    : !key.scoped_organizations?.length
  if (!reachesProject) return `POSTHOG_CLI_API_KEY is not limited to project ${POSTHOG_PROJECT_ID}`
  return null
}

/** Runs before the build, so a key that cannot upload fails in seconds, not after the build. */
export const preflightSourcemapPlan = async (
  plan: SourcemapPlan,
  request: typeof fetch = fetch
): Promise<void> => {
  if (plan.action === "fail") throw new Error(`[posthog sourcemaps] ${plan.reason}`)
  if (plan.action !== "inject_and_upload") return
  const res = await request(`${plan.host}/api/personal_api_keys/@current`, {
    headers: { Authorization: `Bearer ${plan.apiKey}` },
    signal: AbortSignal.timeout(30_000),
  })
  const problem = uploadKeyProblem(res.status, res.ok ? await res.json() : {})
  if (problem) throw new Error(`[posthog sourcemaps] ${problem}`)
}

/**
 * `symbol-set` stamps the release on the uploaded maps: the other mode puts it in the chunks, for
 * an SDK we do not run to read. A chunk that an earlier version uploaded keeps that version.
 */
export const cliSteps = (
  outDir: string,
  host: string,
  version: string
): readonly (readonly string[])[] => {
  const global = ["dlx", POSTHOG_CLI, "--host", host]
  const selection = [
    "--directory",
    outDir,
    ...EXCLUDED_FROM_INJECTION.flatMap((glob) => ["-e", glob]),
  ]
  return [
    [...global, "sourcemap", "inject", ...selection],
    [
      ...global,
      "sourcemap",
      "upload",
      ...selection,
      "--release-name",
      RELEASE_NAME,
      "--release-version",
      version,
      "--release-mode",
      "symbol-set",
    ],
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
    const child = spawn("pnpm", args, {
      cwd,
      env: { ...process.env, POSTHOG_CLI_PROJECT_ID: POSTHOG_PROJECT_ID },
      stdio: "inherit",
      timeout: CLI_STEP_TIMEOUT_MS,
    })
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
 * The CLI runs from the temp dir: in a git checkout it derives a release from git and calls the
 * releases API.
 */
export const runSourcemapPlan = async (
  plan: SourcemapPlan,
  { outDir, warn, run = runCli }: { outDir: string; warn: (message: string) => void; run?: RunCli }
): Promise<void> => {
  switch (plan.action) {
    case "skip":
      if (plan.reason === "dry_run") warn("Source maps are not uploaded to PostHog (dry_run)")
      return
    case "fail":
      throw new Error(`[posthog sourcemaps] ${plan.reason}`)
    case "inject_and_upload": {
      const [inject, upload] = cliSteps(outDir, plan.host, plan.version)
      await run(inject, { cwd: tmpdir() })
      assertInjection(outDir)
      await run(upload, { cwd: tmpdir() })
    }
  }
}
