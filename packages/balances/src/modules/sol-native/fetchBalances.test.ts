import { AccountRole } from "@solana/kit"
import { type SolNativeToken, solNativeTokenId } from "@talismn/chaindata-provider"
import { describe, expect, it } from "vitest"

import type { IBalance } from "../../types"
import { BalanceFetchError } from "../shared/errors"
import {
  createFakeSolanaRpc,
  NodeUnhealthyError,
  type SolanaRpcRequest,
} from "./__fixtures__/fakeSolanaRpc"
import { solanaMainnet as fixture } from "./__fixtures__/solanaMainnet"
import { fetchBalances } from "./fetchBalances"
import { getTransferCallData } from "./getTransferCallData"

const NETWORK_ID = "solana-mainnet"
const SYSTEM_PROGRAM = "11111111111111111111111111111111"
const ADDRESSES = Object.keys(fixture.expected) as (keyof typeof fixture.expected)[]
const [KRAKEN, BINANCE, TOLY] = ADDRESSES as [string, string, string]

const sol = (networkId = NETWORK_ID): SolNativeToken => ({
  id: solNativeTokenId(networkId),
  type: "sol-native",
  platform: "solana",
  networkId,
  symbol: "SOL",
  decimals: 9,
})

const recordedBalances =
  (failing: string[] = []) =>
  ({ method, params }: SolanaRpcRequest) => {
    const [address] = params as [keyof typeof fixture.rpc.getBalance]
    if (method !== "getBalance") throw new Error(`unexpected rpc method ${method}`)
    if (failing.includes(address)) throw new NodeUnhealthyError()
    return fixture.rpc.getBalance[address].result
  }

const liveBalance = (address: string): IBalance => ({
  address,
  tokenId: solNativeTokenId(NETWORK_ID),
  value: fixture.expected[address as keyof typeof fixture.expected],
  source: "sol-native",
  networkId: NETWORK_ID,
  status: "live",
})

describe("sol-native fetchBalances", () => {
  it("reads the lamports of each address with getBalance", async () => {
    const { connector, requests } = createFakeSolanaRpc(recordedBalances())

    const result = await fetchBalances({
      networkId: NETWORK_ID,
      tokensWithAddresses: [[sol(), ADDRESSES]],
      connector,
    })

    expect(result).toEqual({ success: ADDRESSES.map(liveBalance), errors: [] })
    expect(requests.map(({ method, params }) => [method, params[0]])).toEqual(
      ADDRESSES.map((address) => ["getBalance", address])
    )
  })

  it("reports a failed getBalance for that address only", async () => {
    const { connector } = createFakeSolanaRpc(recordedBalances([BINANCE]))

    const result = await fetchBalances({
      networkId: NETWORK_ID,
      tokensWithAddresses: [[sol(), ADDRESSES]],
      connector,
    })

    expect(result.success).toEqual([liveBalance(KRAKEN), liveBalance(TOLY)])
    expect(result.errors).toEqual([
      {
        tokenId: solNativeTokenId(NETWORK_ID),
        address: BINANCE,
        error: expect.any(BalanceFetchError),
      },
    ])
  })

  it("rejects an address that is not a solana address", async () => {
    const { connector, requests } = createFakeSolanaRpc(recordedBalances())

    await expect(
      fetchBalances({
        networkId: NETWORK_ID,
        tokensWithAddresses: [[sol(), [KRAKEN, "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"]]],
        connector,
      })
    ).rejects.toThrow("Invalid solana address")
    expect(requests).toEqual([])
  })

  it("rejects a token from another network", async () => {
    const { connector } = createFakeSolanaRpc(recordedBalances())

    await expect(
      fetchBalances({
        networkId: NETWORK_ID,
        tokensWithAddresses: [[sol("solana-devnet"), [KRAKEN]]],
        connector,
      })
    ).rejects.toThrow("Invalid token type or networkId")
  })
})

describe("sol-native getTransferCallData", () => {
  it("builds a system program transfer of the lamports", async () => {
    const { connector } = createFakeSolanaRpc(recordedBalances())
    const lamports = 1_500_000_000n

    const [instruction, ...others] = await getTransferCallData({
      from: KRAKEN,
      to: TOLY,
      value: lamports.toString(),
      token: sol(),
      connector,
    })

    expect(others).toEqual([])
    expect(instruction?.programAddress).toBe(SYSTEM_PROGRAM)
    expect(instruction?.accounts?.map(({ address, role }) => [address, role])).toEqual([
      [KRAKEN, AccountRole.WRITABLE_SIGNER],
      [TOLY, AccountRole.WRITABLE],
    ])
    // SystemInstruction::Transfer = u32 LE 2, then the u64 LE amount
    const data = new Uint8Array(12)
    const view = new DataView(data.buffer)
    view.setUint32(0, 2, true)
    view.setBigUint64(4, lamports, true)
    expect(instruction?.data).toEqual(data)
  })
})
