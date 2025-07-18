/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { existsSync, readFileSync, writeFileSync } from "fs"

import { BALANCE_MODULES } from "@talismn/balances"
import { ChainConnectorEthStub } from "@talismn/chain-connectors"
import { EthNetwork, TokenType } from "@talismn/chaindata-provider"
import { log } from "extension-shared"

export type EthNetworkConfig = Pick<EthNetwork, "id" | "rpcs" | "contracts"> & {
  nativeCurrency?: Partial<EthNetwork["nativeCurrency"]>
  tokens: Partial<Record<TokenType, unknown[]>>
}

const TEST_ADDRESS_ETH = "0x5C9EBa3b10E45BF6db77267B40B95F3f91Fc5f67"
const TEST_ADDRESS_ETH2 = "0x1367e59070Ec898867C35c0600C0ec7483c96AF9"

type TestOptions = {
  modules?: TokenType[]
  addresses?: string[]
  fetchBalances?: boolean
  transfer?: boolean
}

const DEFAULT_OPTIONS: TestOptions = {
  modules: BALANCE_MODULES.filter((mod) => mod.platform === "ethereum").map(
    (mod) => mod.type as TokenType,
  ),
  fetchBalances: true,
  transfer: true,
}

export const testNetworkEth = async (network: EthNetworkConfig, options?: TestOptions) => {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  const stopAll = log.timer("Balances testbench")
  const networkId = network.id

  const cache = {
    "evm-erc20": existsSync(`./cache/evm-erc20.json`)
      ? JSON.parse(readFileSync(`./cache/evm-erc20.json`, "utf-8"))
      : {},
    "evm-uniswapv2": existsSync(`./cache/evm-uniswapv2.json`)
      ? JSON.parse(readFileSync(`./cache/evm-uniswapv2.json`, "utf-8"))
      : {},
  }

  try {
    const connector = new ChainConnectorEthStub(network as unknown as EthNetwork)

    for (const mod of BALANCE_MODULES.filter((mod) => mod.platform === "ethereum").filter((mod) =>
      opts.modules?.includes(mod.type as TokenType),
    )) {
      const source = mod.type
      log.log()
      log.log("///////////////////////////////////////////////////////////////////////////////////")
      log.log(`                         ${source}`)
      log.log("///////////////////////////////////////////////////////////////////////////////////")
      log.log()

      const tokenConfigs =
        mod.type === "evm-native" ? [network.nativeCurrency] : (network.tokens[mod.type] as any)
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
      if (!opts.fetchBalances) continue

      const balances = await mod.fetchBalances({
        networkId,
        connector,
        tokensWithAddresses: tokens.map((token) => [token, [TEST_ADDRESS_ETH, TEST_ADDRESS_ETH2]]),
      })
      log.log("Balances", JSON.stringify(balances.success, null, 2))
      if (balances.errors.length) {
        log.log("Balance errors:")
        for (const error of balances.errors) log.error(error)
      }

      if (!opts.transfer) continue

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
