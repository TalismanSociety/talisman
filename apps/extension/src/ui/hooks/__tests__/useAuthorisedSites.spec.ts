import { TALISMAN_WEB_APP_DOMAIN } from "@common/constants"
import { renderHook, waitFor } from "@testing-library/react"
import { useAuthorisedSites } from "@ui/state/authorisedSites"
import { expect, test } from "vitest"
import { ADDRESSES } from "../../../../tests/constants"
import { TestWrapper } from "../../../../tests/TestWrapper"

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
