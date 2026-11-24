import type { LedgerTransportType } from "@core/domains/app/store.settings"

import { LEDGER_EMULATOR_URL } from "./speculosTransport"

const hidTransport = { kind: "hid", on: vi.fn() }

vi.mock("@ledgerhq/hw-transport-webhid", () => ({
  default: { create: vi.fn(async () => hidTransport) },
}))

const emulatorRequests: string[] = []
let emulatorRunning = true

const fetchEmulator = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
  emulatorRequests.push(`${init?.method ?? "GET"} ${String(input)}`)
  if (!emulatorRunning) throw new TypeError("Failed to fetch")
  return new Response(JSON.stringify({ events: [] }))
})

const createTransportIn = async (buildType: "dev" | "canary" | "production") => {
  vi.resetModules()
  vi.stubEnv("BUILD_TYPE", buildType)
  const { createTransport } = await import("./useLedgerTransport")
  return (type: LedgerTransportType) => createTransport(type)
}

beforeAll(() => {
  vi.stubGlobal("fetch", fetchEmulator)
  Object.defineProperty(window.navigator, "hid", { value: {}, configurable: true })
})

afterAll(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  Reflect.deleteProperty(window.navigator, "hid")
})

beforeEach(() => {
  emulatorRequests.length = 0
})

describe("createTransport with the emulator running", () => {
  beforeAll(() => {
    emulatorRunning = true
  })

  it("connects to the emulator in a dev build", async () => {
    const createTransport = await createTransportIn("dev")

    const transport = await createTransport("speculos")

    expect(transport).not.toBe(hidTransport)
    expect(emulatorRequests).toEqual([`GET ${LEDGER_EMULATOR_URL}/events?currentscreenonly=true`])
  })

  it.each(["production", "canary"] as const)(
    "falls back to HID and never calls the emulator in a %s build",
    async (buildType) => {
      const createTransport = await createTransportIn(buildType)

      expect(await createTransport("speculos")).toBe(hidTransport)
      expect(emulatorRequests).toEqual([])
    }
  )

  it("keeps HID on HID in a dev build", async () => {
    const createTransport = await createTransportIn("dev")

    expect(await createTransport("hid")).toBe(hidTransport)
    expect(emulatorRequests).toEqual([])
  })
})

describe("createTransport with the emulator stopped", () => {
  beforeAll(() => {
    emulatorRunning = false
  })

  it("fails with a Ledger error that says how to start it", async () => {
    const createTransport = await createTransportIn("dev")

    const error = await createTransport("speculos").catch((e: unknown) => e)

    expect(error).toMatchObject({
      isTalismanLedgerError: true,
      message: `Could not connect to the Ledger emulator at ${LEDGER_EMULATOR_URL}. Run pnpm ledger:emulator start.`,
    })
  })
})
