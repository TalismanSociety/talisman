import { merkleizeMetadata } from "@polkadot-api/merkleize-metadata"
import { Bytes, enhanceEncoder, u16, V14, V15 } from "@polkadot-api/substrate-bindings"
import { mergeUint8, toHex } from "@polkadot-api/utils"
import { Metadata, TypeRegistry } from "@polkadot/types"
import { ExtDef } from "@polkadot/types/extrinsic/signedExtensions/types"
import { IRuntimeVersionBase } from "@polkadot/types/types"
import { assert } from "@polkadot/util"
import { decodeMetadata, getDynamicBuilder, getLookupFn } from "@talismn/scale"
import { ChainId, SignerPayloadJSON } from "extension-core"
import { log } from "extension-shared"
import { Binary } from "polkadot-api"
import { Hex } from "viem"

import { api } from "@ui/api"

import { getExtrinsicDispatchInfo } from "./getExtrinsicDispatchInfo"

type ScaleMetadata = V14 | V15
type ScaleBuilder = ReturnType<typeof getDynamicBuilder>
type ScaleLookup = ReturnType<typeof getLookupFn>
export type ScaleApi = NonNullable<ReturnType<typeof getScaleApi>>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DecodedCall<Args = any> = { pallet: string; method: string; args: Args }

export type PayloadSignerConfig = {
  address: string
  tip?: bigint
}

export const getScaleApi = (
  chainId: ChainId,
  hexMetadata: Hex,
  token: { symbol: string; decimals: number },
  hasCheckMetadataHash?: boolean,
  signedExtensions?: ExtDef,
  registryTypes?: unknown,
) => {
  const stop = log.timer("[sapi] getScaleApi " + chainId)

  const decoded = decodeMetadata(hexMetadata)
  assert(decoded.metadata, `Missing Metadata V14+ for chain ${chainId}`)
  const { metadata } = decoded
  const lookup = getLookupFn(metadata)
  const builder = getDynamicBuilder(lookup)

  const {
    spec_name: specName,
    spec_version: specVersion,
    transaction_version: transactionVersion,
  } = getConstantValue<{
    spec_name: string
    spec_version: number
    transaction_version: number
  }>(chainId, metadata, builder, "System", "Version")

  const base58Prefix = getConstantValue<number>(chainId, metadata, builder, "System", "SS58Prefix")

  const { symbol, decimals } = token

  const chainInfo = {
    token: { symbol, decimals },
    hasCheckMetadataHash,
    specName,
    specVersion,
    transactionVersion,
    base58Prefix,
    signedExtensions,
    registryTypes,
  }

  const sapi = {
    id: `${chainId}::${specName}::${specVersion}`,
    chainId,
    specName,
    specVersion,
    hasCheckMetadataHash,
    base58Prefix,
    token: chainInfo.token,

    getConstant: <T>(pallet: string, constant: string) =>
      getConstantValue<T>(chainId, metadata, builder, pallet, constant),

    getStorage: <T>(pallet: string, entry: string, keys: unknown[]) =>
      getStorageValue<T>(chainId, builder, pallet, entry, keys),

    getDecodedCall: (pallet: string, method: string, args: unknown) =>
      getDecodedCall(pallet, method, args),

    getDecodedCallFromPayload: <Res extends DecodedCall>(payload: SignerPayloadJSON) =>
      getDecodedCallFromPayload<Res>(builder, lookup, payload),

    getExtrinsicPayload: (
      pallet: string,
      method: string,
      args: unknown,
      config: PayloadSignerConfig,
    ) =>
      getSignerPayloadJSON(
        chainId,
        hexMetadata,
        metadata,
        builder,
        pallet,
        method,
        args,
        config,
        chainInfo,
      ),

    getFeeEstimate: (payload: SignerPayloadJSON) =>
      getFeeEstimate(chainId, hexMetadata, builder, payload, chainInfo),

    getRuntimeCallValue: (apiName: string, method: string, args: unknown[]) =>
      getRuntimeCallValue(chainId, builder, apiName, method, args),

    getTypeRegistry: (payload: SignerPayloadJSON) =>
      getTypeRegistry(hexMetadata, payload, chainInfo),

    submit: (payload: SignerPayloadJSON, signature?: Hex) => api.subSubmit(payload, signature),

    getCallDocs: (pallet: string, method: string) => getCallDocs(pallet, method, metadata),
  }

  stop()

  return sapi
}

