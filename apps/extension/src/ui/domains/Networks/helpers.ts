import { log } from "@common/log"
import type { SignerPayloadGenesisHash } from "@core/domains/signing/types"
import { createClient, type SubstrateClient } from "@polkadot-api/substrate-client"
import { getWsProvider } from "@polkadot-api/ws-provider"
import { createSolanaRpc } from "@solana/kit"
import { fetchBestMetadata, getScaleApi } from "@talismn/sapi"
import {
  decAnyMetadata,
  getDynamicBuilder,
  getLookupFn,
  type UnifiedMetadata,
  unifyMetadata,
} from "@talismn/scale"
import { throwAfter } from "@talismn/util"
import { hexToNumber, http } from "viem"
import { z } from "zod/v4"

/** Opens a short-lived connection to an rpc, runs `fn` against it, then tears the connection down */
const withOneShotClient = async <T>(
  rpcUrl: string,
  fn: (client: SubstrateClient) => Promise<T>
): Promise<T> => {
  const client = createClient(getWsProvider(rpcUrl, { timeout: 3_000 }))
  try {
    return await fn(client)
  } finally {
    client.destroy()
  }
}

// because of validation the same query is done 3 times minimum per url, make all await same promise
const rpcInfoCache = new Map<string, Promise<SubstrateRpcInfo | null>>()
const genesisHashCache = new Map<string, Promise<string | null>>()

const wsRegEx = /^wss?:\/\/.+$/
const httpRegEx = /^https?:\/\/.+$/

export const getDotGenesisHashFromRpc = (rpcUrl: string): Promise<`0x${string}` | null> => {
  // check if valid url
  if (!rpcUrl || !wsRegEx.test(rpcUrl)) return Promise.resolve(null)

  const cached = genesisHashCache.get(rpcUrl)
  if (cached) return cached as Promise<`0x${string}` | null>

  const request = (async () => {
    try {
      return await withOneShotClient(rpcUrl, (client) =>
        Promise.race([
          client.request<`0x${string}`>("chain_getBlockHash", [0]),
          throwAfter(5_000, "timeout"),
        ])
      )
    } catch {
      return null
    } finally {
      genesisHashCache.delete(rpcUrl)
    }
  })()

  genesisHashCache.set(rpcUrl, request)

  return request
}

export const getSolGenesisHashFromRpc = (rpcUrl: string): Promise<string | null> => {
  // check if valid url
  if (!rpcUrl || !httpRegEx.test(rpcUrl)) return Promise.resolve(null)

  const cached = genesisHashCache.get(rpcUrl)
  if (cached) return cached

  const request = (async () => {
    const rpc = createSolanaRpc(rpcUrl)
    try {
      return await Promise.race([rpc.getGenesisHash().send(), throwAfter(3000, "timeout")])
    } catch {
      return null
    } finally {
      genesisHashCache.delete(rpcUrl)
    }
  })()

  genesisHashCache.set(rpcUrl, request)

  return request
}

type SubstrateRpcInfo = {
  genesisHash: SignerPayloadGenesisHash
  token: { symbol: string; decimals: number; existentialDeposit: string }
  name: string
  specName: string
  specVersion: number
  account: "*25519" | "secp256k1"
  ss58Prefix: number
  hasCheckMetadataHash: boolean
}

