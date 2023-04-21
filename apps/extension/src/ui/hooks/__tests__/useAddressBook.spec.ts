import { renderHook } from "@testing-library/react"
import { RecoilRoot } from "recoil"

import { useAddressBook } from "../useAddressBook"

test("allows you to add an address book contact", () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { result } = renderHook(() => useAddressBook(), {
    wrapper: RecoilRoot,
  })
  // expect(result.current.contacts.length).toBe(0)
})
