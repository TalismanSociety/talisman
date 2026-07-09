import type { BitcoinKeyPath } from "@talismn/keyring"
import { Err, Ok, type Result } from "ts-results"

import type { Address } from "../../types/base"
import { passwordStore } from "../app/store.password"
import { keyringStore } from "./store"

/**
 * Derives child private keys for an HD bitcoin account at sign time.
 * Key material is zeroed by the keyring before this resolves.
 */
export const withBitcoinSigningKeys = async <T>(
  address: Address,
  paths: BitcoinKeyPath[],
  cb: (
    keys: Array<{ path: BitcoinKeyPath; secretKey: Uint8Array; publicKey: Uint8Array }>
  ) => T | Promise<T>
): Promise<Result<T, "Unauthorised" | Error>> => {
  try {
    const password = await passwordStore.getPassword()
    if (!password) return Err("Unauthorised")

    return Ok(await keyringStore.withBitcoinAccountKeys(address, paths, password, cb))
  } catch (error) {
    return new Err(error as Error)
  }
}
