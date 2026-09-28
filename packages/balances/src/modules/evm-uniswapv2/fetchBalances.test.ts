import { ChainConnectorEthStub } from "@talismn/chain-connectors"
import { type EvmUniswapV2Token, evmUniswapV2TokenId } from "@talismn/chaindata-provider"
import { encodeFunctionData, encodeFunctionResult } from "viem"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { AmountWithLabel, IBalance } from "../../types"
import { uniswapV2PairAbi } from "../abis"
import { callKey, ETHEREUM, stubEvmNode } from "../evm-native/__fixtures__/fakeEvmNode"
import { BalanceFetchError, BalanceFetchNetworkError } from "../shared/errors"
import { ethereumMainnet as fixture } from "./__fixtures__/ethereumMainnet"
import { fetchBalances } from "./fetchBalances"
import { getTransferCallData } from "./getTransferCallData"
import { getUniswapV2PairContractData } from "./utils"

const USDC_WETH = "0xB4e16d0168e52d35CaCD2c6185b44281Ec28C9Dc"
const DAI_WETH = "0xA478c2975Ab1Ea89e8196811F51A7B7Ade33eB11"
const PAIRS = [USDC_WETH, DAI_WETH] as const
type Pair = (typeof PAIRS)[number]

const pool = (pair: Pair) => fixture.expected[pair]
const holders = (pair: Pair) => pool(pair).holders as `0x${string}`[]
const balanceOf = (pair: Pair, holder: string) =>
  BigInt(pool(pair).balances[holder as keyof ReturnType<typeof pool>["balances"]])

const lpToken = (pair: Pair): EvmUniswapV2Token => ({
  id: evmUniswapV2TokenId("1", pair),
  type: "evm-uniswapv2",
  platform: "ethereum",
  networkId: "1",
  contractAddress: pair,
  symbol: "UNI-V2",
  decimals: 18,
  symbol0: pair === USDC_WETH ? "USDC" : "DAI",
  symbol1: "WETH",
  decimals0: pair === USDC_WETH ? 6 : 18,
  decimals1: 18,
  tokenAddress0: pool(pair).token0 as `0x${string}`,
  tokenAddress1: pool(pair).token1 as `0x${string}`,
})

const fetchLp = (pairs: readonly Pair[]) =>
  fetchBalances({
    networkId: "1",
    tokensWithAddresses: pairs.map((pair) => [lpToken(pair), holders(pair)]),
    connector: new ChainConnectorEthStub(ETHEREUM),
  })

const pairCallKey = (
  pair: Pair,
  functionName: "totalSupply" | "getReserves" | "balanceOf",
  args?: [`0x${string}`]
) =>
  callKey(
    pair,
    encodeFunctionData({ abi: uniswapV2PairAbi, functionName, args } as Parameters<
      typeof encodeFunctionData<typeof uniswapV2PairAbi>
    >[0])
  )

const amount = (balance: IBalance, label: string) =>
  ("values" in balance ? (balance.values as AmountWithLabel<string>[]) : []).find(
    (value) => value.label === label
  )?.amount

