import type { SolSerializedWalletAccount } from "extension-core/src/domains/solana/types.tabs"
import { Transaction, VersionedTransaction } from "@solana/web3.js"
import bs58 from "bs58"

import { TalismanSolWalletAccount } from "./account"
import { isVersionedTransaction } from "./solana"

export function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  return arraysEqual(a, b)
}

interface Indexed<T> {
  length: number
  [index: number]: T
}

export function arraysEqual<T>(a: Indexed<T>, b: Indexed<T>): boolean {
  if (a === b) return true

  const length = a.length
  if (length !== b.length) return false

  for (let i = 0; i < length; i++) if (a[i] !== b[i]) return false

  return true
}

export const deserializeSolWalletAccount = (
  account: SolSerializedWalletAccount,
): TalismanSolWalletAccount => {
  return new TalismanSolWalletAccount({
    address: account.address,
    publicKey: bs58.decode(account.address),
    label: account.label,
    icon: account.icon as TalismanSolWalletAccount["icon"],
  })
}

export const serializeTransaction = (transaction: Transaction | VersionedTransaction): string => {
  if (isVersionedTransaction(transaction)) {
    return bs58.encode(transaction.serialize())
  } else {
    return bs58.encode(
      transaction.serialize({ requireAllSignatures: false, verifySignatures: false }),
    )
  }
}

export const deserializeTransaction = (transaction: string): Transaction | VersionedTransaction => {
  const bytes = bs58.decode(transaction)
  try {
    return VersionedTransaction.deserialize(bytes)
  } catch {
    return Transaction.from(bytes)
  }
}
