import { Binary } from "@polkadot-api/substrate-bindings"
import type { IChainConnectorDot } from "@talismn/chain-connectors"
import { isAddressEqual } from "@talismn/crypto"
import { fetchStorageKeysPaged, queryStorageAt } from "@talismn/sapi"
import {
  compactMetadata,
  encodeMetadata,
  getStorageKeyPrefix,
  type parseMetadataRpc,
} from "@talismn/scale"
import z from "zod/v4"

import { fetchRuntimeCallResult, hasRuntimeApi } from "../shared"
import { parseMetadataRpcCached } from "../shared/parseMetadataRpcCached"

export type GammaDeposit = {
  netuid: number
  hotkey: string
  balance: bigint
  spendable: bigint
  dailySpendCap: bigint | null
}

export class GammaWireShapeError extends Error {
  override name = "GammaWireShapeError"

  constructor(method: string, reason: string, options?: { cause?: unknown }) {
    super(`unsupported GammaRuntimeApi.${method} shape: ${reason}`, options)
  }
}

const RUNTIME_API = "GammaRuntimeApi"
const DEPOSITS_FOR_COLDKEY = "get_gamma_deposits_for_coldkey"
const PALLET = "SubtensorModule"
const SUBNET_GAMMA_ENABLED = "SubnetGammaEnabled"
const GAMMA_DEPOSITS = "GammaDeposits"
const SUBNET_INFO_API = "SubnetInfoRuntimeApi"
const ALL_DYNAMIC_INFO = "get_all_dynamic_info"

const DepositsForColdkeySchema = z.array(
  z.object({
    netuid: z.number(),
    hotkey: z.string(),
    deposit: z.object({
      coldkey: z.string(),
      balance: z.bigint(),
      daily_spend_cap: z.object({ cap: z.bigint() }).optional(),
    }),
    spendable: z.bigint(),
  })
)

const parseDepositsForColdkey = (coldkey: string, decoded: unknown): GammaDeposit[] => {
  const parsed = DepositsForColdkeySchema.safeParse(decoded)
  if (!parsed.success)
    throw new GammaWireShapeError(DEPOSITS_FOR_COLDKEY, z.prettifyError(parsed.error), {
      cause: parsed.error,
    })

  return parsed.data.map(({ netuid, hotkey, deposit, spendable }) => {
    if (!isAddressEqual(deposit.coldkey, coldkey))
      throw new GammaWireShapeError(
        DEPOSITS_FOR_COLDKEY,
        `deposit coldkey ${deposit.coldkey} is not the queried coldkey ${coldkey}`
      )
    if (spendable > deposit.balance)
      throw new GammaWireShapeError(
        DEPOSITS_FOR_COLDKEY,
        `spendable ${spendable} exceeds balance ${deposit.balance}`
      )

    return {
      netuid,
      hotkey,
      balance: deposit.balance,
      spendable,
      dailySpendCap: deposit.daily_spend_cap?.cap ?? null,
    }
  })
}

export const fetchOwnedGammaDeposits = async ({
  connector,
  networkId,
  metadataRpc,
  coldkeys,
  at,
}: {
  connector: IChainConnectorDot
  networkId: string
  metadataRpc: `0x${string}`
  coldkeys: string[]
  at: `0x${string}`
}): Promise<Map<string, GammaDeposit[] | Error>> =>
  new Map(
    await Promise.all(
      coldkeys.map(async (coldkey): Promise<[string, GammaDeposit[] | Error]> => {
        try {
          const decoded = await fetchRuntimeCallResult<unknown>(
            connector,
            networkId,
            metadataRpc,
            RUNTIME_API,
            DEPOSITS_FOR_COLDKEY,
            [coldkey],
            at
          )
          return [coldkey, parseDepositsForColdkey(coldkey, decoded)]
        } catch (error) {
          return [coldkey, error instanceof Error ? error : new Error(String(error))]
        }
      })
    )
  )

