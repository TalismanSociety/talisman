import { api } from "./api"

jest.mock("@talismn/chaindata-provider-extension/src/graphql")
jest.setTimeout(20000)

jest.mock("@talismn/util", () => {
  return {
    ...jest.requireActual("@talismn/util"),
    sleep: jest.fn(),
  }
})

jest.mock("bcryptjs", () => {
  return {
    ...jest.requireActual("bcryptjs"),
    genSalt: jest.fn((rounds: number) => `salt-${rounds}`),
    hash: jest.fn((password: string, salt: string) => `${password}.${salt}`),
  }
})

jest.mock("@ui/api", () => api)

jest.mock("react-i18next", () => ({
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

export {}
