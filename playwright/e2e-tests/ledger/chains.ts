import { readFileSync } from "node:fs"

import { expect } from "../fixtures"
import { run, runOrSkipWhenUnavailable } from "./emulator"

type JsonRpcResponse = { result?: unknown; error?: { message: string } }

const jsonRpc = async (url: string, method: string, params: unknown[], signal?: AbortSignal) => {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal,
  })
  const { result, error } = (await response.json()) as JsonRpcResponse
  if (error) throw new Error(`${method} on ${url}: ${error.message}`)
  return result
}

// The chaindata the wallet ships with: the tests reach a live network through the same RPCs.
const CHAINDATA = "packages/chaindata-provider/src/state/initChaindata.json"

// Leaves the test time to try the next RPC, and to sign, when one accepts and never answers
const LIVE_RPC_ATTEMPT_MS = 10_000

/**
 * Calls a live network over HTTP, on the first of the wallet's own RPCs for it that answers.
 * The Polkadot metadata proof and the Solana blockhash check make the wallet need the live
 * network too, so this adds no second host to depend on.
 */
export const liveRpc = async <T>(networkId: string, method: string, params: unknown[] = []) => {
  const { networks } = JSON.parse(readFileSync(CHAINDATA, "utf8")) as {
    networks: { id: string; rpcs: string[] }[]
  }
  const rpcs = networks.find((network) => network.id === networkId)?.rpcs ?? []
  const failures: string[] = []
  for (const rpc of rpcs) {
    try {
      const url = rpc.replace(/^ws/, "http")
      return (await jsonRpc(url, method, params, AbortSignal.timeout(LIVE_RPC_ATTEMPT_MS))) as T
    } catch (error) {
      failures.push(String(error))
    }
  }
  throw new Error(`no RPC of ${networkId} answered ${method}: ${failures.join("; ")}`)
}

// The same image as docker-compose.test.yml, on a port and chain id of its own: chaindata fixes
// the fee type of chain 1, and the wallet picks legacy or EIP-1559 itself only for a chain
// that it has no fee type for.
const ANVIL_IMAGE = "ghcr.io/foundry-rs/foundry:v1.6.0-rc1"
const ANVIL_CONTAINER = "talisman-ledger-anvil"
const ANVIL_PORT = 8546

export const ANVIL = { chainId: 31337, url: `http://127.0.0.1:${ANVIL_PORT}` }

export const anvilRpc = <T>(method: string, params: unknown[] = []) =>
  jsonRpc(ANVIL.url, method, params) as Promise<T>

export const stopAnvil = () => run("docker", "rm", "-f", ANVIL_CONTAINER).catch(() => undefined)

export const startAnvil = async () => {
  await stopAnvil()
  await runOrSkipWhenUnavailable(() =>
    run(
      "docker",
      ...["run", "--rm", "-d", "--name", ANVIL_CONTAINER],
      ...["-p", `127.0.0.1:${ANVIL_PORT}:8545`, ANVIL_IMAGE],
      `anvil --host 0.0.0.0 --chain-id ${ANVIL.chainId}`
    )
  )
  await expect
    .poll(() => anvilRpc<string>("eth_chainId").catch(() => null), {
      message: "Anvil answers",
      timeout: 30_000,
    })
    .toBe(`0x${ANVIL.chainId.toString(16)}`)
}
