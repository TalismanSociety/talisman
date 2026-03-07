import { vi } from "vitest"

vi.mock("webextension-polyfill", async () => {
  const actual =
    await vi.importActual<typeof import("webextension-polyfill")>("webextension-polyfill")
  return {
    ...actual,
    runtime: {
      ...actual.runtime,
      getBackgroundPage: vi
        .fn()
        .mockImplementation(() => Promise.resolve({ location: window.location })),
    },
  }
})

vi.mock("@polkadot/apps-config/api", () => {
  return {
    typesBundle: {},
  }
})

vi.mock("@core/util/isBackgroundPage", () => ({
  isBackgroundPage: vi.fn().mockImplementation(() => true),
}))
