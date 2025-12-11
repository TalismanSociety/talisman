import { ExtDef } from "@polkadot/types/extrinsic/signedExtensions/types"
import { SignerPayloadJSON } from "@polkadot/types/types"
import { parseMetadataRpc } from "@talismn/scale"

import { getCallDocs } from "./helpers/getCallDocs"
import { getChainInfo } from "./helpers/getChainInfo"
import { getConstantValue } from "./helpers/getConstantValue"
import { getDecodedCall, getDecodedCallFromPayload } from "./helpers/getDecodedCall"
import { getDryRunCall } from "./helpers/getDryRunCall"
import { getFeeEstimate } from "./helpers/getFeeEstimate"
import { getRuntimeCallResult } from "./helpers/getRuntimeCallResult"
import { getSapiConnector } from "./helpers/getSapiConnector"
import { getSignerPayloadJSON } from "./helpers/getSignerPayloadJSON"
import { getStorageValue } from "./helpers/getStorageValue"
import { getTypeRegistry } from "./helpers/getTypeRegistry"
import { isApiAvailable } from "./helpers/isApiAvailable"
import { ScaleApiSubmitMode, submit } from "./helpers/submit"
import { Chain } from "./helpers/types"
import { DecodedCall, PayloadSignerConfig, SapiConnectorProps } from "./types"

export type ScaleApi = NonNullable<ReturnType<typeof getScaleApi>>

export const getScaleApi = (
  connector: SapiConnectorProps,
  hexMetadata: `0x${string}`,
  token: { symbol: string; decimals: number },
  hasCheckMetadataHash?: boolean,
  signedExtensions?: ExtDef,
  registryTypes?: unknown,
) => {
  const { unifiedMetadata: metadata, lookupFn: lookup, builder } = parseMetadataRpc(hexMetadata)

  const chain: Chain = {
    connector: getSapiConnector(connector),
    hexMetadata,

    token,
    hasCheckMetadataHash,
    signedExtensions,
    registryTypes,

    metadata,
    lookup,
    builder,
    metadataRpc: hexMetadata,
  }

  const chainInfo = getChainInfo(chain)

  const { specName, specVersion, base58Prefix } = chainInfo

  return {
    id: `${connector.chainId}::${specName}::${specVersion}`,
    chainId: connector.chainId,
    specName,
    specVersion,
    hasCheckMetadataHash,
    base58Prefix,
    token: chain.token,
    chain,

    getConstant: <T>(pallet: string, constant: string) =>
      getConstantValue<T>(chain, pallet, constant),

    getStorage: <T>(pallet: string, entry: string, keys: unknown[], at?: string) =>
      getStorageValue<T>(chain, pallet, entry, keys, at),

    getDecodedCall: (pallet: string, method: string, args: unknown) =>
      getDecodedCall(pallet, method, args),

    getDecodedCallFromPayload: <Res extends DecodedCall>(payload: {
      method: SignerPayloadJSON["method"]
    }) => getDecodedCallFromPayload<Res>(chain, payload),

    getExtrinsicPayload: (
      pallet: string,
      method: string,
      args: unknown,
      config: PayloadSignerConfig,
    ) => getSignerPayloadJSON(chain, pallet, method, args, config, chainInfo),

    getFeeEstimate: (payload: SignerPayloadJSON) => getFeeEstimate(chain, payload, chainInfo),

    getRuntimeCallValue: <T>(apiName: string, method: string, args: unknown[]) =>
      getRuntimeCallResult<T>(chain, apiName, method, args),

    getTypeRegistry: (payload: SignerPayloadJSON) => getTypeRegistry(chain, payload),

    submit: (
      payload: SignerPayloadJSON,
      signature?: `0x${string}`,
      txInfo?: unknown,
      mode?: ScaleApiSubmitMode,
    ) => submit(chain, payload, signature, txInfo, mode),

    getCallDocs: (pallet: string, method: string) => getCallDocs(chain, pallet, method),

    getDryRunCall: <T>(from: string, decodedCall: DecodedCall<unknown>) =>
      getDryRunCall<T>(chain, from, decodedCall),

    isApiAvailable: (name: string, method: string) => isApiAvailable(chain, name, method),
  }
}
