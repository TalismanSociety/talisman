/* eslint-disable react/display-name */
import { AccountJsonAny } from "@core/domains/accounts/types"
import { Address } from "@talismn/balances"
import { encodeAnyAddress } from "@talismn/util"
import { api } from "@ui/api"
import { atom, selectorFamily } from "recoil"

export const accountsState = atom<AccountJsonAny[]>({
  key: "accountsState",
  effects: [
    ({ setSelf }) => {
      const unsubscribe = api.accountsSubscribe(setSelf)
      return () => unsubscribe()
    },
  ],
})

export const accountQueryByAddress = selectorFamily({
  key: "accountQueryByAddress",
  get:
    (address: Address | null | undefined) =>
    ({ get }) => {
      const accounts = get(accountsState)

      if (!address) return null

      const encoded = encodeAnyAddress(address, 42)
      return (
        accounts.find((a) => [a.address, encodeAnyAddress(address, 42)].includes(encoded)) ?? null
      )
    },
})
