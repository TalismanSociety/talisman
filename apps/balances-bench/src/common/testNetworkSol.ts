/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { existsSync, readFileSync, writeFileSync } from "fs"

import { BALANCE_MODULES } from "@talismn/balances"
import { ChainConnectorSolStub } from "@talismn/chain-connectors"
import { TokenType } from "@talismn/chaindata-provider"
import { SolNetwork } from "@talismn/chaindata-provider/src/chaindata/networks/SolNetwork"
import { log } from "extension-shared"

export type SolNetworkConfig = Pick<SolNetwork, "id" | "rpcs"> & {
  nativeCurrency?: Partial<SolNetwork["nativeCurrency"]>
  tokens: Partial<Record<TokenType, unknown[]>>
}

const TEST_ADDRESS_1 = "5xJvx7YrqCqgyzxx4PQXt1AVbxioUsGABf2zevmYC8UL"
const TEST_ADDRESS_2 = "J4Zbo8YswSM6aqSFQkbTito3eiTMCwDn9ei3FaMUinB3"

type TestOptions = {
  modules?: TokenType[]
  addresses?: string[]
  fetchBalances?: boolean
  transfer?: boolean
}

const DEFAULT_OPTIONS: TestOptions = {
  modules: BALANCE_MODULES.filter((mod) => mod.platform === "solana").map(
    (mod) => mod.type as TokenType,
  ),
  fetchBalances: true,
  transfer: true,
}

export const testNetworkSol = async (network: SolNetworkConfig, options?: TestOptions) => {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  const stopAll = log.timer("Balances testbench")
  const networkId = network.id

  const cache = {
    "sol-spl": existsSync(`./cache/sol-spl.json`)
      ? JSON.parse(readFileSync(`./cache/sol-spl.json`, "utf-8"))
      : {},
  }

  try {
    const connector = new ChainConnectorSolStub(network)

    for (const mod of BALANCE_MODULES.filter((mod) => mod.platform === "solana").filter((mod) =>
      opts.modules?.includes(mod.type as TokenType),
    )) {
      const source = mod.type
      log.log()
      log.log("///////////////////////////////////////////////////////////////////////////////////")
      log.log(`                         ${source}`)
      log.log("///////////////////////////////////////////////////////////////////////////////////")
      log.log()

      const tokenConfigs =
        mod.type === "sol-native" ? [network.nativeCurrency] : (network.tokens[mod.type] as any)
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
      writeFileSync(`./cache/sol-spl.json`, JSON.stringify(cache["sol-spl"], null, 2))

      if (!opts.fetchBalances) continue

      const balances = await mod.fetchBalances({
        networkId,
        connector,
        tokensWithAddresses: tokens.map((token) => [token, [TEST_ADDRESS_1, TEST_ADDRESS_2]]),
      })
      log.log("Balances", JSON.stringify(balances.success, null, 2))
      if (balances.errors.length) {
        log.log("Balance errors:")
        for (const error of balances.errors) log.error(error)
      }

      if (!opts.transfer) continue

      const transfer = await mod.getTransferCallData({
        from: TEST_ADDRESS_1,
        to: TEST_ADDRESS_2,
        token: tokens[0],
        value: "1000000000000000", // 0.001 ETH
        connector,
      })
      log.log("Transfer call data", transfer)
    }
    stopAll()
  } catch (err) {
    log.error(err)
  }
}
