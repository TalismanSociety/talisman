// import { NetworkId, NetworkPlatform } from "@talismn/chaindata-provider"

/**
 * Maps network platform and network ID to Yield.xyz compatible network names
 */
// export const mapToYieldNetwork = (_platform: NetworkPlatform, networkId: NetworkId) => {
//   // TODO lookup from remote config
//   switch (networkId) {
//     case "1":
//       return "ethereum"
//     case "8453":
//       return "base"
//     default:
//       return null
//   }
// }

/**
 * Maps Yield.xyz network name to network ID
 *
 * @param yieldNetwork - The Yield.xyz network name (e.g., 'ethereum', 'base')
 * @returns The network ID as a string, or undefined if not supported
 */
// export function mapYieldNetworkToNetworkId(yieldNetwork?: string): NetworkId | null {
//   // TODO lookup from remote config
//   switch (yieldNetwork) {
//     case "ethereum":
//       return "1"
//     case "base":
//       return "8453"
//     case "arbitrum":
//       return "42161"
//     case "optimism":
//       return "10"
//     case "polygon":
//       return "137"
//     case "gnosis":
//       return "100"
//     case "avalanche-c":
//       return "43114"
//     case "binance":
//       return "56"
//     case "fantom":
//       return "250"
//     case "celo":
//       return "42220"
//     case "moonriver":
//       return "1285"
//     case "harmony":
//       return "1666600000"
//     case "okc":
//       return "66"
//     case "core":
//       return "1116"
//     case "sonic":
//       return "146"
//     case "katana":
//       return "1807"
//     case "polkadot":
//       return "polkadot"
//     case "kusama":
//       return "kusama"
//     case "westend":
//       return "westend"
//     case "solana":
//       return "solana-mainnet"
//     case "near":
//       return "near"
//     case "cardano":
//       return "cardano"
//     case "stellar":
//       return "stellar"
//     case "tezos":
//       return "tezos"
//     case "tron":
//       return "tron"
//     case "ton":
//       return "ton"
//     default:
//       return null
//   }
// }
