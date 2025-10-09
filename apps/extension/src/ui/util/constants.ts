export const IS_POPUP = typeof window !== "undefined" && window.location.pathname === "/popup.html"

export const IS_EMBEDDED_POPUP =
  IS_POPUP && new URLSearchParams(window.location.search).has("embedded")

// Token IDs that support Earn functionality
export const EARN_TOKEN_IDS = [
  "1:evm-native", // ETH on mainnet
  "8453:evm-native", // ETH on base
  "1:evm-erc20:0xdac17f958d2ee523a2206206994597c13d831ec7", // USDT on mainnet
  "8453:evm-erc20:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", // USDC on base
  "solana-mainnet:sol-native", // SOL on solana mainnet
  "polkadot:substrate-native", // DOT on polkadot
]

// Networks supported by Yield.xyz API
export const YIELD_SUPPORTED_NETWORKS = ["ethereum", "base"]
