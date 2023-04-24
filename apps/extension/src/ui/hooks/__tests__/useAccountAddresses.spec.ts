import { renderHook } from "@testing-library/react"

import { ADDRESSES } from "../../../../tests/constants"
import { useAccountAddresses } from "../useAccountAddresses"

test("Can get substrate account by address", async () => {
  const { result } = renderHook(() => useAccountAddresses())
  expect(result.current.length).toBe(3)
  expect(result.current[0]).toBe(ADDRESSES.GAV)
})

test("Can get ethereum account by address", async () => {
  const { result } = renderHook(() => useAccountAddresses(true))
  expect(result.current.length).toBe(1)
  expect(result.current[0]).toBe(ADDRESSES.VITALIK)
})
