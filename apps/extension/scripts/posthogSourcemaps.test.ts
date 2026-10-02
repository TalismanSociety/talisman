import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  assertInjection,
  cliSteps,
  planSourcemapUpload,
  type RunCli,
  runSourcemapPlan,
} from "./posthogSourcemaps"

const KEYS = { POSTHOG_CLI_API_KEY: "phx_test" }
const HOST = "https://us.posthog.com"

const untouchable = new Proxy(
  {},
  {
    get: () => {
      throw new Error("env read")
    },
  }
)

describe("planSourcemapUpload", () => {
  it("skips Firefox before it reads the env", () => {
    expect(
      planSourcemapUpload({ browser: "firefox", buildType: "production", env: untouchable })
    ).toEqual({ action: "skip", reason: "firefox" })
  })

  it.each(["dev", undefined])("skips a %s build: it has no maps", (buildType) => {
    expect(planSourcemapUpload({ browser: "chrome", buildType, env: KEYS })).toEqual({
      action: "skip",
      reason: "no_sourcemaps",
    })
  })

  it.each([
    ["no key", {}],
    ["a blank key", { POSTHOG_CLI_API_KEY: "  " }],
  ])("skips with %s, and on the CLI's dry run", (_, env) => {
    expect(planSourcemapUpload({ browser: "chrome", buildType: "production", env })).toEqual({
      action: "skip",
      reason: "no_credentials",
    })
    expect(
      planSourcemapUpload({
        browser: "chrome",
        buildType: "production",
        env: { ...KEYS, POSTHOG_CLI_DRY_RUN: "true" },
      })
    ).toEqual({ action: "skip", reason: "dry_run" })
  })

  it("uploads a production or canary Chrome build with the key, to the project's API host", () => {
    expect(planSourcemapUpload({ browser: "chrome", buildType: "production", env: KEYS })).toEqual({
      action: "inject_and_upload",
      host: HOST,
    })
    expect(
      planSourcemapUpload({
        browser: "chrome",
        buildType: "canary",
        env: { ...KEYS, POSTHOG_CLI_HOST: "http://127.0.0.1:9" },
      })
    ).toEqual({ action: "inject_and_upload", host: "http://127.0.0.1:9" })
  })
})

describe("cliSteps", () => {
  it("injects then uploads, both excluding page.js and content scripts, with no release", () => {
    const steps = cliSteps("/out/chrome-mv3", "http://127.0.0.1:9")

    expect(steps.map((args) => args.slice(-8, -6))).toEqual([
      ["sourcemap", "inject"],
      ["sourcemap", "upload"],
    ])
    for (const args of steps) {
      expect(args).toEqual(expect.arrayContaining(["--host", "http://127.0.0.1:9"]))
      expect(args.join(" ")).toContain("-e **/page.js -e **/content-scripts/**")
      expect(args.some((arg) => arg.startsWith("--release"))).toBe(false)
    }
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

  it("never starts the CLI on a skip, and warns only when the variables are missing", async () => {
    const { calls, run } = recorder()
    warnings.length = 0
    await runSourcemapPlan({ action: "skip", reason: "firefox" }, { outDir: "/x", warn, run })
    await runSourcemapPlan(
      { action: "skip", reason: "no_credentials" },
      { outDir: "/x", warn, run }
    )
    expect(calls).toEqual([])
    expect(warnings).toHaveLength(1)
  })

  it("runs both steps from the temp dir, checking the injection in between", async () => {
    const { calls, run } = recorder()
    const dir = outDir({ "background.js": INJECTED })
    await runSourcemapPlan({ action: "inject_and_upload", host: HOST }, { outDir: dir, warn, run })
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
      runSourcemapPlan(
        { action: "inject_and_upload", host: HOST },
        { outDir: dir, warn, run: failedInject.run }
      )
    ).rejects.toThrow("inject failed")
    expect(failedInject.calls).toHaveLength(1)

    const notInjected = recorder()
    await expect(
      runSourcemapPlan(
        { action: "inject_and_upload", host: HOST },
        { outDir: outDir({ "background.js": "" }), warn, run: notInjected.run }
      )
    ).rejects.toThrow(/chunk ids missing/)
    expect(notInjected.calls).toHaveLength(1)

    const failedUpload = recorder("upload")
    await expect(
      runSourcemapPlan(
        { action: "inject_and_upload", host: HOST },
        { outDir: dir, warn, run: failedUpload.run }
      )
    ).rejects.toThrow("upload failed")
  })
})
