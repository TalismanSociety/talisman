import Keyring from "@polkadot/keyring"
import { KeyringPair } from "@polkadot/keyring/types"
import { getPublicKeyFromSecret } from "@talismn/crypto"
import { Err, Ok, Result } from "ts-results"

import { Address } from "../../types/base"
import { passwordStore } from "../app/store.password"
import { curveToPjsKeypairType } from "./migration-utils"
import { keyringStore } from "./store"

export const withPjsKeyringPair = async <T>(
  address: Address,
  cb: (pair: KeyringPair) => T | Promise<T>,
): Promise<Result<T, "Unauthorised" | "Account not found" | "Private key unavailable" | Error>> => {
  // use a PJS in-memory keyring to create the pair
  const keyring = new Keyring({ type: "sr25519" })
  let pair: KeyringPair | null = null

  try {
    try {
      const account = await keyringStore.getAccount(address)

      if (!account) return Err("Account not found")
      if (account.type !== "keypair") return Err("Private key unavailable")

      const password = await passwordStore.getPassword()
      if (!password) return Err("Unauthorised")

      const secretKey = await keyringStore.getAccountSecretKey(address, password)
      const publicKey = getPublicKeyFromSecret(secretKey, account.curve)
      const type = curveToPjsKeypairType(account.curve)

      pair = keyring.addFromPair({ secretKey, publicKey }, { name: account.name }, type)
    } catch (error) {
      passwordStore.clearPassword()
      throw error
    }
    return Ok(await cb(pair))
  } catch (error) {
    return new Err(error as Error)
  } finally {
    // cleanup
    if (!!pair && !pair.isLocked) pair.lock()
    keyring.removePair(address)
  }
}
