import { renderHook, waitFor } from "@testing-library/react"

import { ADDRESSES } from "../../../../tests/constants"
import { TestWrapper } from "../../../../tests/TestWrapper"
import { useAccountByAddress } from "../useAccountByAddress"

test("Can get account from address", async () => {
  const { result } = renderHook(() => useAccountByAddress(ADDRESSES.GAV), { wrapper: TestWrapper })
  await waitFor(() => expect(result.current).toBeTruthy())

  expect(result.current && result.current.name).toBe("Gav")
})
