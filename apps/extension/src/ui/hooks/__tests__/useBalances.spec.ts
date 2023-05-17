import { Balances } from "@talismn/balances"
import { renderHook } from "@testing-library/react"
import { RecoilRoot } from "recoil"

import { useBalances } from "../useBalances"

describe("useBalances tests", () => {
  test("Can get useBalances data", async () => {
    const { result } = renderHook(() => useBalances(), {
      wrapper: RecoilRoot,
    })
    expect(result.current).toBeInstanceOf(Balances)
  })
})
