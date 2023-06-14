import { Balances } from "@talismn/balances"
import { renderHook, waitFor } from "@testing-library/react"

import { TestRecoilRoot } from "../../../../tests/TestRecoilRoot"
import { useBalances } from "../useBalances"

describe("useBalances tests", () => {
  test("Can get useBalances data", async () => {
    const { result } = renderHook(() => useBalances(), {
      wrapper: TestRecoilRoot,
    })

    await waitFor(() => expect(result.current).toBeInstanceOf(Balances))
  })
})
