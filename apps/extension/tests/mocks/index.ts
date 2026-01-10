import { vi } from "vitest"

import { mockedApi } from "./api"

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

vi.mock("@ui/api", () => ({ api: mockedApi }))

vi.mock("react-i18next", () => ({
  // this mock makes sure any components using the translate hook can use it without a warning being shown
  useTranslation: () => {
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      t: (str: string, options: any) =>
        str.replace(/\{\{(.*?)\}\}/g, (substring, ...args) => {
          return args?.[0] && options?.[args[0]] ? options[args[0]] : substring
        }),
      i18n: {
        changeLanguage: () => new Promise(() => {}),
      },
    }
  },
  initReactI18next: {
    type: "3rdParty",
    init: () => {},
  },
}))

vi.mock("extension-core/src/util/fetchRemoteConfig", () => ({
  fetchRemoteConfig: vi.fn(() =>
    Promise.resolve({
      featureFlags: {
        BUY_CRYPTO: true, // nav buttons + button in fund wallet component
        LINK_STAKING: true,
      },
    }),
  ),
}))

export {}