type ChainInfo = {
  specName: string
  specVersion: number
  transactionVersion: number
  base58Prefix: number
  token: { symbol: string; decimals: number }
  hasCheckMetadataHash?: boolean
  signedExtensions?: ExtDef
  registryTypes?: unknown
}

const getTypeRegistry = (hexMetadata: Hex, payload: SignerPayloadJSON, chainInfo: ChainInfo) => {
  const stop = log.timer("[sapi] getTypeRegistry")
  const registry = new TypeRegistry()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (chainInfo.registryTypes) registry.register(chainInfo.registryTypes as any)

  const meta = new Metadata(registry, hexMetadata)
  registry.setMetadata(meta, payload.signedExtensions, chainInfo.signedExtensions) // ~30ms

  stop()
  return registry
}

const getPayloadWithMetadataHash = (
  hexMetadata: Hex,
  builder: ScaleBuilder,
  chainInfo: ChainInfo,
  payload: SignerPayloadJSON,
): { payload: SignerPayloadJSON; txMetadata?: Uint8Array } => {
  if (!chainInfo.hasCheckMetadataHash || !payload.signedExtensions.includes("CheckMetadataHash"))
    return {
      payload,
      txMetadata: undefined,
    }

  try {
    const {
      token: { decimals, symbol: tokenSymbol },
      base58Prefix,
      specName,
      specVersion,
    } = chainInfo

    // since ultimately this needs a V15 object, would be nice if this accepted one directly as input
    const merkleizedMetadata = merkleizeMetadata(hexMetadata, {
      tokenSymbol,
      decimals,
      base58Prefix,
      specName,
      specVersion,
    })

    const metadataHash = toHex(merkleizedMetadata.digest()) as Hex

    const payloadWithMetadataHash = {
      ...payload,
      mode: 1,
      metadataHash,
      withSignedTransaction: true,
    }

    // TODO do this without PJS / registry => waiting for @polkadot-api/tx-utils
    // const { extra, additionalSigned } = getSignedExtensionValues(payload, metadata)
    // const badExtPayload = mergeUint8(fromHex(payload.method), ...extra, ...additionalSigned)
    // log.debug("[sapi] bad ExtPayload", { badExtPayload })

    const registry = getTypeRegistry(hexMetadata, payload, chainInfo)
    const extPayload = registry.createType("ExtrinsicPayload", payloadWithMetadataHash)
    const barePayload = extPayload.toU8a(true)

    const txMetadata = merkleizedMetadata.getProofForExtrinsicPayload(barePayload)

    return {
      payload: payloadWithMetadataHash,
      txMetadata,
    }
  } catch (err) {
    log.error("Failed to get shortened metadata", { error: err })
    return {
      payload,
      txMetadata: undefined,
    }
  }
}

const getDecodedCall = (palletName: string, methodName: string, args: unknown) => ({
  type: palletName,
  value: { type: methodName, value: args },
})

const getDecodedCallFromPayload = <Res extends DecodedCall>(
  builder: ScaleBuilder,
  lookup: ScaleLookup,
  payload: SignerPayloadJSON,
): Res => {
  const def = builder.buildDefinition(lookup.call!)
  const decoded = def.dec(payload.method)

  return {
    pallet: decoded.type,
    method: decoded.value.type,
    args: decoded.value.value,
  } as Res
}

