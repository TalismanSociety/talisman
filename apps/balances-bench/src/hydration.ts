/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { webcrypto } from "crypto"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs"
import { dirname } from "path"

import { WsProvider } from "@polkadot/rpc-provider"
import { NEW_BALANCE_MODULES } from "@talismn/balances"
import { ChainConnector } from "@talismn/chain-connector"
import { SubHydrationToken, subHydrationTokenId, TokenType } from "@talismn/chaindata-provider"
import { fetchBestMetadata } from "@talismn/sapi"
import {
  decAnyMetadata,
  getDynamicBuilder,
  getLookupFn,
  papiStringify,
  toHex,
  unifyMetadata,
} from "@talismn/scale"
import { log } from "extension-shared"
import { keys } from "lodash"
import { Enum } from "polkadot-api"

// Ensure globalThis.crypto is available (for Node.js)
if (typeof globalThis.crypto === "undefined") {
  globalThis.crypto = webcrypto
}

const NETWORK_CONFIG = {
  id: "hydration",
  rpcs: ["wss://hydration.dotters.network"],
  tokens: {
    "substrate-hydration": [
      {
        onChainId: 30, // MYTH
        name: "Mythos native token",
      },
      {
        onChainId: 1000795, // SKY
        coingeckoId: "sky",
      },
      {
        onChainId: 69, // GIGADOT
      },
    ],
  },
}

const TEST_ADDRESS_SUB = "5CcU6DRpocLUWYJHuNLjB4gGyHJrkWuruQD5XFbRYffCfSAP"
const TEST_ADDRESS_SUB2 = "5G24oH9LoJkBDuR4Hm7EUWiy2rPrsUSCTzY7fRcmxQNu6R1C"

const run = async () => {
  const rpcUrl = NETWORK_CONFIG.rpcs[0]

  const stopAll = log.timer("Balances testbench")
  const stop1 = log.timer(`Connected to ${rpcUrl}`)
  const provider = new WsProvider(rpcUrl)

  try {
    await provider.isReady
    stop1()

    const connector = {
      send: (_chainId: string, method: string, params: string[], isCacheable: boolean) => {
        return provider.send(method, params, isCacheable)
      },
    } as ChainConnector

    const stop2 = log.timer("Fetched runtime version")
    const { specName, specVersion } = await provider.send("state_getRuntimeVersion", [])
    stop2()
    log.log("RuntimeVersion", { specName, specVersion })

    const networkId = specName

    const metadataFilePath = `./cache/metadata/${specName}-${specVersion}.scale`
    if (!existsSync(metadataFilePath)) {
      const dir = dirname(metadataFilePath)
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

      const stop = log.timer("Fetched metadata")
      const metadataRpc = await fetchBestMetadata((...args) => provider.send(...args), false)
      stop()
      writeFileSync(metadataFilePath, metadataRpc)
    }

    const metadataRpc = readFileSync(metadataFilePath, "ascii") as `0x${string}`
    const anyMetadata = decAnyMetadata(metadataRpc)
    const metadata = unifyMetadata(anyMetadata)
    log.log("Metadata version", metadata.version)

    const modules = keys(NETWORK_CONFIG.tokens) as TokenType[]

    for (const mod of NEW_BALANCE_MODULES.filter((mod) => mod && modules.includes(mod.type)).filter(
      (mod) => mod.platform === "polkadot", // then we can use a ChainConnector
    )) {
      const source = mod.type
      log.log("source", source)
      log.log()

      const miniMetadata = mod.getMiniMetadata({
        networkId,
        specVersion,
        metadataRpc,
      })
      log.log("mod.getMiniMetadata() result", miniMetadata)
      log.log()

      const tokenConfigs = NETWORK_CONFIG.tokens[source as "substrate-hydration"]
      const relevantTokensOnChainIds = tokenConfigs.map((t) => t.onChainId)
      log.log("Token configs", tokenConfigs)
      log.log()

      const tokens = await mod.fetchTokens({
        networkId,
        tokens: tokenConfigs,
        connector,
        miniMetadata,
        cache: {},
      })
      const relevantTokens = tokens.filter((token) =>
        relevantTokensOnChainIds.includes((token as SubHydrationToken).onChainId),
      )

      log.log("mod.fetchTokens results", relevantTokens.slice(0, 3))

      if (tokens.length > 3) log.log("+ %s other tokens", tokens.length - 3)
      log.log()

      const balances = await mod.fetchBalances({
        networkId,
        addressesByToken: relevantTokens.map((token) => [token, [TEST_ADDRESS_SUB]] as const),
        connector,
        miniMetadata,
      })

      log.log("Balances", balances)
      log.log()

      const xferTokenOnChainId = 69
      log.log("Attempting to transfer token ", xferTokenOnChainId)
      const xferTokenId = subHydrationTokenId(networkId, xferTokenOnChainId)
      const xferToken = tokens.find((t) => t.id === xferTokenId && t.type === "substrate-hydration")
      const xferBalance = balances.success.find((b) => b.tokenId === xferTokenId)
      const xferFreeBalance = xferBalance?.values?.find((v) => v.type === "free")?.amount
      if (!xferFreeBalance) {
        log.error("No balance found for the test address")
        return
      }
      if (!xferToken || xferToken.type !== "substrate-hydration") {
        log.error("No MYTH token found")
        return
      }
      if (mod.type !== "substrate-hydration") return

      // try transfer half of the MYTH balance to TEST_ADDRESS2
      const payloadBase = mod.getTransferCallData({
        from: TEST_ADDRESS_SUB,
        to: TEST_ADDRESS_SUB2,
        value: xferFreeBalance.toString(),
        token: xferToken,
        metadataRpc,
      })

      log.log("Transfer payload", payloadBase)
      const lookup = getLookupFn(unifyMetadata(decAnyMetadata(metadataRpc)))
      const builder = getDynamicBuilder(lookup)
      const def = builder.buildDefinition(lookup.call!)
      const decodedCall = def.dec(payloadBase.method)
      log.log("Decoded call", decodedCall)

      const pallet = decodedCall.type
      const method = decodedCall.value.type
      const args = decodedCall.value.value
      log.log({ pallet, method, args })

      // dry run
      const call = builder.buildRuntimeCall("DryRunApi", "dry_run_call")
      const hex = await connector.send<string>(networkId, "state_call", [
        `DryRunApi_dry_run_call`,
        toHex(call.args.enc([Enum("system", Enum("Signed", payloadBase.address)), decodedCall])),
      ])

      log.log("hex", hex)

      const dryRun = call.value.dec(hex)
      log.log("Dry run result")
      log.log(papiStringify(dryRun, 2))
    }
    stopAll()
  } catch (err) {
    log.error(err)
    provider.disconnect()
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