const pairBalances = (pairs: readonly Pair[]) =>
  pairs.flatMap((pair) => holders(pair).map((holder) => ({ pair, holder })))

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("evm-uniswapv2 fetchBalances", () => {
  it("reports each holder's LP balance with the pool's supply and reserves", async () => {
    stubEvmNode(fixture.rpc)

    const result = await fetchLp(PAIRS)

    expect(result.errors).toEqual([])
    expect(
      result.success.map((balance) => ({
        ...balance,
        values: "values" in balance ? balance.values?.slice(0, 4) : undefined,
      }))
    ).toEqual(
      pairBalances(PAIRS).map(({ pair, holder }) => ({
        address: holder,
        tokenId: evmUniswapV2TokenId("1", pair),
        source: "evm-uniswapv2",
        networkId: "1",
        status: "live",
        values: [
          { type: "free", label: "free", amount: balanceOf(pair, holder).toString() },
          { type: "extra", label: "totalSupply", amount: pool(pair).totalSupply },
          { type: "extra", label: "reserve0", amount: pool(pair).reserve0 },
          { type: "extra", label: "reserve1", amount: pool(pair).reserve1 },
        ],
      }))
    )
  })

  it("reports holdings as whole planck, like the pair's burn() would pay out", async () => {
    stubEvmNode(fixture.rpc)

    const result = await fetchLp(PAIRS)

    expect(
      result.success.map((balance) => [amount(balance, "holding0"), amount(balance, "holding1")])
    ).toEqual(
      pairBalances(PAIRS).map(({ pair, holder }) => {
        const { reserve0, reserve1, totalSupply } = pool(pair)
        const lp = balanceOf(pair, holder)
        return [
          ((lp * BigInt(reserve0)) / BigInt(totalSupply)).toString(),
          ((lp * BigInt(reserve1)) / BigInt(totalSupply)).toString(),
        ]
      })
    )
  })

  it("queries pool supply and reserves once per pool, and balanceOf once per holder", async () => {
    const node = stubEvmNode(fixture.rpc)

    await fetchLp(PAIRS)

    expect(node.contractCalls().sort()).toEqual(
      [
        ...PAIRS.flatMap((pair) => [
          pairCallKey(pair, "totalSupply"),
          pairCallKey(pair, "getReserves"),
        ]),
        ...pairBalances(PAIRS).map(({ pair, holder }) => pairCallKey(pair, "balanceOf", [holder])),
      ].sort()
    )
  })

  it("reports a failed balanceOf for that holder only", async () => {
    const [, holder] = holders(DAI_WETH)
    if (!holder) throw new Error("fixture has no second DAI/WETH holder")
    stubEvmNode({ ...fixture.rpc, reverts: [pairCallKey(DAI_WETH, "balanceOf", [holder])] })

    const result = await fetchLp(PAIRS)

    expect(result.success.map(({ tokenId, address }) => [tokenId, address])).toEqual(
      pairBalances(PAIRS)
        .filter((pb) => !(pb.pair === DAI_WETH && pb.holder === holder))
        .map(({ pair, holder }) => [evmUniswapV2TokenId("1", pair), holder])
    )
    expect(result.errors).toEqual([
      {
        tokenId: evmUniswapV2TokenId("1", DAI_WETH),
        address: holder,
        error: expect.any(BalanceFetchError),
      },
    ])
  })

  it("reports every holder of a pool whose reserves cannot be read", async () => {
    stubEvmNode({ ...fixture.rpc, reverts: [pairCallKey(USDC_WETH, "getReserves")] })

    const result = await fetchLp(PAIRS)

    expect(result.success.map(({ tokenId, address }) => [tokenId, address])).toEqual(
      holders(DAI_WETH).map((holder) => [evmUniswapV2TokenId("1", DAI_WETH), holder])
    )
    expect(result.errors).toEqual(
      holders(USDC_WETH).map((holder) => ({
        tokenId: evmUniswapV2TokenId("1", USDC_WETH),
        address: holder,
        error: expect.any(BalanceFetchNetworkError),
      }))
    )
  })

  it("reports no holdings when the pool reports a zero total supply", async () => {
    const [zeroAddress] = holders(DAI_WETH)
    if (!zeroAddress) throw new Error("fixture has no DAI/WETH holder")
    stubEvmNode({
      ...fixture.rpc,
      calls: {
        ...fixture.rpc.calls,
        [pairCallKey(DAI_WETH, "totalSupply")]: encodeFunctionResult({
          abi: uniswapV2PairAbi,
          functionName: "totalSupply",
          result: 0n,
        }),
      },
    })

    const result = await fetchBalances({
      networkId: "1",
      tokensWithAddresses: [[lpToken(DAI_WETH), [zeroAddress]]],
      connector: new ChainConnectorEthStub(ETHEREUM),
    })

    const [balance] = result.success
    if (!balance) throw new Error("no balance")
    expect([amount(balance, "holding0"), amount(balance, "holding1")]).toEqual(["0", "0"])
  })

  it("rejects an address that is not an ethereum address", async () => {
    stubEvmNode(fixture.rpc)

    await expect(
      fetchBalances({
        networkId: "1",
        tokensWithAddresses: [[lpToken(USDC_WETH), ["not-an-address"]]],
        connector: new ChainConnectorEthStub(ETHEREUM),
      })
    ).rejects.toThrow("Invalid ethereum address")
  })
})

describe("getUniswapV2PairContractData", () => {
  it("reads both pool tokens, decimals and name", async () => {
    stubEvmNode(fixture.rpc)
    const client = await new ChainConnectorEthStub(ETHEREUM).getPublicClientForEvmNetwork()
    if (!client) throw new Error("no client")

    await expect(getUniswapV2PairContractData(client, USDC_WETH)).resolves.toEqual({
      token0: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      token1: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      decimals: 18,
      name: "Uniswap V2",
    })
  })
})

describe("evm-uniswapv2 getTransferCallData", () => {
  it("calls transfer(to, value) on the pair contract", () => {
    const [, to] = holders(USDC_WETH)
    const value = 10n ** 18n

    expect(
      getTransferCallData({
        from: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
        to: to ?? "",
        value: value.toString(),
        token: lpToken(USDC_WETH),
      })
    ).toEqual({
      from: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
      to: USDC_WETH,
      data: `0xa9059cbb${(to ?? "").slice(2).toLowerCase().padStart(64, "0")}${value
        .toString(16)
        .padStart(64, "0")}`,
    })
  })
})
