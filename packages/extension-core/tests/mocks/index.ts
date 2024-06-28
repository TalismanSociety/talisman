jest.setTimeout(20_000)

// mock the `pnpm preconstruct dev` version of the package
jest.mock("@talismn/chaindata-provider/src/net")

// mock the `pnpm build:packages` version of the package
//
// it only exists after calling pnpm build:packages,
// so there's a `try {} catch {}` to ignore when it doesn't exist
try {
  jest.mock(
    "@talismn/chaindata-provider/net/dist/talismn-chaindata-provider-net.cjs.dev.js",
    () => ({
      ...jest.requireActual(
        "@talismn/chaindata-provider/net/dist/talismn-chaindata-provider-net.cjs.dev.js"
      ),
      ...jest.requireActual("@talismn/chaindata-provider/src/__mocks__/net.ts"),
    })
  )
} catch {} // eslint-disable-line no-empty

jest.mock("bcryptjs", () => {
  return {
    ...jest.requireActual("bcryptjs"),
    genSalt: jest.fn((rounds: number) => `salt-${rounds}`),
    hash: jest.fn((password: string, salt: string) => `${password}.${salt}`),
    compare: jest.fn(
      (password: string, hash: string) => password === hash.slice(0, hash.lastIndexOf("."))
    ),
  }
})

jest.mock("../../src/util/fetchRemoteConfig", () => ({
  fetchRemoteConfig: jest.fn(() =>
    Promise.resolve({
      featureFlags: {
        BUY_CRYPTO: true, // nav buttons + button in fund wallet component
        LINK_STAKING: true,
      },
    })
  ),
}))

jest.mock("webextension-polyfill", () => {
  return {
    ...jest.requireActual("webextension-polyfill"),
    runtime: {
      ...jest.requireActual("webextension-polyfill").runtime,
      getBackgroundPage: jest
        .fn()
        .mockImplementation(() => Promise.resolve({ location: window.location })),
    },
  }
})

export {}
