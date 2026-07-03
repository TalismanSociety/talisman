// biome-ignore-all lint/suspicious/noExplicitAny: legacy
import type { SolanaSignInInput, SolanaSignInOutput } from "@solana/wallet-standard-features"

export interface TalismanSolEvent {
  connect(...args: unknown[]): unknown
  disconnect(...args: unknown[]): unknown
  accountChanged(...args: unknown[]): unknown
}

export interface TalismanSolEventEmitter {
  on<E extends keyof TalismanSolEvent>(event: E, listener: TalismanSolEvent[E], context?: any): void
  off<E extends keyof TalismanSolEvent>(
    event: E,
    listener: TalismanSolEvent[E],
    context?: any
  ): void
}

type SerializedWalletAccount = {
  address: string
  label?: string
  icon?: string
}

export type SolanaSendOptions = {
  minContextSlot?: number
  preflightCommitment?: string
  skipPreflight?: boolean
  maxRetries?: number
}

/**
 * Internal page-side provider interface. Both ends are Talisman's (it is only consumed by
 * the wallet-standard wrapper, never exposed on `window`), so transactions travel as raw
 * wire bytes — the page bundle never parses them.
 */
export interface TalismanSol extends TalismanSolEventEmitter {
  account: SerializedWalletAccount | null
  connect(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: Uint8Array }>
  disconnect(): Promise<void>
  signAndSendTransaction(
    transaction: Uint8Array,
    options?: SolanaSendOptions
  ): Promise<{ signature: string }>
  signTransaction(transaction: Uint8Array): Promise<Uint8Array>
  signAllTransactions(transactions: readonly Uint8Array[]): Promise<Uint8Array[]>
  signMessage(message: Uint8Array): Promise<{ signature: Uint8Array; signedMessage?: Uint8Array }>
  signIn(input?: SolanaSignInInput): Promise<SolanaSignInOutput>
}
