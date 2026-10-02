import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  assertInjection,
  cliSteps,
  planSourcemapUpload,
  preflightSourcemapPlan,
  type RunCli,
  runSourcemapPlan,
  type SourcemapPlan,
} from "./posthogSourcemaps"

const KEYS = { POSTHOG_CLI_API_KEY: "phx_test" }
const HOST = "https://us.posthog.com"
const VERSION = "3.10.1"
const BUILD = "4d329168b"

const untouchable = new Proxy(
  {},
  {
    get: () => {
      throw new Error("env read")
    },
  }
)

const plan = (args: Omit<Parameters<typeof planSourcemapUpload>[0], "version" | "build">) =>
  planSourcemapUpload({ version: VERSION, build: BUILD, ...args })

describe("planSourcemapUpload", () => {
  it("skips Firefox before it reads the env", () => {
    expect(
      plan({
        browser: "firefox",
        buildType: "production",
        env: untouchable,
      })
    ).toEqual({ action: "skip", reason: "firefox" })
  })

  it.each(["dev", undefined])("skips a %s build: it has no maps", (buildType) => {
    expect(
      plan({
        browser: "chrome",
        buildType,
        env: KEYS,
      })
    ).toEqual({
      action: "skip",
      reason: "no_sourcemaps",
    })
  })

  it.each([
    ["no key", {}],
    ["a blank key", { POSTHOG_CLI_API_KEY: "  " }],
  ])("fails with %s, and skips on the CLI's dry run", (_, env) => {
    expect(
      plan({
        browser: "chrome",
        buildType: "canary",
        env,
      })
    ).toMatchObject({
      action: "fail",
    })
    expect(
      plan({
        browser: "chrome",
        buildType: "production",
        env: { ...KEYS, POSTHOG_CLI_DRY_RUN: "true" },
      })
    ).toEqual({ action: "skip", reason: "dry_run" })
  })

  it("uploads a production or canary Chrome build with the key, to the project's API host", () => {
    expect(
      plan({
        browser: "chrome",
        buildType: "production",
        env: KEYS,
      })
    ).toEqual({
      action: "inject_and_upload",
      host: HOST,
      apiKey: "phx_test",
      version: VERSION,
      build: BUILD,
    })
    expect(
      plan({
        browser: "chrome",
        buildType: "canary",
        env: { ...KEYS, POSTHOG_CLI_HOST: "http://127.0.0.1:9" },
      })
    ).toEqual({
      action: "inject_and_upload",
      host: "http://127.0.0.1:9",
      apiKey: "phx_test",
      version: VERSION,
      build: BUILD,
    })
  })
})

describe("cliSteps", () => {
  it("injects then uploads, both excluding page.js and content scripts, and stamps the version and build on the upload only", () => {
    const [inject, upload] = cliSteps("/out/chrome-mv3", {
      host: "http://127.0.0.1:9",
      version: VERSION,
      build: BUILD,
    })

    for (const args of [inject, upload]) {
      expect(args).toEqual(expect.arrayContaining(["--host", "http://127.0.0.1:9"]))
      expect(args.join(" ")).toContain("-e **/page.js -e **/content-scripts/**")
    }
    expect(inject.join(" ")).toContain("sourcemap inject")
    expect(inject.some((arg) => arg.startsWith("--release"))).toBe(false)
    expect(upload.join(" ")).toContain("sourcemap upload")
    expect(upload.join(" ")).toContain(
      "--release-name talisman-extension --release-version 3.10.1 --build 4d329168b --release-mode symbol-set"
    )
  })
})

const outDir = (files: Record<string, string>) => {
  const dir = mkdtempSync(join(tmpdir(), "posthog-sourcemaps-"))
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(join(dir, file, ".."), { recursive: true })
    writeFileSync(join(dir, file), content)
  }
  return dir
}

const INJECTED = "code()\n//# chunkId=9ccf2ac6-4f00-5a67-b4b7-4414f264d587"

describe("assertInjection", () => {
  it("passes when background.js is injected and page.js and the content script are not", () => {
    const dir = outDir({
      "background.js": INJECTED,
      "page.js": "",
      "content-scripts/content.js": "",
    })
    expect(() => assertInjection(dir)).not.toThrow()
  })

  it.each([
    ["background.js is not injected", { "background.js": "", "page.js": "" }],
    ["page.js is injected", { "background.js": INJECTED, "page.js": INJECTED }],
    [
      "the content script is injected",
      { "background.js": INJECTED, "content-scripts/content.js": INJECTED },
    ],
  ])("fails when %s", (_, files) => {
    expect(() => assertInjection(outDir(files))).toThrow(/posthog sourcemaps/)
  })
})

