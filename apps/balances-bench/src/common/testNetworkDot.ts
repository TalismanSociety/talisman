/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs"
import { dirname } from "path"

import { BALANCE_MODULES, MiniMetadata } from "@talismn/balances"
import { ChainConnectorDotStub, IChainConnectorDot } from "@talismn/chain-connectors"
import { DotNetwork, Token, TokenType } from "@talismn/chaindata-provider"
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
import { Enum } from "polkadot-api"

const TEST_ADDRESS_SUB = "5CcU6DRpocLUWYJHuNLjB4gGyHJrkWuruQD5XFbRYffCfSAP"
const TEST_ADDRESS_SUB2 = "5G24oH9LoJkBDuR4Hm7EUWiy2rPrsUSCTzY7fRcmxQNu6R1C"
const TEST_ADDRESS_EMPTY = "14BbPtmnepvdw2t34CvUbNGDxXazc4iHJZPc8vS3MiCDFzpn"

export type DotNetworkConfig = Pick<DotNetwork, "id" | "rpcs"> & {
  nativeCurrency?: Partial<DotNetwork["nativeCurrency"]>
  tokens: Partial<Record<TokenType, unknown[]>>
  balancesConfig?: Partial<Record<TokenType, any>>
}

type TestOptions = {
  modules?: TokenType[]
  fetchBalances?: boolean
  transfer?: boolean
}

const DEFAULT_OPTIONS: TestOptions = {
  modules: BALANCE_MODULES.filter((mod) => mod.platform === "polkadot").map(
    (mod) => mod.type as TokenType,
  ),
  fetchBalances: true,
  transfer: true,
}

