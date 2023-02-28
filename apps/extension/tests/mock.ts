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

export {}
