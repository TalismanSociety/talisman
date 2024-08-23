import { Bytes, enhanceEncoder, u16 } from "@polkadot-api/substrate-bindings"
import { mergeUint8, toHex } from "@polkadot-api/utils"
import { getDynamicBuilder, getLookupFn, V14, V15 } from "@talismn/scale"
import { ChainId, SignerPayloadJSON } from "extension-core"
import { Binary } from "polkadot-api"
import { Hex } from "viem"

import { api } from "@ui/api"

type ScaleMetadata = V14 | V15
type ScaleBuilder = ReturnType<typeof getDynamicBuilder>
export type ScaleApi = ReturnType<typeof getScaleApi>

export const getScaleApi = (chainId: ChainId, metadata: ScaleMetadata) => {
  const lookup = getLookupFn(metadata)
  const builder = getDynamicBuilder(lookup)

  const { spec_name: specName, spec_version: specVersion } = getConstantValue<{
    spec_name: string
    spec_version: number
  }>(metadata, builder, "System", "Version")

  return {
    id: `${chainId}::${specName}::${specVersion}`,
    chainId,
    specName,
    specVersion,

    getConstant: <T>(pallet: string, constant: string) =>
      getConstantValue<T>(metadata, builder, pallet, constant),

    getStorage: <T>(pallet: string, method: string, keys: unknown[]) =>
      fetchStorageValue<T>(chainId, builder, pallet, method, keys),

    signAndSend: async (pallet: string, method: string, args: unknown, signer: string) => {
      const payload = await getCallPayload(chainId, metadata, builder, pallet, method, args, signer)
      return api.subSubmit(payload)
    },
  }
}

function trailingZeroes(n: number) {
  let i = 0
  while (!(n & 1)) {
    i++
    n >>= 1
  }
  return i
}

const mortal = enhanceEncoder(Bytes(2).enc, (value: { period: number; phase: number }) => {
  const factor = Math.max(value.period >> 12, 1)
  const left = Math.min(Math.max(trailingZeroes(value.period) - 1, 1), 15)
  const right = (value.phase / factor) << 4
  return u16.enc(left | right)
})

const getCallPayload = async (
  chainId: ChainId,
  metadata: ScaleMetadata,
  builder: ScaleBuilder,
  pallet: string,
  method: string,
  args: unknown,
  signer: string
): Promise<SignerPayloadJSON> => {
  // console.log("getCallPayload", { chainId, pallet, method, args, metadata, builder, signer })
  const { codec, location } = builder.buildCall(pallet, method)
  const callData = Binary.fromBytes(mergeUint8(new Uint8Array(location), codec.enc(args)))

  const { transaction_version: transactionVersion, spec_version: specVersion } = getConstantValue<{
    transaction_version: number
    spec_version: number
  }>(metadata, builder, "System", "Version")

  const blockNumber = await fetchStorageValue<number>(chainId, builder, "System", "Number", [])
  if (blockNumber === null) throw new Error("Block number not found")

  const [genesisHash, blockHash, nonce] = await Promise.all([
    fetchStorageValue<Binary>(chainId, builder, "System", "BlockHash", [0]),
    fetchStorageValue<Binary>(chainId, builder, "System", "ParentHash", []), // TODO not sure if this matches blockNumber
    api.subSend<number>(chainId, "system_accountNextIndex", [signer]), // TODO migrate to runtime api call AccountNonceApi/account_nonce
  ])

  // console.log({
  //   codec,
  //   location,
  //   callData,
  //   transactionVersion,
  //   specVersion,
  //   blockNumber,
  //   genesisHash,
  //   blockHash,
  //   nonce,
  // })
  if (!genesisHash) throw new Error("Genesis hash not found")
  if (!blockHash) throw new Error("Block hash not found")

  // from papi
  const toPjsHex = (value: number | bigint, minByteLen?: number) => {
    let inner = value.toString(16)
    inner = (inner.length % 2 ? "0" : "") + inner
    const nPaddedBytes = Math.max(0, (minByteLen || 0) - inner.length / 2)
    return ("0x" + "00".repeat(nPaddedBytes) + inner) as Hex
  }

  const signedExtensions = metadata.extrinsic.signedExtensions.map((ext) =>
    ext.identifier.toString()
  )

  const era = toHex(mortal({ period: 16, phase: blockNumber % 16 })) as Hex

  return {
    address: signer,
    genesisHash: genesisHash.asHex() as Hex,
    blockHash: blockHash.asHex() as Hex,
    method: callData.asHex(),
    signedExtensions,
    nonce: toPjsHex(nonce, 4),
    specVersion: toPjsHex(specVersion, 4),
    transactionVersion: toPjsHex(transactionVersion, 4),
    blockNumber: toPjsHex(blockNumber, 4),
    era,
    tip: toPjsHex(blockNumber, 16), // TODO
    assetId: undefined,
    mode: 0, // TODO
    metadataHash: undefined, // TODO
    version: 4,
  }
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

const fetchStorageValue = async <T>(
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