export const testNetworkDot = async (network: DotNetworkConfig, options?: TestOptions) => {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  const connector: IChainConnectorDot = new ChainConnectorDotStub(network as unknown as DotNetwork)

  const stopAll = log.timer("testDotNetwork " + network.id)

  const miniMetadatas: MiniMetadata[] = []
  let tokens: Token[] | null = null
  let dryRun: any = null

  try {
    const stop2 = log.timer("Fetched runtime version")
    const { specVersion } = await connector.send<{ specVersion: number }>(
      network.id,
      "state_getRuntimeVersion",
      [],
    )
    stop2()
    log.log("RuntimeVersion", { specVersion })

    const networkId = network.id

    const metadataFilePath = `./cache/metadata/${network.id}-${specVersion}.scale`
    if (!existsSync(metadataFilePath)) {
      const dir = dirname(metadataFilePath)
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

      const stop = log.timer("Fetched metadata")
      const metadataRpc = await fetchBestMetadata(
        (...args) => connector.send(networkId, ...args),
        false,
      )
      stop()
      writeFileSync(metadataFilePath, metadataRpc)
    }

    const metadataRpc = readFileSync(metadataFilePath, "ascii") as `0x${string}`
    const anyMetadata = decAnyMetadata(metadataRpc)
    const metadata = unifyMetadata(anyMetadata)
    log.log("Metadata version", metadata.version)

    for (const mod of BALANCE_MODULES.filter(
      (mod) => mod.platform === "polkadot", // then we can use a ChainConnector
    ).filter((mod) => opts.modules?.includes(mod.type as TokenType))) {
      const source = mod.type
      log.log()
      log.log("///////////////////////////////////////////////////////////////////////////////////")
      log.log(`                         ${source}`)
      log.log("///////////////////////////////////////////////////////////////////////////////////")
      log.log()

      const miniMetadata = mod.getMiniMetadata({
        networkId,
        specVersion,
        metadataRpc,
        config: network.balancesConfig?.[mod.type],
      })
      miniMetadatas.push(miniMetadata)
      log.log("mod.getMiniMetadata() result", {
        ...miniMetadata,
        data: miniMetadata.data ? `<length:${miniMetadata.data.length}>` : null,
      })
      log.log()

      const tokenConfigs =
        (mod.type as string) === "substrate-native"
          ? [network.nativeCurrency]
          : // @ts-ignore
            (network.tokens[mod.type] ?? [])
      log.log("Token configs", tokenConfigs)
      log.log()

      tokens = await mod.fetchTokens({
        networkId,
        tokens: tokenConfigs as any,
        connector,
        miniMetadata: miniMetadata as any,
        cache: {},
      })

      log.log("mod.fetchTokens results", tokens.slice(0, 3))

      if (tokens.length > 3) log.log("+ %s other tokens", tokens.length - 3)
      log.log()

      if (!opts.fetchBalances) continue

      const BALANCES_ADDRESSES = [TEST_ADDRESS_SUB, TEST_ADDRESS_SUB2, TEST_ADDRESS_EMPTY]

      let balances = await mod.fetchBalances({
        networkId,
        tokensWithAddresses: tokens.map((token) => [token, BALANCES_ADDRESSES] as const),
        connector,
        miniMetadata: miniMetadata as any,
      })

      if (balances.dynamicTokens?.length) {
        log.log("%s new tokens found when fetching balances", balances.dynamicTokens.length)
        balances = await mod.fetchBalances({
          networkId,
          tokensWithAddresses: tokens
            .concat(balances.dynamicTokens)
            .map((token) => [token, BALANCES_ADDRESSES] as const),
          connector,
          miniMetadata: miniMetadata as any,
        })
      }

      log.log("Balances: successes:", balances.success.length)
      for (const b of balances.success
        .sort((a, b) => {
          // simple hack to show positive balances first
          if (a.value && b.value) return b.value.length - a.value.length
          return 0
        })
        .slice(0, 5))
        log.log(JSON.stringify(b, null, 2))
      if (balances.errors.length) {
        log.log("Balance errors:", balances.errors.length)
        for (const error of balances.errors.slice(0, 3)) log.error(error)
      }
      log.log()

      const anyPositiveBalance = balances.success.find(
        (b) =>
          b.address === TEST_ADDRESS_SUB &&
          ((b.value && !!BigInt(b.value)) ||
            b.values?.find((v) => v.type === "free" && !!BigInt(v.amount))),
      )
      if (!anyPositiveBalance) {
        log.log("No positive balance found for the test address")
        continue
      }

      if (!opts.transfer) continue

      const xferToken = tokens.find((t) => t.id === anyPositiveBalance.tokenId)!
      if (!xferToken) {
        log.log("No token found for transfer")
        continue
      }
      log.log("attempting transfer with ", xferToken.id)

      const available =
        anyPositiveBalance.value ??
        anyPositiveBalance.values?.find((v) => v.type === "free")!.amount
      if (!available || BigInt(available) <= BigInt(0)) {
        log.error("No available balance found for the test address")
        continue
      }
      const value = BigInt(available) / BigInt(2) // transfer half of the balance
      // try transfer half of the MYTH balance to TEST_ADDRESS2
      const payloadBase = await mod.getTransferCallData({
        from: TEST_ADDRESS_SUB,
        to: TEST_ADDRESS_SUB2,
        value: value.toString(),
        token: xferToken,
        metadataRpc,
        type: "allow-death", // "keep-alive",
        connector,
      })

      log.log("Transfer payload", payloadBase)
      const lookup = getLookupFn(unifyMetadata(decAnyMetadata(metadataRpc)))
      const builder = getDynamicBuilder(lookup)
      const def = builder.buildDefinition(lookup.call!)
      const decodedCall = def.dec(payloadBase.method)
      log.log("Decoded call")
      log.log(decodedCall)
      log.log()

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

      dryRun = call.value.dec(hex)
      log.log("Dry run result")
      log.log(papiStringify(dryRun, 2))
    }
    stopAll()
  } catch (err) {
    log.error(err)
    connector.asProvider(network.id).disconnect()
  }
}
