import { ChainConnectorEthStub } from "@talismn/chain-connectors"
import { type EvmErc20Token, evmErc20TokenId } from "@talismn/chaindata-provider"
import { decodeFunctionData, encodeFunctionData, erc20Abi } from "viem"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { IBalance } from "../../types"
import { erc20BalancesAggregatorAbi } from "../abis"
import {
  callKey,
  ERC20_AGGREGATOR,
  ETHEREUM,
  FORK,
  stubEvmNode,
} from "../evm-native/__fixtures__/fakeEvmNode"
import { BalanceFetchError, BalanceFetchNetworkError } from "../shared/errors"
import { ethereumMainnet as fixture } from "./__fixtures__/ethereumMainnet"
import { fetchBalances } from "./fetchBalances"
import { getTransferCallData } from "./getTransferCallData"
import { getErc20ContractData } from "./utils"

const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as const
const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F" as const
const MKR = "0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2" as const

const VITALIK = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" as const
const BINANCE_14 = "0x28C6c06298d514Db089934071355E5743bf21d60" as const
const BINANCE_PEG = "0xF977814e90dA44bFA03b6295A0616a897441aceC" as const
const ADDRESSES: `0x${string}`[] = [VITALIK, BINANCE_14, BINANCE_PEG]

type Contract = typeof USDC | typeof DAI

const erc20Token = (networkId: string, contractAddress: Contract): EvmErc20Token => ({
  id: evmErc20TokenId(networkId, contractAddress),
  type: "evm-erc20",
  platform: "ethereum",
  networkId,
  contractAddress,
  symbol: contractAddress === USDC ? "USDC" : "DAI",
  decimals: contractAddress === USDC ? 6 : 18,
})

const expectedBalance = (networkId: string, contract: Contract, address: string): IBalance => ({
  address,
  tokenId: evmErc20TokenId(networkId, contract),
  value:
    fixture.expected.balances[contract][
      address as keyof (typeof fixture.expected.balances)[typeof USDC]
    ],
  source: "evm-erc20",
  networkId,
  status: "live",
})

// token-major, the order in which the module flattens its requests
const allPairs = (networkId: string) =>
  [USDC, DAI].flatMap((contract) =>
    ADDRESSES.map((address) => expectedBalance(networkId, contract, address))
  )

const fetchErc20 = (network: typeof ETHEREUM, contracts: Contract[], addresses: string[]) =>
  fetchBalances({
    networkId: network.id,
    tokensWithAddresses: contracts.map((contract) => [erc20Token(network.id, contract), addresses]),
    connector: new ChainConnectorEthStub(network),
  })

const mainnetClient = async () => {
  const client = await new ChainConnectorEthStub(ETHEREUM).getPublicClientForEvmNetwork()
  if (!client) throw new Error("no client")
  return client
}

const balanceOfKey = (contract: string, address: `0x${string}`) =>
  callKey(
    contract,
    encodeFunctionData({ abi: erc20Abi, functionName: "balanceOf", args: [address] })
  )

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("evm-erc20 fetchBalances with the erc20 aggregator", () => {
  it("maps each aggregated balance back to its (address, token) pair", async () => {
    const node = stubEvmNode(fixture.rpc)

    const result = await fetchErc20(ETHEREUM, [USDC, DAI], ADDRESSES)

    expect(result).toEqual({ success: allPairs("1"), errors: [] })

    const [aggregatorCall, ...otherCalls] = node.contractCalls()
    expect(otherCalls).toEqual([])
    const [to, data] = (aggregatorCall ?? "").split(":") as [string, `0x${string}`]
    expect(to).toBe(ERC20_AGGREGATOR.toLowerCase())
    const { args } = decodeFunctionData({ abi: erc20BalancesAggregatorAbi, data })
    expect(args[0]).toEqual(
      [USDC, DAI].flatMap((token) => ADDRESSES.map((account) => ({ account, token })))
    )
  })

  it("reports every pair as a network error when the aggregator call reverts", async () => {
    stubEvmNode({ ...fixture.rpc, reverts: [balanceOfKey(DAI, BINANCE_14)] })

    const result = await fetchErc20(ETHEREUM, [USDC, DAI], ADDRESSES)

    expect(result.success).toEqual([])
    expect(result.errors).toEqual(
      allPairs("1").map(({ tokenId, address }) => ({
        tokenId,
        address,
        error: expect.any(BalanceFetchNetworkError),
      }))
    )
  })

  it("skips the aggregator for a single balance", async () => {
    const node = stubEvmNode(fixture.rpc)

    const result = await fetchErc20(ETHEREUM, [DAI], [VITALIK])

    expect(result).toEqual({ success: [expectedBalance("1", DAI, VITALIK)], errors: [] })
    expect(node.contractCalls()).toEqual([balanceOfKey(DAI, VITALIK)])
  })
})

