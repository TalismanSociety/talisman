import { Balances } from "@talismn/balances"
import { renderHook, waitFor } from "@testing-library/react"
import { useBalances } from "@ui/state/balances"
import { describe, expect, test } from "vitest"
import { TestWrapper } from "../../../../tests/TestWrapper"

describe("useBalances tests", () => {
  test("Can get useBalances data", async () => {
    const { result } = renderHook(() => useBalances(), {
      wrapper: TestWrapper,
    })

    await waitFor(() => expect(result.current).toBeInstanceOf(Balances))
  })
})
