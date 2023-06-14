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

      const unencodedMatch = accounts.find((a) => a.address === address)
      if (unencodedMatch) return unencodedMatch

      const encoded = encodeAnyAddress(address, 42)
      return accounts.find((a) => encodeAnyAddress(a.address, 42) === encoded) ?? null
    },
})
