/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { webcrypto } from "crypto"

import { EvmErc20TokenConfig, NEW_BALANCE_MODULES } from "@talismn/balances"
import { ChainConnectorEvm } from "@talismn/chain-connector-evm"
import { EthNetwork, TokenType } from "@talismn/chaindata-provider"
import { log } from "extension-shared"
import { keys } from "lodash"

import { getEvmNetworkPublicClient } from "./utils"

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
  },
}

// const TEST_ADDRESS_SUB = "5CcU6DRpocLUWYJHuNLjB4gGyHJrkWuruQD5XFbRYffCfSAP"
// const TEST_ADDRESS_SUB2 = "5G24oH9LoJkBDuR4Hm7EUWiy2rPrsUSCTzY7fRcmxQNu6R1C"

const run = async () => {
  const stopAll = log.timer("Balances testbench")
  const networkId = NETWORK_CONFIG.id

  try {
    const connector = {
      getPublicClientForEvmNetwork: () =>
        getEvmNetworkPublicClient(NETWORK_CONFIG as unknown as EthNetwork),
    } as unknown as ChainConnectorEvm

    const modules = keys(NETWORK_CONFIG.tokens) as TokenType[]

    for (const mod of NEW_BALANCE_MODULES.filter((mod) => mod && modules.includes(mod.type)).filter(
      (mod) => mod.platform === "ethereum", // then we can use a ChainConnector
    )) {
      const source = mod.type
      log.log("source", source)
      log.log()

      const tokenConfigs = NETWORK_CONFIG.tokens[source as "evm-erc20"] as EvmErc20TokenConfig[]
      //  const relevantTokensOnChainIds = tokenConfigs.map((t) => t.contractAddress)
      log.log("Token configs", tokenConfigs)
      log.log()

      const tokens = await mod.fetchTokens({
        networkId,
        tokens: tokenConfigs,
        connector,
        miniMetadata: null,
        cache: {},
      })

      log.log("mod.fetchTokens results", tokens)

      // if (tokens.length > 3) log.log("+ %s other tokens", tokens.length - 3)
      // log.log()

      // const balances = await mod.fetchBalances({
      //   networkId,
      //   addressesByToken: relevantTokens.map((token) => [token, [TEST_ADDRESS_SUB]] as const),
      //   connector,
      //   miniMetadata,
      // })

      // log.log("Balances", balances)
      // log.log()

      // const xferTokenOnChainId = 69
      // log.log("Attempting to transfer token ", xferTokenOnChainId)
      // const xferTokenId = subHydrationTokenId(networkId, xferTokenOnChainId)
      // const xferToken = tokens.find((t) => t.id === xferTokenId && t.type === "substrate-hydration")
      // const xferBalance = balances.find((b) => b.tokenId === xferTokenId)
      // const xferFreeBalance = xferBalance?.values?.find((v) => v.type === "free")?.amount
      // if (!xferFreeBalance) {
      //   log.error("No balance found for the test address")
      //   return
      // }
      // if (!xferToken || xferToken.type !== "substrate-hydration") {
      //   log.error("No MYTH token found")
      //   return
      // }
      // if (mod.type !== "substrate-hydration") return

      // // try transfer half of the MYTH balance to TEST_ADDRESS2
      // const payloadBase = mod.getTransferCallData({
      //   from: TEST_ADDRESS_SUB,
      //   to: TEST_ADDRESS_SUB2,
      //   planck: xferFreeBalance.toString(),
      //   token: xferToken,
      //   metadataRpc,
      // })

      // log.log("Transfer payload", payloadBase)
      // const lookup = getLookupFn(unifyMetadata(decAnyMetadata(metadataRpc)))
      // const builder = getDynamicBuilder(lookup)
      // const def = builder.buildDefinition(lookup.call!)
      // const decodedCall = def.dec(payloadBase.method)
      // log.log("Decoded call", decodedCall)

      // const pallet = decodedCall.type
      // const method = decodedCall.value.type
      // const args = decodedCall.value.value
      // log.log({ pallet, method, args })

      // // dry run
      // const call = builder.buildRuntimeCall("DryRunApi", "dry_run_call")
      // const hex = await connector.send<string>(networkId, "state_call", [
      //   `DryRunApi_dry_run_call`,
      //   toHex(call.args.enc([Enum("system", Enum("Signed", payloadBase.address)), decodedCall])),
      // ])

      // log.log("hex", hex)

      // const dryRun = call.value.dec(hex)
      // log.log("Dry run result")
      // log.log(papiStringify(dryRun, 2))
    }
    stopAll()
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
