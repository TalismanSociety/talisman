import { renderHook, waitFor } from "@testing-library/react"

import { ADDRESSES } from "../../../../tests/constants"
import { TestWrapper } from "../../../../tests/TestWrapper"
import { useAccountAddresses } from "../useAccountAddresses"

test("Can get substrate account by address", async () => {
  const { result } = renderHook(() => useAccountAddresses(), { wrapper: TestWrapper })
  await waitFor(() => expect(result.current.length).toBe(3))
  expect(result.current[0]).toBe(ADDRESSES.GAV)
})

test("Can get ethereum account by address", async () => {
  const { result } = renderHook(() => useAccountAddresses(true), { wrapper: TestWrapper })
  await waitFor(() => expect(result.current.length).toBe(1))
  expect(result.current[0]).toBe(ADDRESSES.VITALIK)
})
