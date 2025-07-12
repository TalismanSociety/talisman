/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */

import "./common/polyfills"

import { log } from "extension-shared"

import { testNetworkEth } from "./common/testNetworkEth"

const NETWORK_CONFIG = {
  id: "1",
  rpcs: [
    "https://mempool.merkle.io/rpc/eth/pk_mbs_1412a7392bd47753ca2b4bb3d123f6a1",
    "https://ethereum-rpc.publicnode.com",
    "https://eth.merkle.io",
    "https://ethereum.rpc.subquery.network/public",
    "https://eth.llamarpc.com",
    "https://rpc.ankr.com/eth",
    "https://cloudflare-eth.com",
    "https://mainnet.gateway.tenderly.co",
    "https://rpc.mevblocker.io",
    "https://rpc.mevblocker.io/fast",
    "https://rpc.mevblocker.io/noreverts",
    "https://rpc.mevblocker.io/fullprivacy",
    "https://eth.drpc.org",
    "https://api.securerpc.com/v1",
    "https://api.mycryptoapi.com/eth",
  ],
  nativeCurrency: {
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18,
  },
  feeType: "eip-1559",
  contracts: {
    Erc20Aggregator: "0x2e556284556ecEe5754d201bBB6E2cb47fB95DFd" as `0x${string}`,
    Multicall3: "0xca11bde05977b3631167028862be2a173976ca11" as `0x${string}`,
  },
  tokens: {
    "evm-erc20": [
      {
        contractAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        symbol: "USDC",
        coingeckoId: "usd-coin",
      },
      {
        contractAddress: "0xdac17f958d2ee523a2206206994597c13d831ec7",
        symbol: "USDT",
        coingeckoId: "tether",
      },
    ],
    "evm-uniswapv2": [
      { contractAddress: "0xb4e16d0168e52d35cacd2c6185b44281ec28c9dc" },
      { contractAddress: "0x517F9dD285e75b599234F7221227339478d0FcC8" },
      { contractAddress: "0x0d4a11d5EEaaC28EC3F61d100daF4d40471f1852" },
    ],
  },
}

testNetworkEth(NETWORK_CONFIG, { modules: ["evm-uniswapv2"], transfer: false })
  .then(() => {
    log.log("Balances testbench completed successfully")
    process.exit(0)
  })
  .catch((error) => {
    log.error("Error starting balances testbench:", error)
    process.exit(1)
  })
