import { SolanaSignInInput } from "@solana/wallet-standard-features"
import { SolanaChainId } from "@talismn/solana"
import { WalletAccount } from "@wallet-standard/base"

type SerializedWalletAccount = Omit<WalletAccount, "publicKey">

export type RequestSolanaSignIn = {
  input?: SolanaSignInInput
}

// serializable version of SolanaSignInOutput
export type ResponseSolanaSignIn = {
  account: SerializedWalletAccount
  signature: string // base58 encoded signature
  signedMessage: string // base58 encoded signed message
  signatureType: "ed25519" | undefined
}

export type SolSerializedWalletAccount = {
  address: string
  label?: string
  icon?: string
}

export type RequestSolanaConnect = { onlyIfTrusted?: boolean }

export type ResponseSolanaConnect = {
  account: SolSerializedWalletAccount
}

export type SolanaTabSubscriptionEvent =
  | {
      type: "accountChanged"
      account: SolSerializedWalletAccount
    }
  | {
      type: "connect"
      account: SolSerializedWalletAccount
    }
  | {
      type: "disconnect"
    }

export type RequestSolanaSignMessage = {
  address: string // Solana address to sign the message with
  message: string // base58 encoded
}
export type ResponseSolanaSignMessage = {
  signature: string // base58 encoded
}

export type RequestSolanaSignTransaction = {
  chain?: SolanaChainId
  send: boolean
  transaction: string // base58 encoded serialized VersionedTransaction or Transaction
  options?: {
    minContextSlot?: number
    preflightCommitment?: string
    skipPreflight?: boolean
    maxRetries?: number
  }
}

export type ResponseSolanaSignTransaction = {
  transaction: string // base58 encoded VersionedTransaction
}

export type SolanaTabsMessages = {
  "pub(solana.provider.subscribe)": [null, boolean, SolanaTabSubscriptionEvent]
  "pub(solana.provider.signIn)": [RequestSolanaSignIn, ResponseSolanaSignIn]
  "pub(solana.provider.connect)": [RequestSolanaConnect, ResponseSolanaConnect]
  "pub(solana.provider.disconnect)": [void, void]
  "pub(solana.provider.signMessage)": [RequestSolanaSignMessage, ResponseSolanaSignMessage]
  "pub(solana.provider.signTransaction)": [
    RequestSolanaSignTransaction,
    ResponseSolanaSignTransaction,
  ]
}
