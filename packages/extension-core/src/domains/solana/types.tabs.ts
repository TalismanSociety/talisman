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

export type ResponseSolanaConnect = {
  address: string
}

export type SolanaTabSubscriptionEvent =
  | {
      type: "accountChanged"
      address: string
    }
  | {
      type: "connect"
      address: string
    }
  | {
      type: "disconnect"
    }

export type SolanaTabsMessages = {
  "pub(solana.provider.subscribe)": [null, boolean, SolanaTabSubscriptionEvent]
  "pub(solana.provider.signIn)": [RequestSolanaSignIn, ResponseSolanaSignIn]
  "pub(solana.provider.connect)": [void, ResponseSolanaConnect]
  "pub(solana.provider.disconnect)": [void, void]
}
