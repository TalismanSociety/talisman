import { KeypairCurve } from "@talismn/crypto"
import { Err, Ok, Result } from "ts-results"

import { Address } from "../../types/base"
import { passwordStore } from "../app/store.password"
import { keyringStore } from "./store"

export const withSecretKey = async <T>(
  address: Address,
  cb: (secretKey: Uint8Array, curve: KeypairCurve) => T | Promise<T>,
): Promise<Result<T, "Unauthorised" | "Account not found" | "Private key unavailable" | Error>> => {
  let secretKey: Uint8Array | null = null
  let curve: KeypairCurve

  try {
    try {
      const account = await keyringStore.getAccount(address)

      if (!account) return Err("Account not found")
      if (account.type !== "keypair") return Err("Private key unavailable")

      const password = await passwordStore.getPassword()
      if (!password) return Err("Unauthorised")

      secretKey = await keyringStore.getAccountSecretKey(address, password)
      curve = account.curve
    } catch (error) {
      passwordStore.clearPassword()
      throw error
    }
    return Ok(await cb(secretKey, curve))
  } catch (error) {
    return new Err(error as Error)
  } finally {
    // cleanup
    secretKey?.fill(0)
  }
}
