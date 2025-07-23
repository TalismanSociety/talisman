import { SolanaSignInInput } from "@solana/wallet-standard-features"
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

export type SolanaTabsMessages = {
  "pub(solana.provider.subscribe)": [null, boolean, SolanaTabSubscriptionEvent]
  "pub(solana.provider.signIn)": [RequestSolanaSignIn, ResponseSolanaSignIn]
  "pub(solana.provider.connect)": [void, ResponseSolanaConnect]
  "pub(solana.provider.disconnect)": [void, void]
  "pub(solana.provider.signMessage)": [RequestSolanaSignMessage, ResponseSolanaSignMessage]
}
