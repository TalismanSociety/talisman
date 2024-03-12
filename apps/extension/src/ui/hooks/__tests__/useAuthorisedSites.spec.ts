import { TALISMAN_WEB_APP_DOMAIN } from "@extension/shared"
import { renderHook, waitFor } from "@testing-library/react"

import { ADDRESSES } from "../../../../tests/constants"
import { TestWrapper } from "../../../../tests/TestWrapper"
import { useAuthorisedSites } from "../useAuthorisedSites"

test("Can get Authorised Sites", async () => {
  const { result } = renderHook(() => useAuthorisedSites(), {
    wrapper: TestWrapper,
  })
  await waitFor(() => expect(Object.keys(result.current).length).toBe(2))
  expect(result.current[TALISMAN_WEB_APP_DOMAIN]).toBeDefined()
  expect(result.current[TALISMAN_WEB_APP_DOMAIN].addresses).toStrictEqual([
    ADDRESSES.GAV,
    ADDRESSES.ALICE,
  ])
})