describe("evm-erc20 fetchBalances without the erc20 aggregator", () => {
  it("maps each balanceOf result back to its (address, token) pair", async () => {
    const node = stubEvmNode(fixture.rpc)

    const result = await fetchErc20(FORK, [USDC, DAI], ADDRESSES)

    expect(result).toEqual({ success: allPairs("1337"), errors: [] })
    expect(node.contractCalls()).toEqual(
      [USDC, DAI].flatMap((contract) => ADDRESSES.map((address) => balanceOfKey(contract, address)))
    )
  })

  it("reports a reverted balanceOf in a multicall batch for that pair only", async () => {
    stubEvmNode({ ...fixture.rpc, reverts: [balanceOfKey(DAI, BINANCE_14)] })

    const result = await fetchErc20(FORK, [USDC, DAI], ADDRESSES)

    expect(result.success).toEqual(
      allPairs("1337").filter(
        ({ tokenId, address }) =>
          !(tokenId === evmErc20TokenId("1337", DAI) && address === BINANCE_14)
      )
    )
    expect(result.errors).toEqual([
      {
        tokenId: evmErc20TokenId("1337", DAI),
        address: BINANCE_14,
        error: expect.any(BalanceFetchError),
      },
    ])
  })
})

describe("evm-erc20 fetchBalances validation", () => {
  it("rejects a token from another network", async () => {
    stubEvmNode(fixture.rpc)

    await expect(
      fetchBalances({
        networkId: "1",
        tokensWithAddresses: [[erc20Token("1337", USDC), [VITALIK]]],
        connector: new ChainConnectorEthStub(ETHEREUM),
      })
    ).rejects.toThrow("Invalid token type or networkId")
  })

  it("rejects an address that is not an ethereum address", async () => {
    stubEvmNode(fixture.rpc)

    await expect(fetchErc20(ETHEREUM, [USDC], [VITALIK, "0xnope"])).rejects.toThrow(
      "Invalid ethereum address for EVM ERC20 balance module: 0xnope"
    )
  })
})

describe("getErc20ContractData", () => {
  it("reads symbol, decimals and name of a standard erc20", async () => {
    stubEvmNode(fixture.rpc)

    await expect(getErc20ContractData(await mainnetClient(), USDC)).resolves.toEqual(
      fixture.expected.metadata[USDC]
    )
  })

  it("falls back to bytes32 symbol and name (MKR)", async () => {
    stubEvmNode(fixture.rpc)

    await expect(getErc20ContractData(await mainnetClient(), MKR)).resolves.toEqual({
      symbol: "MKR",
      decimals: 18,
      name: "Maker",
    })
  })
})

describe("evm-erc20 getTransferCallData", () => {
  it("calls transfer(to, value) on the token contract", () => {
    const value = 123_456_789n

    const callData = getTransferCallData({
      from: VITALIK,
      to: BINANCE_14,
      value: value.toString(),
      token: erc20Token("1", USDC),
    })

    expect(callData).toEqual({
      from: VITALIK,
      to: USDC,
      data: `0xa9059cbb${BINANCE_14.slice(2).toLowerCase().padStart(64, "0")}${value
        .toString(16)
        .padStart(64, "0")}`,
    })
  })

  it("rejects an invalid sender", () => {
    expect(() =>
      getTransferCallData({ from: "0x12", to: VITALIK, value: "1", token: erc20Token("1", USDC) })
    ).toThrow("Invalid from address")
  })
})
