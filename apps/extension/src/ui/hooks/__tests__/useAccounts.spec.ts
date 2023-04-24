import { renderHook } from "@testing-library/react"

import { useAccounts } from "../useAccounts"

test("Can get accounts", async () => {
  const { result } = renderHook(() => useAccounts())
  expect(result.current.length).toBe(2)
  expect(result.current[0].address).toBe("testAddress")
})
