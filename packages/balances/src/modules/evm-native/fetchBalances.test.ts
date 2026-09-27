import { ChainConnectorEthStub, type IChainConnectorEth } from "@talismn/chain-connectors"
import { type EvmNativeToken, evmNativeTokenId } from "@talismn/chaindata-provider"
import { encodeFunctionData, multicall3Abi } from "viem"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { IBalance } from "../../types"
import { BalanceFetchError } from "../shared/errors"
import { ethereumMainnet as fixture } from "./__fixtures__/ethereumMainnet"
import { callKey, ETHEREUM, FORK, MULTICALL3, stubEvmNode } from "./__fixtures__/fakeEvmNode"
import { fetchBalances } from "./fetchBalances"
import { getTransferCallData } from "./getTransferCallData"

const VITALIK = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
const BINANCE_14 = "0x28C6c06298d514Db089934071355E5743bf21d60"
const ZERO = "0x0000000000000000000000000000000000000000"
const ADDRESSES = [VITALIK, BINANCE_14, ZERO] as const

const nativeToken = (networkId: string): EvmNativeToken => ({
  id: evmNativeTokenId(networkId),
  type: "evm-native",
  platform: "ethereum",
  networkId,
  symbol: "ETH",
  decimals: 18,
})

const liveBalance = (networkId: string, address: string): IBalance => ({
  address,
  tokenId: evmNativeTokenId(networkId),
  value: fixture.expected[address as keyof typeof fixture.expected],
  source: "evm-native",
  networkId,
  status: "live",
})

const fetchNative = (
  network: typeof ETHEREUM,
  addresses: readonly string[],
  connector: IChainConnectorEth = new ChainConnectorEthStub(network)
) =>
  fetchBalances({
    networkId: network.id,
    tokensWithAddresses: [[nativeToken(network.id), [...addresses]]],
    connector,
  })

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("evm-native fetchBalances", () => {
  it("reads balances of several addresses through multicall3.getEthBalance", async () => {
    const node = stubEvmNode(fixture.rpc)

    const result = await fetchNative(ETHEREUM, ADDRESSES)

    expect(result).toEqual({
      success: ADDRESSES.map((address) => liveBalance("1", address)),
      errors: [],
    })
    expect(node.methods().every((method) => method === "eth_call")).toBe(true)
    expect(node.ethCalls().every(({ to }) => to.toLowerCase() === MULTICALL3)).toBe(true)
    expect(node.contractCalls()).toEqual(
      ADDRESSES.map((address) =>
        callKey(
          MULTICALL3,
          encodeFunctionData({ abi: multicall3Abi, functionName: "getEthBalance", args: [address] })
        )
      )
    )
  })

  // regression: viem 2.5x routes client.getBalance through multicall3 when the client batches
  // multicalls, which broke native balances on custom and forked RPCs without multicall3 deployed
  it("falls back to raw eth_getBalance when the advertised multicall3 is not deployed", async () => {
    const node = stubEvmNode({ ...fixture.rpc, multicall3Deployed: false })

    const result = await fetchNative(FORK, ADDRESSES)

    expect(result).toEqual({
      success: ADDRESSES.map((address) => liveBalance("1337", address)),
      errors: [],
    })
    const requests = node.requests()
    expect(requests.filter((r) => r.method === "eth_getBalance").map((r) => r.params)).toEqual(
      ADDRESSES.map((address) => [address, "latest"])
    )
    // only the failed multicall3 aggregates: no eth_call is retried after the fallback
    expect(node.ethCalls().every(({ to }) => to.toLowerCase() === MULTICALL3)).toBe(true)
    expect(requests.findLastIndex((r) => r.method === "eth_call")).toBeLessThan(
      requests.findIndex((r) => r.method === "eth_getBalance")
    )
  })

  it("uses eth_getBalance for a single balance even when multicall3 is available", async () => {
    const node = stubEvmNode(fixture.rpc)

    const result = await fetchNative(ETHEREUM, [BINANCE_14])

    expect(result).toEqual({ success: [liveBalance("1", BINANCE_14)], errors: [] })
    expect(node.methods()).toEqual(["eth_getBalance"])
  })

  it("reports a failed eth_getBalance for that address only", async () => {
    stubEvmNode({ ...fixture.rpc, multicall3Deployed: false, failingBalances: [BINANCE_14] })

    const result = await fetchNative(FORK, ADDRESSES)

    expect(result.success).toEqual([liveBalance("1337", VITALIK), liveBalance("1337", ZERO)])
    expect(result.errors).toEqual([
      { tokenId: "1337:evm-native", address: BINANCE_14, error: expect.any(BalanceFetchError) },
    ])
  })

  it("returns nothing without querying the node when no balance is requested", async () => {
    const node = stubEvmNode(fixture.rpc)

    const result = await fetchBalances({
      networkId: "1",
      tokensWithAddresses: [],
      connector: new ChainConnectorEthStub(ETHEREUM),
    })

    expect(result).toEqual({ success: [], errors: [] })
    expect(node.requests()).toEqual([])
  })

  it("rejects a token from another network", async () => {
    stubEvmNode(fixture.rpc)

    await expect(
      fetchBalances({
        networkId: "1",
        tokensWithAddresses: [[nativeToken("1337"), [VITALIK]]],
        connector: new ChainConnectorEthStub(ETHEREUM),
      })
    ).rejects.toThrow("Invalid token type or networkId")
  })

  it("rejects an address that is not an ethereum address", async () => {
    stubEvmNode(fixture.rpc)

    await expect(
      fetchNative(ETHEREUM, ["5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"])
    ).rejects.toThrow("Invalid ethereum address")
  })

  it("rejects when the connector has no client for the network", async () => {
    const connector: IChainConnectorEth = {
      getPublicClientForEvmNetwork: async () => null,
      getWalletClientForEvmNetwork: async () => null,
      clearRpcProvidersCache: () => {},
    }

    await expect(fetchNative(ETHEREUM, [VITALIK], connector)).rejects.toThrow(
      "Could not get rpc provider for evm network 1"
    )
  })
})

describe("evm-native getTransferCallData", () => {
  it("sends the value to the recipient with empty calldata", () => {
    expect(
      getTransferCallData({
        from: VITALIK,
        to: BINANCE_14,
        value: "1000000000000000000",
        token: nativeToken("1"),
      })
    ).toEqual({ from: VITALIK, to: BINANCE_14, value: "1000000000000000000", data: "0x" })
  })

  it("rejects an invalid recipient", () => {
    expect(() =>
      getTransferCallData({ from: VITALIK, to: "0x1234", value: "1", token: nativeToken("1") })
    ).toThrow("Invalid to address")
  })
})
