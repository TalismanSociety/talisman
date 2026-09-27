import type { EthNetwork } from "@talismn/chaindata-provider"
import {
  decodeFunctionData,
  decodeFunctionResult,
  encodeFunctionData,
  encodeFunctionResult,
  erc20Abi,
  type Hex,
  multicall3Abi,
} from "viem"
import { vi } from "vitest"

import { erc20BalancesAggregatorAbi } from "../../abis"

const FAKE_RPC_URL = "https://rpc.fixture.test"
export const MULTICALL3 = "0xca11bde05977b3631167028862be2a173976ca11"
export const ERC20_AGGREGATOR = "0x2e556284556ecEe5754d201bBB6E2cb47fB95DFd"

const ethereum: Omit<EthNetwork, "id" | "nativeTokenId"> = {
  platform: "ethereum",
  name: "Ethereum",
  nativeCurrency: { decimals: 18, symbol: "ETH", name: "Ether" },
  rpcs: [FAKE_RPC_URL],
  blockExplorerUrls: [],
}

/** Ethereum mainnet as configured in chaindata: multicall3 (from viem) plus Talisman's erc20 aggregator */
export const ETHEREUM: EthNetwork = {
  ...ethereum,
  id: "1",
  nativeTokenId: "1:evm-native",
  contracts: { Erc20Aggregator: ERC20_AGGREGATOR, Multicall3: MULTICALL3 },
}

/** A custom network (e.g. a mainnet fork) that advertises multicall3 but has no erc20 aggregator */
export const FORK: EthNetwork = {
  ...ethereum,
  id: "1337",
  nativeTokenId: "1337:evm-native",
  contracts: { Multicall3: MULTICALL3 },
}

type JsonRpcRequest = { id: number; method: string; params: unknown[] }
type CallResult = { success: boolean; returnData: Hex }

export type EthCall = { to: Hex; data: Hex }

export type FakeEvmNodeState = {
  /** eth_getBalance results, keyed by lowercase address */
  ethBalances?: Record<string, string>
  /** eth_call return data, keyed by `${lowercase to}:${calldata}` */
  calls?: Record<string, string>
  /** calls that revert, keyed like `calls` */
  reverts?: string[]
  /** addresses whose eth_getBalance fails */
  failingBalances?: string[]
  /** false when multicall3 is advertised but not deployed: calls to it return "0x" */
  multicall3Deployed?: boolean
}

export const callKey = (to: string, data: Hex) => `${to.toLowerCase()}:${data}`

const isAggregate3 = (data: Hex) =>
  decodeFunctionData({ abi: multicall3Abi, data }).functionName === "aggregate3"

const decodeAggregate3 = (data: Hex) =>
  decodeFunctionData({ abi: multicall3Abi, data }).args as readonly [
    readonly { target: Hex; callData: Hex }[],
  ]

const REVERTED = { code: 3, message: "execution reverted", data: "0x" }

/**
 * Stubs `fetch` with a JSON-RPC node that serves recorded chain state.
 * multicall3.aggregate3 and the erc20 aggregator are emulated per sub-call, so batching layouts don't
 * matter and single sub-calls can fail. Unknown requests throw so nothing silently falls through.
 */
export const stubEvmNode = (state: FakeEvmNodeState) => {
  const requests: JsonRpcRequest[] = []
  const reverts = new Set(state.reverts ?? [])
  const failingBalances = new Set(state.failingBalances?.map((a) => a.toLowerCase()))

  const recordedCall = (to: string, data: Hex): CallResult => {
    const key = callKey(to, data)
    if (reverts.has(key)) return { success: false, returnData: "0x" }
    const returnData = state.calls?.[key]
    if (!returnData) throw new Error(`unrecorded eth_call ${key}`)
    return { success: true, returnData: returnData as Hex }
  }

  const emulateErc20Aggregator = (data: Hex): CallResult => {
    const { args } = decodeFunctionData({ abi: erc20BalancesAggregatorAbi, data })
    const balances: bigint[] = []
    for (const { account, token } of args[0]) {
      const result = recordedCall(
        token,
        encodeFunctionData({ abi: erc20Abi, functionName: "balanceOf", args: [account] })
      )
      if (!result.success) return result
      balances.push(
        decodeFunctionResult({ abi: erc20Abi, functionName: "balanceOf", data: result.returnData })
      )
    }
    return {
      success: true,
      returnData: encodeFunctionResult({
        abi: erc20BalancesAggregatorAbi,
        functionName: "balances",
        result: balances,
      }),
    }
  }

  const call = (to: string, data: Hex): CallResult =>
    to.toLowerCase() === ERC20_AGGREGATOR.toLowerCase()
      ? emulateErc20Aggregator(data)
      : recordedCall(to, data)

  const emulateAggregate3 = (data: Hex) => {
    const [calls] = decodeAggregate3(data)
    return encodeFunctionResult({
      abi: multicall3Abi,
      functionName: "aggregate3",
      result: calls.map(({ target, callData }) => call(target, callData)),
    })
  }

  const ethCall = ({ to, data }: EthCall): CallResult => {
    if (to.toLowerCase() === MULTICALL3) {
      if (state.multicall3Deployed === false) return { success: true, returnData: "0x" }
      if (isAggregate3(data)) return { success: true, returnData: emulateAggregate3(data) }
    }
    return call(to, data)
  }

  const respond = (request: JsonRpcRequest) => {
    requests.push(request)
    const reply = (result: unknown) => ({ jsonrpc: "2.0", id: request.id, result })
    const fail = (error: unknown) => ({ jsonrpc: "2.0", id: request.id, error })

    switch (request.method) {
      case "eth_getBalance": {
        const address = String(request.params[0]).toLowerCase()
        if (failingBalances.has(address)) return fail({ code: -32000, message: "header not found" })
        const balance = state.ethBalances?.[address]
        if (!balance) throw new Error(`unrecorded eth_getBalance ${address}`)
        return reply(balance)
      }
      case "eth_call": {
        const result = ethCall(request.params[0] as EthCall)
        return result.success ? reply(result.returnData) : fail(REVERTED)
      }
      default:
        throw new Error(`unexpected rpc method ${request.method}`)
    }
  }

  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    if (new URL(url).href !== new URL(FAKE_RPC_URL).href)
      throw new Error(`unexpected fetch to ${url}`)
    const body = JSON.parse(String(init.body)) as JsonRpcRequest | JsonRpcRequest[]
    const response = Array.isArray(body) ? body.map(respond) : respond(body)
    return new Response(JSON.stringify(response), {
      headers: { "Content-Type": "application/json" },
    })
  })

  const ethCalls = () =>
    requests.filter((r) => r.method === "eth_call").map((r) => r.params[0] as EthCall)

  /**
   * every contract call that reached the node, with aggregate3 batches flattened into their
   * sub-calls, as `${lowercase to}:${calldata}` keys
   */
  const contractCalls = (): string[] =>
    ethCalls().flatMap(({ to, data }) => {
      if (to.toLowerCase() !== MULTICALL3) return [callKey(to, data)]
      if (!isAggregate3(data)) return [callKey(to, data)]
      const [calls] = decodeAggregate3(data)
      return calls.map(({ target, callData }) => callKey(target, callData))
    })

  return {
    methods: () => requests.map((r) => r.method),
    requests: () => requests,
    ethCalls,
    contractCalls,
  }
}
