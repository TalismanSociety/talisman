import { IChainConnectorDot } from "@talismn/chain-connectors"
import { parseMetadataRpc, toHex } from "@talismn/scale"

export const fetchRuntimeCallResult = async <T>(
  connector: IChainConnectorDot,
  networkId: string,
  metadataRpc: `0x${string}`,
  apiName: string,
  method: string,
  args: unknown[],
): Promise<T> => {
  try {
    const { builder } = parseMetadataRpc(metadataRpc)
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
