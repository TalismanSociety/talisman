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

export type SolanaTabsMessages = {
  "pub(solana.provider.signIn)": [RequestSolanaSignIn, ResponseSolanaSignIn]
}
