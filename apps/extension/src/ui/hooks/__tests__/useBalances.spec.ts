import { Balances } from "@talismn/balances"
import { renderHook, waitFor } from "@testing-library/react"

import { TestWrapper } from "../../../../tests/TestWrapper"
import { useBalances } from "../useBalances"

describe("useBalances tests", () => {
  test("Can get useBalances data", async () => {
    const { result } = renderHook(() => useBalances(), {
      wrapper: TestWrapper,
    })

    await waitFor(() => expect(result.current).toBeInstanceOf(Balances))
  })
})
