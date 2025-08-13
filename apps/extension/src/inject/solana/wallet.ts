import type {
  SolanaSignAndSendTransactionFeature,
  SolanaSignAndSendTransactionMethod,
  SolanaSignAndSendTransactionOutput,
  SolanaSignInFeature,
  SolanaSignInMethod,
  SolanaSignInOutput,
  SolanaSignMessageFeature,
  SolanaSignMessageMethod,
  SolanaSignMessageOutput,
  SolanaSignTransactionFeature,
  SolanaSignTransactionMethod,
  SolanaSignTransactionOutput,
} from "@solana/wallet-standard-features"
import type { Transaction } from "@solana/web3.js"
import type { Wallet } from "@wallet-standard/base"
import type {
  StandardConnectFeature,
  StandardConnectMethod,
  StandardDisconnectFeature,
  StandardDisconnectMethod,
  StandardEventsFeature,
  StandardEventsListeners,
  StandardEventsNames,
  StandardEventsOnMethod,
} from "@wallet-standard/features"
// import { base58 } from "@scure/base" // smaller import than @talismn/crypto
import {
  SolanaSignAndSendTransaction,
  SolanaSignIn,
  SolanaSignMessage,
  SolanaSignTransaction,
} from "@solana/wallet-standard-features"
import { VersionedTransaction } from "@solana/web3.js"
import { StandardConnect, StandardDisconnect, StandardEvents } from "@wallet-standard/features"
import bs58 from "bs58"
import { TALISMAN_LOGO_BASE64 } from "inject/shared/logo"

import type { SolanaChain } from "./solana"
import type { TalismanSol } from "./window"
import { TalismanSolWalletAccount } from "./account"
import { isSolanaChain, isVersionedTransaction, SOLANA_CHAINS } from "./solana"
import { deserializeSolWalletAccount } from "./util"

export class TalismanSolWallet implements Wallet {
  readonly #listeners: { [E in StandardEventsNames]?: StandardEventsListeners[E][] } = {}
  readonly #version = "1.0.0" as const
  readonly #name = "Talisman" as const
  readonly #icon = TALISMAN_LOGO_BASE64
  #account: TalismanSolWalletAccount | null = null
  readonly #talisman: TalismanSol

  get version() {
    return this.#version
  }

  get name() {
    return this.#name
  }

  get icon() {
    return this.#icon
  }

  get chains() {
    return SOLANA_CHAINS.slice() // TODO should be provided by backend based on chaindata
  }

  get features(): StandardConnectFeature &
    StandardDisconnectFeature &
    StandardEventsFeature &
    SolanaSignAndSendTransactionFeature &
    SolanaSignTransactionFeature &
    SolanaSignMessageFeature &
    SolanaSignInFeature {
    // & TalismanSolFeature
    return {
      [StandardConnect]: {
        version: "1.0.0",
        connect: this.#connect,
      },
      [StandardDisconnect]: {
        version: "1.0.0",
        disconnect: this.#disconnect,
      },
      [StandardEvents]: {
        version: "1.0.0",
        on: this.#on,
      },
      [SolanaSignAndSendTransaction]: {
        version: "1.0.0",
        supportedTransactionVersions: ["legacy", 0],
        signAndSendTransaction: this.#signAndSendTransaction,
      },
      [SolanaSignTransaction]: {
        version: "1.0.0",
        supportedTransactionVersions: ["legacy", 0],
        signTransaction: this.#signTransaction,
      },
      [SolanaSignMessage]: {
        version: "1.0.0",
        signMessage: this.#signMessage,
      },
      [SolanaSignIn]: {
        version: "1.0.0",
        signIn: this.#signIn,
      },
    }
  }

  get accounts() {
    return this.#account ? [this.#account] : []
  }