const UPLOAD: SourcemapPlan = {
  action: "inject_and_upload",
  host: HOST,
  apiKey: "phx_test",
  version: VERSION,
  build: BUILD,
}

describe("preflightSourcemapPlan", () => {
  const answering =
    (status: number, key: object = {}): typeof fetch =>
    async (url, init) => {
      expect(String(url)).toBe(`${HOST}/api/personal_api_keys/@current`)
      expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer phx_test")
      return Response.json(key, { status })
    }
  const UPLOAD_KEY = { scopes: ["error_tracking:write"], scoped_teams: [639977] }

  it.each([
    ["a key limited to the project", UPLOAD_KEY],
    ["an all-access key", { scopes: ["*"], scoped_teams: [], scoped_organizations: [] }],
  ])("passes %s", async (_, key) => {
    await expect(preflightSourcemapPlan(UPLOAD, answering(200, key))).resolves.toBeUndefined()
  })

  it.each([
    ["an invalid key", 401, {}, /not a valid/],
    [
      "a key without the upload scope",
      200,
      { ...UPLOAD_KEY, scopes: ["query:read"] },
      /error_tracking:write/,
    ],
    ["a key for another project", 200, { ...UPLOAD_KEY, scoped_teams: [1] }, /project 639977/],
    [
      "an organisation-wide key",
      200,
      { scopes: ["*"], scoped_organizations: ["org"] },
      /project 639977/,
    ],
    ["a PostHog error", 503, {}, /HTTP 503/],
  ])("fails %s", async (_, status, key, message) => {
    await expect(preflightSourcemapPlan(UPLOAD, answering(status, key))).rejects.toThrow(message)
  })

  it("fails a fail plan and lets a skip through, both without a request", async () => {
    const offline: typeof fetch = async () => {
      throw new Error("request")
    }
    await expect(
      preflightSourcemapPlan({ action: "fail", reason: "POSTHOG_CLI_API_KEY is not set" }, offline)
    ).rejects.toThrow(/not set/)
    await expect(
      preflightSourcemapPlan({ action: "skip", reason: "firefox" }, offline)
    ).resolves.toBeUndefined()
  })
})

describe("runSourcemapPlan", () => {
  const recorder = (failAt?: "inject" | "upload") => {
    const calls: { args: readonly string[]; cwd: string }[] = []
    const run: RunCli = async (args, { cwd }) => {
      calls.push({ args, cwd })
      if (args.includes(failAt ?? "none")) throw new Error(`${failAt} failed`)
    }
    return { calls, run }
  }
  const warnings: string[] = []
  const warn = (message: string) => warnings.push(message)

  it("never starts the CLI on a skip or a fail, and warns only on the dry run", async () => {
    const { calls, run } = recorder()
    warnings.length = 0
    await runSourcemapPlan({ action: "skip", reason: "firefox" }, { outDir: "/x", warn, run })
    await runSourcemapPlan({ action: "skip", reason: "dry_run" }, { outDir: "/x", warn, run })
    await expect(
      runSourcemapPlan({ action: "fail", reason: "not set" }, { outDir: "/x", warn, run })
    ).rejects.toThrow(/not set/)
    expect(calls).toEqual([])
    expect(warnings).toHaveLength(1)
  })

  it("runs both steps from the temp dir, checking the injection in between", async () => {
    const { calls, run } = recorder()
    const dir = outDir({ "background.js": INJECTED })
    await runSourcemapPlan(UPLOAD, { outDir: dir, warn, run })
    expect(calls.map(({ args }) => args[args.indexOf("sourcemap") + 1])).toEqual([
      "inject",
      "upload",
    ])
    expect(calls.every(({ cwd }) => cwd === tmpdir())).toBe(true)
  })

  it("does not upload after a failed inject or a missing chunk id, and rejects on a failed upload", async () => {
    const failedInject = recorder("inject")
    const dir = outDir({ "background.js": INJECTED })
    await expect(
      runSourcemapPlan(UPLOAD, { outDir: dir, warn, run: failedInject.run })
    ).rejects.toThrow("inject failed")
    expect(failedInject.calls).toHaveLength(1)

    const notInjected = recorder()
    await expect(
      runSourcemapPlan(UPLOAD, {
        outDir: outDir({ "background.js": "" }),
        warn,
        run: notInjected.run,
      })
    ).rejects.toThrow(/chunk ids missing/)
    expect(notInjected.calls).toHaveLength(1)

    const failedUpload = recorder("upload")
    await expect(
      runSourcemapPlan(UPLOAD, { outDir: dir, warn, run: failedUpload.run })
    ).rejects.toThrow("upload failed")
  })
})
