import { renderHook, waitFor } from "@testing-library/react"
import { useAccounts } from "@ui/state/accounts"
import { expect, test } from "vitest"
import { ADDRESSES } from "../../../../tests/constants"
import { TestWrapper } from "../../../../tests/TestWrapper"

test("Can get accounts", async () => {
  const { result } = renderHook(() => useAccounts(), { wrapper: TestWrapper })
  await waitFor(() => expect(result.current.length).toBe(3))
  expect(result.current[0].address).toBe(ADDRESSES.GAV)
})