const getCallDocs = (pallet: string, method: string, metadata: ScaleMetadata): string | null => {
  try {
    const typeIdCalls = metadata.pallets.find(({ name }) => name === pallet)?.calls
    if (!typeIdCalls) return null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let palletCalls: any = metadata.lookup[typeIdCalls]
    if (!palletCalls || palletCalls.id !== typeIdCalls)
      palletCalls = metadata.lookup.find((v) => v.id === typeIdCalls)

    if (!palletCalls) return null

    const call = palletCalls.def.value.find(
      (c: { name: string; docs?: string[] | null }) => c.name === method,
    )

    return call?.docs?.join("\n") ?? null
  } catch (err) {
    log.error("Failed to find call docs", { pallet, method, metadata })
    return null
  }
}

const getSignerPayloadJSON = async (
  chainId: ChainId,
  hexMetadata: Hex,
  metadata: ScaleMetadata,
  builder: ScaleBuilder,
  palletName: string,
  methodName: string,
  args: unknown,
  signerConfig: PayloadSignerConfig,
  chainInfo: ChainInfo,
): Promise<{ payload: SignerPayloadJSON; txMetadata?: Uint8Array }> => {
  const { codec, location } = builder.buildCall(palletName, methodName)
  const method = Binary.fromBytes(mergeUint8(new Uint8Array(location), codec.enc(args)))

  const blockNumber = await getStorageValue<number>(chainId, builder, "System", "Number", [])
  if (blockNumber === null) throw new Error("Block number not found")

  const [account, genesisHash, blockHash] = await Promise.all([
    getStorageValue<{ nonce: number }>(chainId, builder, "System", "Account", [
      signerConfig.address,
    ]), // TODO if V15 available, use a runtime call instead : AccountNonceApi/account_nonce
    getStorageValue<Binary>(chainId, builder, "System", "BlockHash", [0]),
    api.subSend<Hex>(chainId, "chain_getBlockHash", [blockNumber], false), // TODO find the right way to fetch this with new RPC api, this is not available in storage yet
  ])
  if (!genesisHash) throw new Error("Genesis hash not found")
  if (!blockHash) throw new Error("Block hash not found")

  const nonce = account ? account.nonce : 0
  const era = mortal({ period: 16, phase: blockNumber % 16 })
  const signedExtensions = metadata.extrinsic.signedExtensions.map((ext) =>
    ext.identifier.toString(),
  )

  const basePayload: SignerPayloadJSON = {
    address: signerConfig.address,
    genesisHash: genesisHash.asHex() as Hex,
    blockHash,
    method: method.asHex(),
    signedExtensions,
    nonce: toPjsHex(nonce, 4),
    specVersion: toPjsHex(chainInfo.specVersion, 4),
    transactionVersion: toPjsHex(chainInfo.transactionVersion, 4),
    blockNumber: toPjsHex(blockNumber, 4),
    era: toHex(era) as Hex,
    tip: toPjsHex(0, 16), // TODO gas station (required for Astar)
    assetId: undefined,
    version: 4,
  }

  const { payload, txMetadata } = getPayloadWithMetadataHash(
    hexMetadata,
    builder,
    chainInfo,
    basePayload,
  )

  // Avail support
  if (payload.signedExtensions.includes("CheckAppId"))
    (payload as SignerPayloadJSON & { appId: number }).appId = 0

  log.log("[sapi] payload", { newPayload: payload, txMetadata })

  return { payload, txMetadata }
}