export const getDotChainInfoFromRpc = (rpcUrl: string): Promise<SubstrateRpcInfo | null> => {
  // check if valid url
  if (!rpcUrl || !wsRegEx.test(rpcUrl)) return Promise.resolve(null)

  const cached = rpcInfoCache.get(rpcUrl)
  if (cached) return cached

  const request = (async () => {
    try {
      return await withOneShotClient(rpcUrl, async (client) => {
        const send = <T = unknown>(method: string, params?: unknown[]) =>
          client.request<T>(method, params ?? [])

        const [genesisHash, systemProperties, name, { specName, specVersion }] =
          (await Promise.race([
            Promise.all([
              client.request<SignerPayloadGenesisHash>("chain_getBlockHash", [0]),
              send("system_properties"),
              send("system_name"),
              send("state_getRuntimeVersion"),
            ]),
            throwAfter(10_000, "timeout"),
          ])) as [
            SignerPayloadGenesisHash,
            { tokenSymbol?: string | string[]; tokenDecimals?: number | number[] },
            string,
            { specName: string; specVersion: number },
          ]
        const { tokenSymbol, tokenDecimals } = systemProperties ?? {}
        const symbol: string = (Array.isArray(tokenSymbol) ? tokenSymbol[0] : tokenSymbol) ?? "Unit"
        const decimals: number =
          (Array.isArray(tokenDecimals) ? tokenDecimals[0] : tokenDecimals) ?? 0

        const rawMetadata = await fetchBestMetadata(send, true)
        const sapi = getScaleApi({ chainId: genesisHash, send }, rawMetadata, {
          symbol,
          decimals,
        })
        const existentialDeposit = sapi.getConstant<bigint>("Balances", "ExistentialDeposit")

        const metadata = unifyMetadata(decAnyMetadata(rawMetadata))

        const ss58Prefix = getSs58Prefix(metadata)
        const account = getAccountType(metadata)
        const hasCheckMetadataHash = metadata.extrinsic.signedExtensions[0]?.some(
          ({ identifier }) => identifier === "CheckMetadataHash"
        )

        const result: SubstrateRpcInfo = {
          genesisHash,
          token: { symbol, decimals, existentialDeposit: String(existentialDeposit) },
          name,
          specName,
          specVersion,
          ss58Prefix,
          hasCheckMetadataHash,
          account,
        }

        return result
      })
    } catch {
      return null
    } finally {
      rpcInfoCache.delete(rpcUrl)
    }
  })()

  rpcInfoCache.set(rpcUrl, request)

  return request
}

const getAccountType = (metadata: UnifiedMetadata) => {
  const system = metadata.pallets.find((p) => p.name === "System")
  const account = system?.storage?.items.find((s) => s.name === "Account")
  const storage = account?.type
  if (storage?.tag !== "map") throw new Error(`Account storage is not a map`)

  const args = metadata.lookup.at(storage.value.key)
  if (!args) throw new Error(`Cannot lookup account type`)

  const accountType = args.path.slice(-1)[0]

  if (!accountType) throw new Error(`Account type not found in metadata`)

  switch (accountType) {
    case "AccountId32":
      return "*25519"
    case "AccountId20":
      return "secp256k1"
    default:
      throw new Error(`Unsupported account type: ${accountType}`)
  }
}

const getSs58Prefix = (metadata: UnifiedMetadata) => {
  const builder = getDynamicBuilder(getLookupFn(metadata))

  const encodedSs58Prefix = metadata.pallets
    .find((p) => p.name === "System")
    ?.constants.find((c) => c.name === "SS58Prefix")?.value
  if (!encodedSs58Prefix) throw new Error(`SS58Prefix constant not found in metadata`)

  const prefix = builder.buildConstant("System", "SS58Prefix").dec(encodedSs58Prefix) as number

  // metadata's codec is too loose: a prefix needs to be a number between 0 and 16383, and cannot be 46 or 47
  if (prefix < 0 || prefix > 16383 || [46, 47].includes(prefix)) {
    log.warn("Invalid SS58Prefix constant found in metadata (%s), defaulting to 42", prefix)
    return 42
  }
  return prefix
}

export const fetchEthChainId = async (rpcUrl: string, signal?: AbortSignal) => {
  const parsedRpcUrl = z.url({ protocol: /^https?$/ }).safeParse(rpcUrl) // validate URL
  if (!parsedRpcUrl.success) throw new Error(parsedRpcUrl.error.issues[0].message)

  const provider = http(parsedRpcUrl.data)({})
  const hexChainId = await provider.request({
    method: "eth_chainId",
    params: [],
    signal,
  })

  return String(hexToNumber(hexChainId as `0x${string}`)) // validate chain ID
}
