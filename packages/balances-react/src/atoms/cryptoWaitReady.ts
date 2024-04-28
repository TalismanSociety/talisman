import { cryptoWaitReady } from "@polkadot/util-crypto"
import { atom } from "jotai"

export const cryptoWaitReadyAtom = atom(async () => await cryptoWaitReady())
