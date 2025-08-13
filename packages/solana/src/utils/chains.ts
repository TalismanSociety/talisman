export const SOLANA_CHAINS = [
  "solana:mainnet",
  "solana:devnet",
  "solana:testnet",
  "solana:localnet",
] as const

export type SolanaChainId = (typeof SOLANA_CHAINS)[number]

export const getSolNetworkId = (chain: SolanaChainId) => {
  switch (chain) {
    case "solana:mainnet":
      return "solana-mainnet"
    case "solana:devnet":
      return "solana-devnet"
    case "solana:testnet":
      return "solana-testnet"
    case "solana:localnet":
      return "solana-localnet"
    default:
      throw new Error(`Unknown Solana chain: ${chain}`)
  }
}
