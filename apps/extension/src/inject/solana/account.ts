// This is copied with modification from @wallet-standard/wallet

import type { WalletAccount } from "@wallet-standard/base"
import {
  SolanaSignAndSendTransaction,
  SolanaSignMessage,
  SolanaSignTransaction,
} from "@solana/wallet-standard-features"

import { SOLANA_CHAINS } from "./solana"

const chains = SOLANA_CHAINS
const features = [SolanaSignAndSendTransaction, SolanaSignTransaction, SolanaSignMessage] as const

export class TalismanSolWalletAccount implements WalletAccount {
  readonly #address: WalletAccount["address"]
  readonly #publicKey: WalletAccount["publicKey"]
  readonly #chains: WalletAccount["chains"]
  readonly #features: WalletAccount["features"]
  readonly #label: WalletAccount["label"]
  readonly #icon: WalletAccount["icon"]

  get address() {
    return this.#address
  }

  get publicKey() {
    return this.#publicKey.slice()
  }

  get chains() {
    return this.#chains.slice()
  }

  get features() {
    return this.#features.slice()
  }

  get label() {
    return this.#label
  }

  get icon() {
    return this.#icon
  }

  // TODO features should be pull from backend: ledger accounts cant sign messages
  // though:
  // - we may not provide a hint that an account is a ledger account
  // - test dapp from wallet-adapter ignores that field
  constructor({ address, publicKey, label, icon }: Omit<WalletAccount, "chains" | "features">) {
    if (new.target === TalismanSolWalletAccount) {
      Object.freeze(this)
    }

    this.#address = address
    this.#publicKey = publicKey
    this.#chains = chains
    this.#features = features
    this.#label = label
    this.#icon = icon
  }
}
