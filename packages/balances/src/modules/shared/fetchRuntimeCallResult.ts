import type { IChainConnectorDot } from "@talismn/chain-connectors"
import { type MetadataBuilder, toHex } from "@talismn/scale"
import { reportJsActivity } from "@talismn/util"

import { parseMetadataRpcCached } from "./parseMetadataRpcCached"

// buildRuntimeCall compiles the arg/result codecs from the type graph — expensive and
// allocation-heavy, and previously re-ran for EVERY call (pollers like substrate-hydration
// issue several runtime calls per address per 6s poll). Memoized per (builder, api.method);
// the builder key is reference-stable thanks to parseMetadataRpcCached.
const runtimeCallCache = new WeakMap<
  MetadataBuilder,
  Map<string, ReturnType<MetadataBuilder["buildRuntimeCall"]>>
>()

const getRuntimeCall = (builder: MetadataBuilder, apiName: string, method: string) => {
  let byName = runtimeCallCache.get(builder)
  if (!byName) {
    byName = new Map()
    runtimeCallCache.set(builder, byName)
  }

  const key = `${apiName}.${method}`
  let call = byName.get(key)
  if (!call) {
    const start = performance.now()
    call = builder.buildRuntimeCall(apiName, method)
    reportJsActivity(`buildRuntimeCall ${key}`, performance.now() - start)
    byName.set(key, call)
  }
  return call
}

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
    // MUST be the cached parse: substrate-hydration passes the raw hex once PER ADDRESS
    // on every 6s poll — the uncached parse here was a full metadata decode+builder
    // build (~200ms, indivisible) per call, i.e. a recurring near-second JS-thread stall
    const builder =
      typeof metadataRpcOrBuilder === "string"
        ? parseMetadataRpcCached(metadataRpcOrBuilder).builder
        : metadataRpcOrBuilder
    const call = getRuntimeCall(builder, apiName, method)

    const hex = await connector.send<string>(networkId, "state_call", [
      `${apiName}_${method}`,
      toHex(call.args.enc(args)),
    ])

    // the response decode is synchronous and indivisible — large results can block
    // the JS thread for hundreds of ms. Report it so host stall watchdogs can attribute the block.
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
