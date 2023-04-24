import { AccountJsonAny } from "@core/domains/accounts/types"

import { ADDRESSES } from "./constants"

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

jest.mock("@ui/api", () => {
  return {
    api: {
      accountsSubscribe: jest
        .fn()
        .mockImplementation((cb: (accounts: AccountJsonAny[]) => void) => {
          cb([
            {
              address: ADDRESSES.GAV,
              genesisHash: "testGenesisHash",
              isExternal: false,
              isHardware: false,
              name: "Gav",
              suri: "a very bad mnemonic which actually doesn't have twelve words",
              type: "sr25519",
            },
            {
              address: ADDRESSES.VITALIK,
              isExternal: false,
              isHardware: false,
              name: "Vitalik",
              suri: "another very bad mnemonic which also doesn't have twelve words",
              type: "ethereum",
            },
          ])
          return () => undefined
        }),
    },
  }
})

export {}
