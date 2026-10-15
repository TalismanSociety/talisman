import { afterEach, describe, expect, it, vi } from "vitest"

const transmissionFor = async (env: { BROWSER?: string; BUILD?: string; BUILD_TYPE?: string }) => {
  vi.resetModules()
  for (const key of ["BROWSER", "BUILD", "BUILD_TYPE"] as const)
    vi.stubEnv(key, env[key] as string | undefined)
  return (await import("./transmission")).TRANSMISSION
}

describe("TRANSMISSION", () => {
  afterEach(() => vi.unstubAllEnvs())

  it.each([["production"], ["canary"]])(
    "sends to PostHog from a %s Chrome build",
    async (buildType) => {
      const transmission = await transmissionFor({
        BROWSER: "chrome",
        BUILD: "production",
        BUILD_TYPE: buildType,
      })
      expect(transmission.mode).toBe("posthog")
    }
  )

  it("keeps a dev build's events in the local log", async () => {
    expect(await transmissionFor({ BROWSER: "chrome", BUILD: "dev", BUILD_TYPE: "dev" })).toEqual({
      mode: "dev_log",
    })
  })

  it.each([
    ["a plain build, as CI and the e2e suite make", { BROWSER: "chrome", BUILD: "production" }],
    [
      "a build with an unknown build type",
      { BROWSER: "chrome", BUILD: "production", BUILD_TYPE: "dev" },
    ],
    ["a run with no build constants, as unit tests", {}],
    [
      "a Firefox production build",
      { BROWSER: "firefox", BUILD: "production", BUILD_TYPE: "production" },
    ],
    ["a Firefox dev build", { BROWSER: "firefox", BUILD: "dev", BUILD_TYPE: "dev" }],
  ])("sends nothing from %s", async (_label, env) => {
    expect(await transmissionFor(env)).toEqual({ mode: "off" })
  })
})
