/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */

import "./common/polyfills"

import { existsSync, readFileSync, writeFileSync } from "fs"

import { BALANCE_MODULES } from "@talismn/balances"
import { ChainConnectorEvm } from "@talismn/chain-connector-evm"
import { EthNetwork } from "@talismn/chaindata-provider"
import { log } from "extension-shared"

import { getEvmNetworkPublicClient } from "./common/utils"

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
    Erc20Aggregator: "0x2e556284556ecEe5754d201bBB6E2cb47fB95DFd",
    Multicall3: "0xca11bde05977b3631167028862be2a173976ca11",
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
      { contractAddress: "0x21b8065d10f73EE2e260e5B47D3344d3Ced7596E" },
      { contractAddress: "0x517F9dD285e75b599234F7221227339478d0FcC8" },
      { contractAddress: "0x0d4a11d5EEaaC28EC3F61d100daF4d40471f1852" },
    ],
  },
}

const TEST_ADDRESS_ETH = "0x5C9EBa3b10E45BF6db77267B40B95F3f91Fc5f67"
const TEST_ADDRESS_ETH2 = "0x1367e59070Ec898867C35c0600C0ec7483c96AF9"

const run = async () => {
  const stopAll = log.timer("Balances testbench")
  const networkId = NETWORK_CONFIG.id

  const cache = {
    "evm-erc20": existsSync(`./cache/evm-erc20.json`)
      ? JSON.parse(readFileSync(`./cache/evm-erc20.json`, "utf-8"))
      : {},
    "evm-uniswapv2": existsSync(`./cache/evm-uniswapv2.json`)
      ? JSON.parse(readFileSync(`./cache/evm-uniswapv2.json`, "utf-8"))
      : {},
  }

  try {
    const connector = {
      getPublicClientForEvmNetwork: () =>
        getEvmNetworkPublicClient(NETWORK_CONFIG as unknown as EthNetwork),
    } as unknown as ChainConnectorEvm

    for (const mod of BALANCE_MODULES.filter((mod) => mod.platform === "ethereum")) {
      const source = mod.type
      log.log()
      log.log("///////////////////////////////////////////////////////////////////////////////////")
      log.log(`                         ${source}`)
      log.log("///////////////////////////////////////////////////////////////////////////////////")
      log.log()

      const tokenConfigs =
        mod.type === "evm-native"
          ? [NETWORK_CONFIG.nativeCurrency]
          : (NETWORK_CONFIG.tokens[mod.type] as any)
      log.log("Token configs", tokenConfigs)
      log.log()

      const tokens = await mod.fetchTokens({
        networkId,
        tokens: tokenConfigs,
        connector,
        // @ts-ignore
        cache: cache[mod.type] ?? {},
      })

      log.log("mod.fetchTokens results", tokens)

      const balances = await mod.fetchBalances({
        networkId,
        connector,
        tokensWithAddresses: tokens.map((token) => [token, [TEST_ADDRESS_ETH, TEST_ADDRESS_ETH2]]),
      })
      log.log("Balances", balances.success)
      if (balances.errors.length) {
        log.log("Balance errors:")
        for (const error of balances.errors) log.error(error)
      }

      const transfer = await mod.getTransferCallData({
        from: TEST_ADDRESS_ETH,
        to: TEST_ADDRESS_ETH2,
        token: tokens[0],
        value: "1000000000000000", // 0.001 ETH
      })
      log.log("Transfer call data", transfer)
    }
    stopAll()

    writeFileSync(`./cache/evm-erc20.json`, JSON.stringify(cache["evm-erc20"], null, 2))
    writeFileSync(`./cache/evm-uniswapv2.json`, JSON.stringify(cache["evm-uniswapv2"], null, 2))
  } catch (err) {
    log.error(err)
  }
}

run()
  .then(() => {
    log.log("Balances testbench completed successfully")
    process.exit(0)
  })
  .catch((error) => {
    log.error("Error starting balances testbench:", error)
    process.exit(1)
  })
