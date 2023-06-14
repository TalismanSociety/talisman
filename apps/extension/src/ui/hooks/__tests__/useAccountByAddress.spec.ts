import { renderHook } from "@testing-library/react"

import { ADDRESSES } from "../../../../tests/constants"
import { TestRecoilRoot } from "../../../../tests/TestRecoilRoot"
import { useAccountByAddress } from "../useAccountByAddress"

test("Can get account from address", async () => {
  const { result } = renderHook(() => useAccountByAddress(ADDRESSES.GAV), {
    wrapper: TestRecoilRoot,
  })
  expect(result.current).toBeTruthy()

  expect(result.current && result.current.name).toBe("Gav")
})
