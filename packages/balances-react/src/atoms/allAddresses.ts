import { atom } from "jotai"

/** Sets the list of addresses for which token balances will be fetched by the balances subscription */
export const allAddressesAtom = atom<string[]>([])
