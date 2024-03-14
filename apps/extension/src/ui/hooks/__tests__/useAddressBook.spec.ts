import { AddressBookContact, addressBookStore } from "@extension/core"
import { act, renderHook, waitFor } from "@testing-library/react"

import { ADDRESSES } from "../../../../tests/constants"
import { TestWrapper } from "../../../../tests/TestWrapper"
import { useAddressBook } from "../useAddressBook"

const VITALIK: AddressBookContact = {
  address: "0xab5801a7d398351b8be11c439e05c5b3259aec9b",
  name: "Vitalik",
  addressType: "ethereum",
}

test("Can add an address book contact", async () => {
  const { result } = renderHook(() => useAddressBook(), {
    wrapper: TestWrapper,
  })
  expect(result.current.contacts.length).toBe(0)

  await act(async () => {
    await result.current.add(VITALIK)
  })

  waitFor(() => {
    expect(result.current.contacts.length).toBe(1)
    expect(result.current.contacts).toBe([VITALIK])
  })
})

test("Can edit an address book contact", async () => {
  await addressBookStore.set({ [VITALIK.address]: VITALIK })
  const { result } = renderHook(() => useAddressBook(), {
    wrapper: ({ children }) => TestWrapper({ children }),
  })
  waitFor(() => {
    expect(result.current.contacts.length).toBe(1)
    expect(result.current.contacts[0]).toBe(VITALIK)
  })
  await act(async () => {
    await result.current.edit({ address: VITALIK.address, name: "Gav" })
  })

  waitFor(() => {
    expect(result.current.contacts[0].name).toBe("Gav")
  })
})

test("Editing an address book contact which doesn't exist throws an error", async () => {
  await addressBookStore.set({ [VITALIK.address]: VITALIK })
  const { result } = renderHook(() => useAddressBook(), {
    wrapper: ({ children }) => TestWrapper({ children }),
  })
  waitFor(() => {
    expect(result.current.contacts.length).toBe(1)
    expect(result.current.contacts[0]).toBe(VITALIK)
  })
  //
  await act(async () => {
    await result.current
      .edit({ address: ADDRESSES.GAV, name: "Gav" })
      .catch((error) =>
        expect(error.message).toBe(`Contact with address ${ADDRESSES.GAV} doesn't exist`)
      )
  })
})

test("Can delete an address book contact", async () => {
  await addressBookStore.set({ [VITALIK.address]: VITALIK })
  const { result } = renderHook(() => useAddressBook(), {
    wrapper: ({ children }) => TestWrapper({ children }),
  })
  waitFor(() => {
    expect(result.current.contacts.length).toBe(1)
    expect(result.current.contacts[0]).toBe(VITALIK)
  })

  await act(async () => {
    await result.current.deleteContact({ address: VITALIK.address })
  })

  waitFor(() => {
    expect(result.current.contacts.length).toBe(0)
  })
})
