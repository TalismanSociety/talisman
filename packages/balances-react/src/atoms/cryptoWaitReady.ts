import { cryptoWaitReady } from "@polkadot/util-crypto"
import { watCryptoWaitReady } from "@talismn/scale"
import { atom } from "jotai"

export const cryptoWaitReadyAtom = atom(
  async () => await Promise.all([cryptoWaitReady(), watCryptoWaitReady()])
)
