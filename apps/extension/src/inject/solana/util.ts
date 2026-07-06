import type { SolSerializedWalletAccount } from "@core/domains/solana/exports"
import bs58 from "bs58"

import { TalismanSolWalletAccount } from "./account"

export const deserializeSolWalletAccount = (
  account: SolSerializedWalletAccount
): TalismanSolWalletAccount => {
  return new TalismanSolWalletAccount({
    address: account.address,
    publicKey: bs58.decode(account.address),
    label: account.label,
    icon: account.icon as TalismanSolWalletAccount["icon"],
  })
}
