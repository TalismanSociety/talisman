import { vi } from "vitest"

// prevent chaindata-provider from trying to connect to the network
vi.mock("@talismn/chaindata-provider/src/state/net")

vi.mock("bcryptjs", async () => {
  const actual = await vi.importActual<typeof import("bcryptjs")>("bcryptjs")
  return {
    ...actual,
    genSalt: vi.fn((rounds: number) => `salt-${rounds}`),
    hash: vi.fn((password: string, salt: string) => `${password}.${salt}`),
    compare: vi.fn(
      (password: string, hash: string) => password === hash.slice(0, hash.lastIndexOf(".")),
    ),
  }
})

vi.mock("../../src/util/fetchRemoteConfig", () => ({
  fetchRemoteConfig: vi.fn(() =>
    Promise.resolve({
      featureFlags: {
        BUY_CRYPTO: true, // nav buttons + button in fund wallet component
        LINK_STAKING: true,
      },
    }),
  ),
}))

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

vi.mock("../../src/util/isBackgroundPage", () => ({
  isBackgroundPage: vi.fn().mockImplementation(() => true),
}))

export {}
