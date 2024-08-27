import { merkleizeMetadata } from "@polkadot-api/merkleize-metadata"
import {
  Bytes,
  enhanceEncoder,
  metadata as metadataCodec,
  u16,
  V14,
  V15,
} from "@polkadot-api/substrate-bindings"
import { mergeUint8, toHex } from "@polkadot-api/utils"
import { Metadata, TypeRegistry } from "@polkadot/types"
import { ExtDef } from "@polkadot/types/extrinsic/signedExtensions/types"
import { IRuntimeVersionBase } from "@polkadot/types/types"
import { getDynamicBuilder, getLookupFn } from "@talismn/scale"
import { ChainId, SignerPayloadJSON } from "extension-core"
import { DEBUG, log } from "extension-shared"
import { Binary } from "polkadot-api"
import { Hex } from "viem"

import { api } from "@ui/api"

import { getExtrinsicDispatchInfo } from "./getExtrinsicDispatchInfo"

type ScaleMetadata = V14 | V15
type ScaleBuilder = ReturnType<typeof getDynamicBuilder>
export type ScaleApi = ReturnType<typeof getScaleApi>

export type PayloadSignerConfig = {
  address: string
  tip?: bigint
}

export const getScaleApi = (
  chainId: ChainId,
  metadata: ScaleMetadata,
  token: { symbol: string; decimals: number },
  hasCheckMetadataHash?: boolean,
  signedExtensions?: ExtDef,
  registryTypes?: unknown
) => {
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
  }>(metadata, builder, "System", "Version")

  const base58Prefix = getConstantValue<number>(metadata, builder, "System", "SS58Prefix")

  const chainInfo = {
    token,
    hasCheckMetadataHash,
    specName,
    specVersion,
    transactionVersion,
    base58Prefix,
    signedExtensions,
    registryTypes,
  }

  return {
    id: `${chainId}::${specName}::${specVersion}`,
    chainId,
    specName,
    specVersion,
    hasCheckMetadataHash,
    base58Prefix,
    token,

    getConstant: <T>(pallet: string, constant: string) =>
      getConstantValue<T>(metadata, builder, pallet, constant),

    getStorage: <T>(pallet: string, method: string, keys: unknown[]) =>
      getStorageValue<T>(chainId, builder, pallet, method, keys),

    getExtrinsicPayload: (
      pallet: string,
      method: string,
      args: unknown,
      config: PayloadSignerConfig
    ) => getSignerPayloadJSON(chainId, metadata, builder, pallet, method, args, config, chainInfo),

    getFeeEstimate: (payload: SignerPayloadJSON) =>
      getFeeEstimate(chainId, metadata, builder, payload, chainInfo),

    getTypeRegistry: (payload: SignerPayloadJSON) => getTypeRegistry(metadata, payload, chainInfo),

    submit: (payload: SignerPayloadJSON, signature?: Hex) => api.subSubmit(payload, signature),
  }
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

const getTypeRegistry = (
  metadata: ScaleMetadata,
  payload: SignerPayloadJSON,
  chainInfo: ChainInfo
) => {
  const stop = log.timer("[sapi] getTypeRegistry")
  const fullMetadata = {
    magicNumber: 1635018093, // magic number for metadata
    metadata: { tag: "v15" as const, value: metadata as V15 },
  }
  const metadataBytes = metadataCodec.enc(fullMetadata) // ~30ms

  const registry = new TypeRegistry()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (chainInfo.registryTypes) registry.register(chainInfo.registryTypes as any)

  registry.setMetadata(
    new Metadata(registry, metadataBytes),
    payload.signedExtensions,
    chainInfo.signedExtensions
  ) // ~30ms

  stop()
  return registry
}

