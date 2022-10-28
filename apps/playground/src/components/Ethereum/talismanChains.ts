import { Chain } from "wagmi"

const blockExplorers = {
  moonbeam: {
    name: "Moonscan",
    url: "https://moonscan.io/",
  },
  moonriver: {
    name: "Moonriverscan",
    url: "https://moonriver.moonscan.io/",
  },
  moonbase: {
    name: "Moonbasescan",
    url: "https://moonbase.moonscan.io/",
  },
  astar: {
    name: "Astar EVM Explorer",
    url: "https://blockscout.com/astar/",
  },
  shibuya: {
    name: "Shibuya Subscan",
    url: "https://shibuya.subscan.io/",
  },
  shiden: {
    name: "Astar EVM Explorer",
    url: "https://blockscout.com/shiden/",
  },
}

export const talismanChains: Chain[] = [
  {
    id: 1284,
    name: "Moonbeam",
    network: "moonbeam",
    nativeCurrency: {
      name: "GLMR",
      symbol: "GLMR",
      decimals: 18,
    },
    rpcUrls: { default: "https://rpc.api.moonbeam.network" },
    blockExplorers: {
      etherscan: blockExplorers.moonbeam,
      default: blockExplorers.moonbeam,
    },
  },
  {
    id: 1285,
    name: "Moonriver",
    network: "moonriver",
    nativeCurrency: {
      name: "MOVR",
      symbol: "MOVR",
      decimals: 18,
    },
    rpcUrls: { default: "https://rpc.api.moonriver.moonbeam.network" },
    blockExplorers: {
      etherscan: blockExplorers.moonriver,
      default: blockExplorers.moonriver,
    },
  },
  {
    id: 1287,
    name: "Moonbase Alpha",
    network: "moonbase",
    nativeCurrency: {
      name: "DEV",
      symbol: "DEV",
      decimals: 18,
    },
    rpcUrls: { default: "https://rpc.api.moonbase.moonbeam.network" },
    blockExplorers: {
      etherscan: blockExplorers.moonbase,
      default: blockExplorers.moonbase,
    },
    testnet: true,
  },
  {
    id: 592,
    name: "Astar",
    network: "astar",
    nativeCurrency: {
      name: "ASTR",
      symbol: "ASTR",
      decimals: 18,
    },
    rpcUrls: { default: "https://evm.astar.network" },
    blockExplorers: {
      etherscan: blockExplorers.astar,
      default: blockExplorers.astar,
    },
  },
  {
    id: 81,
    name: "Shibuya",
    network: "shibuya",
    nativeCurrency: {
      name: "SBY",
      symbol: "SBY",
      decimals: 18,
    },
    rpcUrls: { default: "https://evm.shibuya.astar.network" },
    blockExplorers: {
      etherscan: blockExplorers.shibuya,
      default: blockExplorers.shibuya,
    },
    testnet: true,
  },
  {
    id: 336,
    name: "Shiden",
    network: "shiden",
    nativeCurrency: {
      name: "SDN",
      symbol: "SDN",
      decimals: 18,
    },
    rpcUrls: { default: "https://evm.shiden.astar.network" },
    blockExplorers: {
      etherscan: blockExplorers.shiden,
      default: blockExplorers.shiden,
    },
  },
  {
    id: 97,
    name: "BSC Testnet",
    network: "chapel",
    nativeCurrency: {
      name: "tBNB",
      symbol: "tBNB",
      decimals: 18,
    },
    rpcUrls: { default: "https://data-seed-prebsc-1-s1.binance.org:8545" },
  },
]
