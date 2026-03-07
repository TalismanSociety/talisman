import {
  SolanaSignAndSendTransaction,
  SolanaSignIn,
  SolanaSignMessage,
  SolanaSignTransaction,
} from "@solana/wallet-standard-features"

export const SOLANA_WALLET_STANDARD_FEATURES = [
  //...READONLY_FEATURES,
  SolanaSignAndSendTransaction,
  SolanaSignTransaction,
  SolanaSignMessage,
  SolanaSignIn,
] as const

export const SOLANA_WALLET_CHAINS = [
  "solana:mainnet",
  "solana:testnet",
  "solana:devnet",
  "solana:localnet",
] as const
