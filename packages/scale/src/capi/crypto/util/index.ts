import { Hasher } from "wat-the-crypto/types/common/hasher"

import * as nosimd from "./nosimd"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Blake2b: new (...args: any[]) => Hasher = nosimd.Blake2b
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Xxhash: new (...args: any[]) => Hasher = nosimd.Xxhash

export const watCryptoWaitReady = async () => {
  return
}
