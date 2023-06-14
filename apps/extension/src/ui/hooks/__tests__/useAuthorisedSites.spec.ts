import { TALISMAN_WEB_APP_DOMAIN } from "@core/constants"
import { renderHook } from "@testing-library/react"

import { ADDRESSES } from "../../../../tests/constants"
import { TestRecoilRoot } from "../../../../tests/TestRecoilRoot"
import { useAuthorisedSites } from "../useAuthorisedSites"

test("Can get Authorised Sites", async () => {
  const { result } = renderHook(() => useAuthorisedSites(), { wrapper: TestRecoilRoot })
  expect(Object.keys(result.current).length).toBe(2)
  expect(result.current[TALISMAN_WEB_APP_DOMAIN]).toBeDefined()
  expect(result.current[TALISMAN_WEB_APP_DOMAIN].addresses).toStrictEqual([
    ADDRESSES.GAV,
    ADDRESSES.ALICE,
  ])
})
