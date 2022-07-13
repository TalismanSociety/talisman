import { BalanceModule } from "./BalanceModule"

type TestToken = {
  id: string
  type: "test"
}
type TestChainMeta = Record<string, never>

describe("BalanceModule", () => {
  it("Can be implemented", () => {
    const chainStorage = {
      get: () => Promise.resolve(null),
    }

    class TestModule extends BalanceModule<TestToken, TestChainMeta> {}

    const testModule = new TestModule(chainStorage)

    expect(testModule).toBeDefined()
  })
})
