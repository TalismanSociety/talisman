import type { EthNetwork } from "@talismn/chaindata-provider"
import { afterEach, describe, expect, it, vi } from "vitest"

import { getIdentityVerdict } from "../rpcIdentity"
import { getTransportForEvmNetwork } from "./getTransportForEvmNetwork"

const A = "https://a.example"
const B = "https://b.example"

// chain ids are network ids, and verdicts last for the process: each test gets a chain of its own
let nextChainId = 964
const makeNetwork = (rpcs = [A, B]) => {
  const chainId = nextChainId++
  return {
    network: { id: String(chainId), rpcs } as EthNetwork,
    chainIdHex: `0x${chainId.toString(16)}`,
  }
}

const jsonResponse = (id: unknown, payload: object) =>
  new Response(JSON.stringify({ jsonrpc: "2.0", id, ...payload }), {
    headers: { "content-type": "application/json" },
  })

type Answer = object | "down"

/**
 * Stubs fetch: every RPC answers `eth_chainId` from `chainIds` and every other method with the
 * next of its `answers`. Records the (url, method) of each request.
 */
const stubRpcs = (chainIds: Record<string, string>, answers: Record<string, Answer[]> = {}) => {
  const requests: [string, string][] = []
  const fetch = vi.fn(async (href: string, init?: RequestInit) => {
    // viem normalises the url, with a trailing slash
    const url = href.replace(/\/$/, "")
    const { id, method } = JSON.parse(String(init?.body))
    requests.push([url, method])
    if (method === "eth_chainId") {
      if (!chainIds[url]) throw new TypeError("fetch failed")
      return jsonResponse(id, { result: chainIds[url] })
    }
    const answer = answers[url]?.shift()
    if (!answer || answer === "down") throw new TypeError("fetch failed")
    return jsonResponse(id, answer)
  })
  vi.stubGlobal("fetch", fetch)
  return requests
}

const request = (network: EthNetwork, method: string) =>
  getTransportForEvmNetwork(network)({}).request({ method, params: [] })

describe("getTransportForEvmNetwork", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("stops at the first rpc on a Frontier revert", async () => {
    const { network, chainIdHex } = makeNetwork()
    const revert = {
      error: { code: -32603, message: "VM Exception while processing transaction: revert" },
    }
    const requests = stubRpcs({ [A]: chainIdHex, [B]: chainIdHex }, { [A]: [revert] })

    await expect(request(network, "eth_estimateGas")).rejects.toThrow(
      "VM Exception while processing transaction: revert"
    )
    expect(requests).toEqual([
      [A, "eth_chainId"],
      [A, "eth_estimateGas"],
    ])
  })

  it("stops at the first rpc on an execution reverted error", async () => {
    const { network, chainIdHex } = makeNetwork()
    const revert = { error: { code: 3, message: "execution reverted" } }
    const requests = stubRpcs({ [A]: chainIdHex, [B]: chainIdHex }, { [A]: [revert] })

    await expect(request(network, "eth_estimateGas")).rejects.toThrow("execution reverted")
    expect(requests.filter(([, method]) => method !== "eth_chainId")).toEqual([
      [A, "eth_estimateGas"],
    ])
  })

  it("falls back to the next rpc on other errors", async () => {
    const { network, chainIdHex } = makeNetwork()
    stubRpcs(
      { [A]: chainIdHex, [B]: chainIdHex },
      {
        [A]: [{ error: { code: -32601, message: "Method not found" } }],
        [B]: [{ result: "0x1" }],
      }
    )

    expect(await request(network, "eth_fillTransaction")).toBe("0x1")
  })

  describe("chain identity", () => {
    it("sends nothing but eth_chainId to an rpc of another chain", async () => {
      const { network, chainIdHex } = makeNetwork()
      const requests = stubRpcs(
        { [A]: "0x1", [B]: chainIdHex },
        { [A]: [{ result: "0x63" }], [B]: [{ result: "0x2a" }, { result: "0x2b" }] }
      )

      expect(await request(network, "eth_blockNumber")).toBe("0x2a")
      expect(await request(network, "eth_blockNumber")).toBe("0x2b")
      expect(requests).toEqual([
        [A, "eth_chainId"],
        [B, "eth_chainId"],
        [B, "eth_blockNumber"],
        [B, "eth_blockNumber"],
      ])
      expect(getIdentityVerdict(network.id, A)).toBe("mismatch")
      expect(getIdentityVerdict(network.id, B)).toBe("match")
    })

    it("probes each rpc once, and concurrent requests share the probe", async () => {
      const { network, chainIdHex } = makeNetwork([A])
      const requests = stubRpcs(
        { [A]: chainIdHex },
        { [A]: [{ result: "0x1" }, { result: "0x2" }, { result: "0x3" }] }
      )

      // the public and wallet clients each build their own transport
      await Promise.all([request(network, "eth_blockNumber"), request(network, "eth_gasPrice")])
      await request(network, "eth_blockNumber")
      expect(requests.filter(([, method]) => method === "eth_chainId")).toHaveLength(1)
    })

    it("treats a failed probe as the rpc failing, and probes it again on the next request", async () => {
      const { network, chainIdHex } = makeNetwork()
      const requests = stubRpcs({ [B]: chainIdHex }, { [B]: [{ result: "0x1" }] })

      expect(await request(network, "eth_blockNumber")).toBe("0x1")
      expect(getIdentityVerdict(network.id, A)).toBeUndefined()

      await request(network, "eth_blockNumber").catch(() => {})
      expect(requests.filter(([url]) => url === A)).toEqual([
        [A, "eth_chainId"],
        [A, "eth_chainId"],
      ])
    })

    it("fails when no rpc serves the chain", async () => {
      const { network } = makeNetwork()
      const requests = stubRpcs({ [A]: "0x1", [B]: "0x2" })

      await expect(request(network, "eth_sendRawTransaction")).rejects.toThrow(
        "does not serve chain"
      )
      expect(requests.every(([, method]) => method === "eth_chainId")).toBe(true)
    })

    it("uses the rpcs unverified when the network id is not a chain id", async () => {
      const network = { id: "not-a-chain-id", rpcs: [A] } as EthNetwork
      const requests = stubRpcs({}, { [A]: [{ result: "0x1" }] })

      expect(await request(network, "eth_blockNumber")).toBe("0x1")
      expect(requests).toEqual([[A, "eth_blockNumber"]])
    })
  })
})
