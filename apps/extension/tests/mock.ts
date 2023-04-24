import { AccountJsonAny } from "@core/domains/accounts/types"

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
              address: "testAddress",
              genesisHash: "testGenesisHash",
              isExternal: false,
              isHardware: false,
              name: "testAccount",
              suri: "a very bad mnemonic which actually doesn't have twelve words",
              type: "sr25519",
            },
            {
              address: "testEthAddress",
              isExternal: false,
              isHardware: false,
              name: "testEthAccount",
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