const getPayloadWithMetadataHash = (
  metadata: ScaleMetadata,
  builder: ScaleBuilder,
  chainInfo: ChainInfo,
  payload: SignerPayloadJSON
): { payload: SignerPayloadJSON; txMetadata?: Uint8Array } => {
  if (!chainInfo.hasCheckMetadataHash)
    return {
      payload: { ...payload, mode: 0, metadataHash: undefined, withSignedTransaction: true },
      txMetadata: undefined,
    }

  try {
    // merkleizeMetadata method expects versioned metadata so we need to reencode our V15 object back to a versioned one (~30ms)
    const stop1 = log.timer("v15.enc(metadata)")
    const fullMetadata = {
      magicNumber: 1635018093, // magic number for metadata
      metadata: { tag: "v15" as const, value: metadata as V15 },
    }
    const metadataBytes = metadataCodec.enc(fullMetadata)
    stop1()

    const {
      token: { decimals, symbol: tokenSymbol },
      base58Prefix,
      specName,
      specVersion,
    } = chainInfo

    // since ultimately this needs a V15 object, would be nice if this accepted one directly as input
    const merkleizedMetadata = merkleizeMetadata(metadataBytes, {
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

    // TODO do this without PJS / registry
    // const { extra, additionalSigned } = getSignedExtensionValues(payload, metadata)
    // const badExtPayload = mergeUint8(fromHex(payload.method), ...extra, ...additionalSigned)
    // log.debug("[sapi] bad ExtPayload", { badExtPayload })

    const registry = getTypeRegistry(metadata, payload, chainInfo)
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
      payload: { ...payload, mode: 0, metadataHash: undefined, withSignedTransaction: true },
      txMetadata: undefined,
    }
  }
}

const getSignerPayloadJSON = async (
  chainId: ChainId,
  metadata: ScaleMetadata,
  builder: ScaleBuilder,
  palletName: string,
  methodName: string,
  args: unknown,
  signerConfig: PayloadSignerConfig,
  chainInfo: ChainInfo
): Promise<{ payload: SignerPayloadJSON; txMetadata?: Uint8Array }> => {
  const { codec, location } = builder.buildCall(palletName, methodName)
  let method = Binary.fromBytes(mergeUint8(new Uint8Array(location), codec.enc(args)))

  // TODO remove
  if (DEBUG && Date.now())
    method = Binary.fromHex(
      "0x0500006cf965cfdd16d81eed9bf10c09a9d0da0141ab7a2419d1ca3045002fd115631100"
    ) // send 0 DOT to guardians

  const blockNumber = await getStorageValue<number>(chainId, builder, "System", "Number", [])
  if (blockNumber === null) throw new Error("Block number not found")

  const [account, genesisHash, blockHash] = await Promise.all([
    getStorageValue<{ nonce: number }>(chainId, builder, "System", "Account", [
      signerConfig.address,
    ]), // TODO if V15 available, use a runtime call isntead : AccountNonceApi/account_nonce
    getStorageValue<Binary>(chainId, builder, "System", "BlockHash", [0]),
    api.subSend<Hex>(chainId, "chain_getBlockHash", [blockNumber], false), // TODO find the right way to fetch this with new RPC api, the following returns undefined: fetchStorageValue<Binary>(chainId, builder, "System", "BlockHash", [blockNumber])
  ])
  if (!genesisHash) throw new Error("Genesis hash not found")
  if (!blockHash) throw new Error("Block hash not found")

  const nonce = account ? account.nonce : 0
  const era = mortal({ period: 16, phase: blockNumber % 16 })
  const signedExtensions = metadata.extrinsic.signedExtensions.map((ext) =>
    ext.identifier.toString()
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
    tip: toPjsHex(0, 16), // TODO
    assetId: undefined,
    version: 4,
  }

  const { payload, txMetadata } = getPayloadWithMetadataHash(
    metadata,
    builder,
    chainInfo,
    basePayload
  )

  log.log("[sapi] payload", { newPayload: payload, txMetadata })

  return { payload, txMetadata }
}

const getFeeEstimate = async (
  chainId: ChainId,
  metadata: ScaleMetadata,
  builder: ScaleBuilder,
  payload: SignerPayloadJSON,
  chainInfo: ChainInfo
) => {
  const registry = getTypeRegistry(metadata, payload, chainInfo)
  const extrinsic = registry.createType("Extrinsic", payload)

  extrinsic.signFake(payload.address, {
    nonce: payload.nonce,
    blockHash: payload.blockHash,
    genesisHash: payload.genesisHash,
    runtimeVersion: {
      specVersion: chainInfo.specVersion,
      transactionVersion: chainInfo.transactionVersion,
      // other fields aren't necessary for signing
    } as IRuntimeVersionBase,
  })

  const bytes = extrinsic.toU8a(true)
  const binary = Binary.fromBytes(bytes)

  try {
    const result = await getRuntimeCallValue<{ partial_fee: bigint }>(
      chainId,
      builder,
      "TransactionPaymentApi",
      "query_info",
      [binary, bytes.length]
    )
    if (!result?.partial_fee) {
      // console.warn("partialFee is not found", { result })
      throw new Error("partialFee is not found")
    }
    return result.partial_fee
  } catch (err) {
    log.error("Failed to get fee estimate using getRuntimeCallValue", { error: err })
  }

  // fallback to pjs encoded state call, in case the above fails (extracting runtime calls codecs might require metadata V15)
  const { partialFee } = await getExtrinsicDispatchInfo(chainId, extrinsic)

  return BigInt(partialFee)
}

const getRuntimeCallValue = async <T>(
  chainId: ChainId,
  scaleBuilder: ScaleBuilder,
  apiName: string,
  method: string,
  args: unknown[]
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
  metadata: ScaleMetadata,
  scaleBuilder: ScaleBuilder,
  pallet: string,
  constant: string
) => {
  const storageCodec = scaleBuilder.buildConstant(pallet, constant)

  const encodedValue = metadata.pallets
    .find(({ name }) => name === pallet)
    ?.constants.find(({ name }) => name === constant)?.value

  if (!encodedValue) throw new Error(`Constant ${pallet}.${constant} not found`)

  return storageCodec.dec(encodedValue) as T
}

const getStorageValue = async <T>(
  chainId: ChainId,
  scaleBuilder: ScaleBuilder,
  pallet: string,
  method: string,
  keys: unknown[]
) => {
  const storageCodec = scaleBuilder.buildStorage(pallet, method)
  const stateKey = storageCodec.enc(...keys)

  const hexValue = await api.subSend<string | null>(chainId, "state_getStorage", [stateKey])
  if (!hexValue) return null

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

// from papi
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
