import { renderHook, waitFor } from "@testing-library/react"
import { useAccountByAddress } from "@ui/state/accounts"
import { ADDRESSES } from "../../../../tests/constants"
import { TestWrapper } from "../../../../tests/TestWrapper"

test("Can get account from address", async () => {
  const { result } = renderHook(() => useAccountByAddress(ADDRESSES.GAV), { wrapper: TestWrapper })
  await waitFor(() => expect(result.current).toBeTruthy())

  expect(result.current?.name).toBe("Gav")
})
