import type { IChainConnectorDot } from "@talismn/chain-connectors"
import { type MetadataBuilder, parseMetadataRpc, toHex } from "@talismn/scale"

export const fetchRuntimeCallResult = async <T>(
  connector: IChainConnectorDot,
  networkId: string,
  // pass a pre-parsed MetadataBuilder when issuing many calls: parsing the raw metadataRpc is expensive
  metadataRpcOrBuilder: `0x${string}` | MetadataBuilder,
  apiName: string,
  method: string,
  args: unknown[]
): Promise<T> => {
  try {
    const builder =
      typeof metadataRpcOrBuilder === "string"
        ? parseMetadataRpc(metadataRpcOrBuilder).builder
        : metadataRpcOrBuilder
    const call = builder.buildRuntimeCall(apiName, method)

    const hex = await connector.send<string>(networkId, "state_call", [
      `${apiName}_${method}`,
      toHex(call.args.enc(args)),
    ])

    return call.value.dec(hex) as T
  } catch (cause) {
    throw new Error(`Error fetching runtime call on ${networkId} for ${apiName}.${method}`, {
      cause,
    })
  }
}
