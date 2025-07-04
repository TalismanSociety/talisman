import { u8aConcat, u8aToHex } from "@polkadot/util"
import { xxhashAsU8a } from "@polkadot/util-crypto"
import { ChainConnector } from "@talismn/chain-connector"
import {
  decAnyMetadata,
  getDynamicBuilder,
  getLookupFn,
  toHex,
  unifyMetadata,
} from "@talismn/scale"

export const getStorageKeyPrefix = (palletName: string, storageName: string) => {
  return u8aToHex(u8aConcat(xxhashAsU8a(palletName, 128), xxhashAsU8a(storageName, 128)))
}

export const fetchRuntimeCallResult = async <T>(
  connector: ChainConnector,
  networkId: string,
  metadataRpc: `0x${string}`,
  apiName: string,
  method: string,
  args: unknown[],
): Promise<T> => {
  const builder = getDynamicBuilder(getLookupFn(unifyMetadata(decAnyMetadata(metadataRpc))))
  const call = builder.buildRuntimeCall(apiName, method)

  const hex = await connector.send<string>(networkId, "state_call", [
    `${apiName}_${method}`,
    toHex(call.args.enc(args)),
  ])

  return call.value.dec(hex) as T
}

export const getConstantValue = <T>(
  metadataRpc: `0x${string}`,
  pallet: string,
  constant: string,
) => {
  const metadata = unifyMetadata(decAnyMetadata(metadataRpc))
  const builder = getDynamicBuilder(getLookupFn(metadata))
  const codec = builder.buildConstant(pallet, constant)

  const encodedValue = metadata.pallets
    .find(({ name }) => name === pallet)
    ?.constants.find(({ name }) => name === constant)?.value

  if (!encodedValue) throw new Error(`Constant ${pallet}.${constant} not found`)

  return codec.dec(encodedValue) as T
}
