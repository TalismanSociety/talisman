jest.setTimeout(20_000)

// prevent chaindata-provider from trying to connect to the network
jest.mock("@talismn/chaindata-provider/src/state/net")

jest.mock("bcryptjs", () => {
  return {
    ...jest.requireActual("bcryptjs"),
    genSalt: jest.fn((rounds: number) => `salt-${rounds}`),
    hash: jest.fn((password: string, salt: string) => `${password}.${salt}`),
    compare: jest.fn(
      (password: string, hash: string) => password === hash.slice(0, hash.lastIndexOf(".")),
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
    }),
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

jest.mock("@polkadot/apps-config/api", () => {
  return {
    typesBundle: {},
  }
})

jest.mock("../../src/util/isBackgroundPage", () => ({
  isBackgroundPage: jest.fn().mockImplementation(() => true),
}))

export {}
