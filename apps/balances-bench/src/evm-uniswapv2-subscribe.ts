import { webcrypto } from "node:crypto"

import { log } from "extension-shared"

import { setupModuleEth } from "./common/setupModuleEth"
import { testSubscribeBalancesEth } from "./common/testSubscribeBalancesEth"

// Ensure globalThis.crypto is available (for Node.js)
if (typeof globalThis.crypto === "undefined") {
  globalThis.crypto = webcrypto
}

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
    "evm-uniswapv2": [
      { contractAddress: "0xb4e16d0168e52d35cacd2c6185b44281ec28c9dc" },
      { contractAddress: "0x517F9dD285e75b599234F7221227339478d0FcC8" },
      { contractAddress: "0x0d4a11d5EEaaC28EC3F61d100daF4d40471f1852" },
    ],
  },
}

setupModuleEth(NETWORK_CONFIG, "evm-uniswapv2")
  .then(async (setup) => {
    log.log()
    log.log("=".repeat(80))
    log.log("Running subscribeBalances thread blocking test (evm-uniswapv2)...")
    log.log("=".repeat(80))
    log.log()

    // Baseline (monitoring-only): tells you what "normal" event loop delay looks like
    await testSubscribeBalancesEth(NETWORK_CONFIG, setup.tokens, {
      module: "evm-uniswapv2",
      testDuration: 30000,
      monitoringInterval: 5,
      setupTimeout: 30000,
      monitoringOnly: true,
    })

    // With active subscription: compare against baseline
    await testSubscribeBalancesEth(NETWORK_CONFIG, setup.tokens, {
      module: "evm-uniswapv2",
      testDuration: 30000,
      monitoringInterval: 5,
      setupTimeout: 30000,
    })

    log.log("Thread blocking test completed successfully")
    process.exit(0)
  })
  .catch((error) => {
    log.error("Error:", error)
    process.exit(1)
  })
