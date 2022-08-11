import { NewTokenType } from "@talismn/chaindata-provider"

import { BalanceModule, DefaultBalanceModule } from "./BalanceModule"

type TestToken = NewTokenType<"test", { id: string }>

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
