import "./polyfills"

import { readFile } from "node:fs/promises"
import { type Address, BalancesProvider, type BalancesResult } from "@talismn/balances"
import {
  ChainConnectorDotStub,
  type IChainConnectorDot,
  type SubscriptionCallback,
} from "@talismn/chain-connectors"
import {
  ChaindataFileSchema,
  ChaindataProvider,
  type DotNetworkId,
  type TokenId,
} from "@talismn/chaindata-provider"

const readChaindataFile = async (source: string): Promise<unknown> => {
  if (!/^https?:\/\//.test(source)) return JSON.parse(await readFile(source, "utf8"))

  const response = await fetch(source)
  if (!response.ok) throw new Error(`GET ${source} failed: ${response.status}`)
  return await response.json()
}

/**
 * Resolves once the provider holds the file. A file the provider would reject throws here,
 * because the provider only logs the rejection and keeps its empty storage.
 */
export const loadChaindata = async (source: string): Promise<ChaindataProvider> => {
  const parsed = ChaindataFileSchema.safeParse(await readChaindataFile(source))
  if (!parsed.success) throw new Error(`Invalid chaindata file ${source}`, { cause: parsed.error })

  const chaindata = new ChaindataProvider({ chaindata$: parsed.data })

  let subscription: { unsubscribe: () => void } | undefined
  await new Promise<void>((resolve, reject) => {
    subscription = chaindata.networks$.subscribe({
      next: (networks) => {
        if (networks.length || !parsed.data.networks.length) resolve()
      },
      error: reject,
    })
  }).finally(() => subscription?.unsubscribe())

  return chaindata
}

/** One bench connector per network, counting every request and subscription by RPC method. */
class CountingChainConnectorDot implements IChainConnectorDot {
  readonly requestsByMethod: Record<string, number> = {}
  #chaindata: ChaindataProvider
  #connectors = new Map<DotNetworkId, Promise<ChainConnectorDotStub>>()

  constructor(chaindata: ChaindataProvider) {
    this.#chaindata = chaindata
  }

  #connector(networkId: DotNetworkId) {
    let connector = this.#connectors.get(networkId)
    if (!connector) {
      connector = this.#chaindata.getNetworkById(networkId, "polkadot").then((network) => {
        if (!network) throw new Error(`Unknown polkadot network ${networkId}`)
        return new ChainConnectorDotStub(network)
      })
      this.#connectors.set(networkId, connector)
    }
    return connector
  }

  #count(method: string) {
    this.requestsByMethod[method] = (this.requestsByMethod[method] ?? 0) + 1
  }

  async send<T = unknown>(networkId: DotNetworkId, method: string, params: unknown[]) {
    this.#count(method)
    return await (await this.#connector(networkId)).send<T>(networkId, method, params)
  }

  async subscribe(
    networkId: DotNetworkId,
    subscribeMethod: string,
    responseMethod: string,
    params: unknown[],
    callback: SubscriptionCallback,
    timeout?: number | false
  ) {
    this.#count(subscribeMethod)
    const connector = await this.#connector(networkId)
    return await connector.subscribe(
      networkId,
      subscribeMethod,
      responseMethod,
      params,
      callback,
      timeout
    )
  }

  reset(): Promise<void> {
    throw new Error("CountingChainConnectorDot does not implement reset")
  }

  async destroy() {
    const connectors = await Promise.allSettled(this.#connectors.values())
    for (const connector of connectors)
      if (connector.status === "fulfilled") connector.value.destroy()
  }
}

export type BalancesRun = {
  emits: BalancesResult[]
  requestsByMethod: Record<string, number>
}

let hasRunBalances = false

/**
 * Runs `BalancesProvider` for `durationMs` and returns every emit. Substrate networks only.
 * One run per process: the library caches balance observables globally by argument, so a second
 * run would reuse the first run's destroyed connector and never reach `live`. Library timers keep
 * the process alive for about a minute afterwards, so scripts end with `process.exit`.
 */
export const runBalances = async (
  chaindata: ChaindataProvider,
  addressesByTokenId: Record<TokenId, Address[]>,
  durationMs: number
): Promise<BalancesRun> => {
  if (hasRunBalances) throw new Error("runBalances supports one run per process")
  hasRunBalances = true

  const connector = new CountingChainConnectorDot(chaindata)
  const provider = new BalancesProvider(chaindata, { substrate: connector })
  const emits: BalancesResult[] = []

  let subscription: { unsubscribe: () => void } | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    await new Promise<void>((resolve, reject) => {
      subscription = provider.getBalances$(addressesByTokenId).subscribe({
        next: (result) => emits.push(result),
        error: reject,
      })
      timer = setTimeout(resolve, durationMs)
    })
  } finally {
    clearTimeout(timer)
    subscription?.unsubscribe()
    await connector.destroy()
  }

  return { emits, requestsByMethod: { ...connector.requestsByMethod } }
}
