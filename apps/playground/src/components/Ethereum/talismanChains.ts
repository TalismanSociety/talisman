import { Chain } from "wagmi"
import {
  arbitrum,
  avalanche,
  bsc,
  bscTestnet,
  gnosis,
  goerli,
  mainnet,
  optimism,
  optimismGoerli,
  polygon,
  polygonMumbai,
} from "wagmi/chains"

const moonbeam: Chain = {
  id: 1284,
  name: "Moonbeam",
  network: "moonbeam",
  nativeCurrency: {
    decimals: 18,
    name: "Glimmer",
    symbol: "GLMR",
  },
  rpcUrls: {
    default: { http: ["https://rpc.api.moonbeam.network"] },
    public: { http: ["https://rpc.api.moonbeam.network"] },
  },
  blockExplorers: {
    etherscan: { name: "Moonscan", url: "https://moonbeam.moonscan.io" },
    default: { name: "Moonscan", url: "https://moonbeam.moonscan.io" },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
      blockCreated: 609002,
    },
  },
}

const hardhat: Chain = {
  id: 31337,
  name: "Hardhat",
  network: "hardhat",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: { http: ["http://127.0.0.1:8545"] },
    public: { http: ["http://127.0.0.1:8545"] },
  },
  blockExplorers: {
    etherscan: { name: "Moonscan", url: "https://moonbeam.moonscan.io" },
    default: { name: "Moonscan", url: "https://moonbeam.moonscan.io" },
  },
}

const moonbase: Chain = {
  id: 1287,
  name: "Moonbase Alpha",
  network: "moonbase",
  nativeCurrency: {
    decimals: 18,
    name: "DEV Glimmer",
    symbol: "DEV",
  },
  rpcUrls: {
    default: { http: ["https://rpc.api.moonbase.moonbeam.network"] },
    public: { http: ["https://rpc.api.moonbase.moonbeam.network"] },
  },
  blockExplorers: {
    etherscan: { name: "Moonscan", url: "https://moonbase.moonscan.io" },
    default: { name: "Moonscan", url: "https://moonbase.moonscan.io" },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
      blockCreated: 609002,
    },
  },
}

const moonriver: Chain = {
  id: 1285,
  name: "Moonriver",
  network: "moonriver",
  nativeCurrency: {
    decimals: 18,
    name: "MOVR",
    symbol: "MOVR",
  },
  rpcUrls: {
    default: { http: ["https://rpc.api.moonbase.moonbeam.network"] },
    public: { http: ["https://rpc.api.moonbase.moonbeam.network"] },
  },
  blockExplorers: {
    etherscan: { name: "Moonriverscan", url: "https://moonriver.moonscan.io/" },
    default: { name: "Moonriverscan", url: "https://moonriver.moonscan.io/" },
  },
}

const astar: Chain = {
  id: 592,
  name: "Astar",
  network: "astar",
  nativeCurrency: {
    decimals: 18,
    name: "ASTR",
    symbol: "ASTR",
  },
  rpcUrls: {
    default: { http: ["https://evm.astar.network"] },
    public: { http: ["https://evm.astar.network"] },
  },
  blockExplorers: {
    etherscan: { name: "Moonriverscan", url: "https://blockscout.com/astar/" },
    default: { name: "Moonriverscan", url: "https://blockscout.com/astar/" },
  },
}

const shibuya: Chain = {
  id: 81,
  name: "Shibuya",
  network: "shibuya",
  nativeCurrency: {
    name: "SBY",
    symbol: "SBY",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ["https://evm.shibuya.astar.network"] },
    public: { http: ["https://evm.shibuya.astar.network"] },
  },
  blockExplorers: {
    etherscan: { name: "Moonriverscan", url: "https://blockscout.com/shibuya/" },
    default: { name: "Moonriverscan", url: "https://blockscout.com/shibuya/" },
  },
}

const shiden: Chain = {
  id: 336,
  name: "Shiden",
  network: "shiden",
  nativeCurrency: {
    name: "SDN",
    symbol: "SDN",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ["https://evm.shiden.astar.network"] },
    public: { http: ["https://evm.shiden.astar.network"] },
  },
  blockExplorers: {
    etherscan: { name: "Moonriverscan", url: "https://blockscout.com/shiden/" },
    default: { name: "Moonriverscan", url: "https://blockscout.com/shiden/" },
  },
}

export const talismanChains: Chain[] = [
  moonbeam,
  moonbase,
  moonriver,
  hardhat,
  astar,
  shibuya,
  shiden,
  avalanche,
  bsc,
  mainnet,
  arbitrum,
  bscTestnet,
  gnosis,
  goerli,
  optimism,
  optimismGoerli,
  polygon,
  polygonMumbai,
].sort((a, b) => a.name.localeCompare(b.name))
