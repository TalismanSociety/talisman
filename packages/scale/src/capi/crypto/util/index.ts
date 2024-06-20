import { Deferred } from "@talismn/util"
import { simd as detectSimd } from "wasm-feature-detect"
import { Hasher } from "wat-the-crypto/types/common/hasher"

//
// The simd variants of these hash fns are faster, but some devices don't support them.
//
// This file re-exports the faster fns from `./simd` for devices which support them,
// and falls back to `./nosimd` re-exports for devices which do not.
//

/**
 * Show a useful error message when someone attempts to use one of the classes
 * from this lib without waiting for them to be initialized.
 */
class UninitializedHasher implements Hasher {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  constructor(...args: any[]) {
    throw new Error(
      `This class cannot be used before @talismn/scale has initialized it. Please await 'watCryptoWaitReady' before attempting to construct this class.`
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  update(input: Uint8Array): void {
    throw new Error(
      `This class cannot be used before @talismn/scale has initialized it. Please await 'watCryptoWaitReady' before attempting to construct this class.`
    )
  }

  digest(): Uint8Array {
    throw new Error(
      `This class cannot be used before @talismn/scale has initialized it. Please await 'watCryptoWaitReady' before attempting to construct this class.`
    )
  }
  digestInto(digest: Uint8Array): void {
    digest.set(this.digest())
  }
  dispose(): void {
    throw new Error(
      `This class cannot be used before @talismn/scale has initialized it. Please await 'watCryptoWaitReady' before attempting to construct this class.`
    )
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export let Blake2b: new (...args: any[]) => Hasher = UninitializedHasher
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export let Xxhash: new (...args: any[]) => Hasher = UninitializedHasher

let readyPromise: Promise<void> | null = null

export const watCryptoWaitReady = async () => {
  // if this is the second/third/etc time we've called watCryptoWaitReady,
  // then get a reference to the existing promise and wait for it to resolve/reject
  if (readyPromise !== null) return await readyPromise

  // if this is the first time we've called watCryptoWaitReady,
  // then create and return a new promise
  const deferred = Deferred<void>()
  readyPromise = deferred.promise

  // spawn a task to initialize the fns and resolve the readyPromise
  ;(async () => {
    try {
      // initialize simd or nosimd, based on wasm feature detection
      if (await detectSimd()) {
        // system supports wasm simd
        const imported = await import("./simd")
        Blake2b = imported.Blake2b
        Xxhash = imported.Xxhash
      } else {
        // system does not support wasm simd
        const imported = await import("./nosimd")
        Blake2b = imported.Blake2b
        Xxhash = imported.Xxhash
      }

      // feature detection and loading complete
      deferred.resolve()
    } catch (error) {
      // feature detection and loading failed
      deferred.reject(error)
    }
  })()

  // wait for the promise to resolve/reject
  return await readyPromise
}