const getFeeEstimate = async (
  chainId: ChainId,
  hexMetadata: Hex,
  builder: ScaleBuilder,
  payload: SignerPayloadJSON,
  chainInfo: ChainInfo,
) => {
  // TODO do this without PJS / registry => waiting for @polkadot-api/tx-utils
  const registry = getTypeRegistry(hexMetadata, payload, chainInfo)
  const extrinsic = registry.createType("Extrinsic", payload)

  extrinsic.signFake(payload.address, {
    appId: 0,
    nonce: payload.nonce,
    blockHash: payload.blockHash,
    genesisHash: payload.genesisHash,
    runtimeVersion: {
      specVersion: chainInfo.specVersion,
      transactionVersion: chainInfo.transactionVersion,
      // other fields aren't necessary for signing
    } as IRuntimeVersionBase,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)

  const bytes = extrinsic.toU8a(true)
  const binary = Binary.fromBytes(bytes)

  try {
    const result = await getRuntimeCallValue<{ partial_fee: bigint }>(
      chainId,
      builder,
      "TransactionPaymentApi",
      "query_info",
      [binary, bytes.length],
    )
    if (!result?.partial_fee) {
      throw new Error("partialFee is not found")
    }
    return result.partial_fee
  } catch (err) {
    log.error("Failed to get fee estimate using getRuntimeCallValue", { err })
  }

  // fallback to pjs encoded state call, in case the above fails (extracting runtime calls codecs might require metadata V15)
  // Note: PAPI will consider TransactionPaymentApi as first class api so it should work even without V15, but this is not the case yet.
  const { partialFee } = await getExtrinsicDispatchInfo(chainId, extrinsic)

  return BigInt(partialFee)
}

const getRuntimeCallValue = async <T>(
  chainId: ChainId,
  scaleBuilder: ScaleBuilder,
  apiName: string,
  method: string,
  args: unknown[],
) => {
  const stop = log.timer("[sapi] getRuntimeCallValue")
  const call = scaleBuilder.buildRuntimeCall(apiName, method)

  const hex = await api.subSend<string>(chainId, "state_call", [
    `${apiName}_${method}`,
    toHex(call.args.enc(args)),
  ])

  const res = call.value.dec(hex) as T
  stop()

  return res
}

const getConstantValue = <T>(
  chainId: ChainId,
  metadata: ScaleMetadata,
  scaleBuilder: ScaleBuilder,
  pallet: string,
  constant: string,
) => {
  try {
    const storageCodec = scaleBuilder.buildConstant(pallet, constant)

    const encodedValue = metadata.pallets
      .find(({ name }) => name === pallet)
      ?.constants.find(({ name }) => name === constant)?.value

    if (!encodedValue) throw new Error(`Constant ${pallet}.${constant} not found`)

    return storageCodec.dec(encodedValue) as T
  } catch (err) {
    log.error("Failed to get constant value", { err, chainId, pallet, constant })
    throw err
  }
}

const getStorageValue = async <T>(
  chainId: ChainId,
  scaleBuilder: ScaleBuilder,
  pallet: string,
  entry: string,
  keys: unknown[],
) => {
  const storageCodec = scaleBuilder.buildStorage(pallet, entry)
  const stateKey = storageCodec.enc(...keys)

  const hexValue = await api.subSend<string | null>(chainId, "state_getStorage", [stateKey])
  if (!hexValue) return null as T // caller will need to expect null when applicable

  return storageCodec.dec(hexValue) as T
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////                 Utilities from PAPI                 /////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
function trailingZeroes(n: number) {
  let i = 0
  while (!(n & 1)) {
    i++
    n >>= 1
  }
  return i
}

const toPjsHex = (value: number | bigint, minByteLen?: number) => {
  let inner = value.toString(16)
  inner = (inner.length % 2 ? "0" : "") + inner
  const nPaddedBytes = Math.max(0, (minByteLen || 0) - inner.length / 2)
  return ("0x" + "00".repeat(nPaddedBytes) + inner) as Hex
}

const mortal = enhanceEncoder(Bytes(2).enc, (value: { period: number; phase: number }) => {
  const factor = Math.max(value.period >> 12, 1)
  const left = Math.min(Math.max(trailingZeroes(value.period) - 1, 1), 15)
  const right = (value.phase / factor) << 4
  return u16.enc(left | right)
})