export const compactGammaMetadata = ({
  metadata,
  unifiedMetadata,
}: Pick<ReturnType<typeof parseMetadataRpc>, "metadata" | "unifiedMetadata">):
  | `0x${string}`
  | null => {
  if (!hasRuntimeApi(unifiedMetadata, RUNTIME_API, DEPOSITS_FOR_COLDKEY)) return null

  const gammaMethods =
    unifiedMetadata.apis
      .find(({ name }) => name === RUNTIME_API)
      ?.methods.map(({ name }) => name) ?? []
  compactMetadata(
    metadata,
    [{ pallet: PALLET, items: ["GammaEnabled", SUBNET_GAMMA_ENABLED, GAMMA_DEPOSITS] }],
    [
      { runtimeApi: RUNTIME_API, methods: gammaMethods },
      { runtimeApi: SUBNET_INFO_API, methods: [ALL_DYNAMIC_INFO] },
    ]
  )
  return encodeMetadata(metadata)
}

export type GammaSubnet = { netuid: number; subnetName?: string }

const DynamicInfosSchema = z.array(
  z
    .object({
      netuid: z.number(),
      subnet_identity: z.object({ subnet_name: z.instanceof(Uint8Array) }).optional(),
    })
    .nullable()
)

const fetchSubnetNames = async (
  connector: IChainConnectorDot,
  networkId: string,
  metadataRpc: `0x${string}`
) => {
  const decoded = await fetchRuntimeCallResult<unknown>(
    connector,
    networkId,
    metadataRpc,
    SUBNET_INFO_API,
    ALL_DYNAMIC_INFO,
    []
  )
  const parsed = DynamicInfosSchema.safeParse(decoded)
  if (!parsed.success)
    throw new Error(
      `unsupported ${SUBNET_INFO_API}.${ALL_DYNAMIC_INFO} shape: ${z.prettifyError(parsed.error)}`,
      { cause: parsed.error }
    )

  return new Map(
    parsed.data.flatMap((info) => {
      const subnetName = info?.subnet_identity && Binary.toText(info.subnet_identity.subnet_name)
      return info && subnetName ? [[info.netuid, subnetName] as const] : []
    })
  )
}

export const fetchGammaSubnets = async ({
  connector,
  networkId,
  metadataRpc,
}: {
  connector: IChainConnectorDot
  networkId: string
  metadataRpc: `0x${string}`
}): Promise<GammaSubnet[]> => {
  const { builder } = parseMetadataRpcCached(metadataRpc)
  const enabledStorage = builder.buildStorage(PALLET, SUBNET_GAMMA_ENABLED)
  const depositsStorage = builder.buildStorage(PALLET, GAMMA_DEPOSITS)
  const send = (method: string, params: unknown[]) => connector.send(networkId, method, params)

  const [enabledKeys, depositKeys, subnetNames] = await Promise.all([
    fetchStorageKeysPaged(send, getStorageKeyPrefix(PALLET, SUBNET_GAMMA_ENABLED)),
    fetchStorageKeysPaged(send, getStorageKeyPrefix(PALLET, GAMMA_DEPOSITS)),
    fetchSubnetNames(connector, networkId, metadataRpc),
  ])
  const enabledValues = enabledKeys.length ? await queryStorageAt(send, enabledKeys) : new Map()

  const netuids = new Set([
    ...enabledKeys
      .filter((key) => {
        const value = enabledValues.get(key)
        return !!value && enabledStorage.value.dec(value) === true
      })
      .map((key) => (enabledStorage.keys.dec(key) as [number])[0]),
    ...depositKeys.map((key) => (depositsStorage.keys.dec(key) as [number, string])[0]),
  ])

  return [...netuids]
    .sort((a, b) => a - b)
    .map((netuid) => {
      const subnetName = subnetNames.get(netuid)
      return subnetName ? { netuid, subnetName } : { netuid }
    })
}
