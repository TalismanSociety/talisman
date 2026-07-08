import type { IChainConnectorDot } from "@talismn/chain-connectors"
import { type MetadataBuilder, parseMetadataRpc, toHex } from "@talismn/scale"
import { reportJsActivity } from "@talismn/util"

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

    // the response decode is synchronous and indivisible — for large results (e.g.
    // bittensor get_stake_info_for_coldkeys / get_all_dynamic_info, polled every 6s)
    // this can block the JS thread for hundreds of ms. Report it so host stall
    // watchdogs can attribute the block.
    const start = performance.now()
    const result = call.value.dec(hex) as T
    reportJsActivity(
      `runtimeCall decode ${networkId} ${apiName}.${method} (~${Math.round((hex?.length ?? 0) / 2048)}KB)`,
      performance.now() - start
    )
    return result
  } catch (cause) {
    throw new Error(`Error fetching runtime call on ${networkId} for ${apiName}.${method}`, {
      cause,
    })
  }
}
