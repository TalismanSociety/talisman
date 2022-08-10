import { IToken } from "@talismn/chaindata-provider/dist/types/Token"

import { BalanceModule, DefaultBalanceModule } from "./BalanceModule"

type TestToken = IToken & {
  id: string
  type: "test"
}

describe("BalanceModule", () => {
  it("Can be implemented", () => {
    // const chainStorage = {
    //   get: () => Promise.resolve(null),
    // }

    const testModule: BalanceModule<TestToken> = {
      ...DefaultBalanceModule(),
    }

    expect(testModule).toBeDefined()
  })
})