  constructor(talisman: TalismanSol) {
    if (new.target === TalismanSolWallet) {
      Object.freeze(this)
    }

    this.#talisman = talisman

    talisman.on("connect", this.#connected, this)
    talisman.on("accountChanged", this.#connected, this)
    talisman.on("disconnect", this.#disconnected, this)

    this.#connected()
  }

  #on: StandardEventsOnMethod = (event, listener) => {
    this.#listeners[event]?.push(listener) || (this.#listeners[event] = [listener])
    return (): void => this.#off(event, listener)
  }

  #emit<E extends StandardEventsNames>(
    event: E,
    ...args: Parameters<StandardEventsListeners[E]>
  ): void {
    // eslint-disable-next-line prefer-spread
    this.#listeners[event]?.forEach((listener) => listener.apply(null, args))
  }

  #off<E extends StandardEventsNames>(event: E, listener: StandardEventsListeners[E]): void {
    this.#listeners[event] = this.#listeners[event]?.filter(
      (existingListener) => listener !== existingListener,
    )
  }

  #connected = () => {
    const account = this.#talisman.account
    if (account) {
      if (!this.#account || this.#account.address !== account.address) {
        this.#account = deserializeSolWalletAccount(account)
        this.#emit("change", { accounts: this.accounts })
      }
    }
  }

  #disconnected = () => {
    if (this.#account) {
      this.#account = null
      this.#emit("change", { accounts: this.accounts })
    }
  }

  #connect: StandardConnectMethod = async ({ silent } = {}) => {
    if (!this.#account) {
      await this.#talisman.connect(silent ? { onlyIfTrusted: true } : undefined)
    }

    this.#connected()

    return { accounts: this.accounts }
  }

  #disconnect: StandardDisconnectMethod = async () => {
    await this.#talisman.disconnect()
  }

  #signAndSendTransaction: SolanaSignAndSendTransactionMethod = async (...inputs) => {
    if (!this.#account) throw new Error("not connected")

    const outputs: SolanaSignAndSendTransactionOutput[] = []

    if (inputs.length === 1) {
      const { transaction, account, chain, options } = inputs[0]!
      const { minContextSlot, preflightCommitment, skipPreflight, maxRetries } = options || {}
      if (account.address !== this.#account.address) throw new Error("invalid account")
      if (chain && !isSolanaChain(chain)) throw new Error("invalid chain")

      const { signature } = await this.#talisman.signAndSendTransaction(
        VersionedTransaction.deserialize(transaction),
        {
          preflightCommitment,
          minContextSlot,
          maxRetries,
          skipPreflight,
        },
      )

      outputs.push({ signature: bs58.decode(signature) })
    } else if (inputs.length > 1) {
      for (const input of inputs) {
        outputs.push(...(await this.#signAndSendTransaction(input)))
      }
    }

    return outputs
  }

  #signTransaction: SolanaSignTransactionMethod = async (...inputs) => {
    if (!this.#account) throw new Error("not connected")

    const outputs: SolanaSignTransactionOutput[] = []

    if (inputs.length === 1) {
      const { transaction, account, chain } = inputs[0]!
      if (account !== this.#account) throw new Error("invalid account")
      if (chain && !isSolanaChain(chain)) throw new Error("invalid chain")

      const signedTransaction = await this.#talisman.signTransaction(
        VersionedTransaction.deserialize(transaction),
      )

      const serializedTransaction = isVersionedTransaction(signedTransaction)
        ? signedTransaction.serialize()
        : new Uint8Array(
            (signedTransaction as Transaction).serialize({
              requireAllSignatures: false,
              verifySignatures: false,
            }),
          )

      outputs.push({ signedTransaction: serializedTransaction })
    } else if (inputs.length > 1) {
      let chain: SolanaChain | undefined = undefined
      for (const input of inputs) {
        if (input.account !== this.#account) throw new Error("invalid account")
        if (input.chain) {
          if (!isSolanaChain(input.chain)) throw new Error("invalid chain")
          if (chain) {
            if (input.chain !== chain) throw new Error("conflicting chain")
          } else {
            chain = input.chain
          }
        }
      }

      const transactions = inputs.map(({ transaction }) =>
        VersionedTransaction.deserialize(transaction),
      )

      const signedTransactions = await this.#talisman.signAllTransactions(transactions)

      outputs.push(
        ...signedTransactions.map((signedTransaction) => {
          const serializedTransaction = isVersionedTransaction(signedTransaction)
            ? signedTransaction.serialize()
            : new Uint8Array(
                (signedTransaction as Transaction).serialize({
                  requireAllSignatures: false,
                  verifySignatures: false,
                }),
              )

          return { signedTransaction: serializedTransaction }
        }),
      )
    }

    return outputs
  }

  #signMessage: SolanaSignMessageMethod = async (...inputs) => {
    if (!this.#account) throw new Error("not connected")

    const outputs: SolanaSignMessageOutput[] = []

    if (inputs.length === 1) {
      const { message, account } = inputs[0]!
      if (account.address !== this.#account.address) throw new Error("invalid account")

      const { signature } = await this.#talisman.signMessage(message)

      outputs.push({ signedMessage: message, signature })
    } else if (inputs.length > 1) {
      for (const input of inputs) {
        outputs.push(...(await this.#signMessage(input)))
      }
    }

    return outputs
  }

  #signIn: SolanaSignInMethod = async (...inputs) => {
    const outputs: SolanaSignInOutput[] = []

    if (inputs.length > 1) {
      for (const input of inputs) outputs.push(await this.#talisman.signIn(input))
    } else {
      return [await this.#talisman.signIn(inputs[0])]
    }

    return outputs
  }
}
