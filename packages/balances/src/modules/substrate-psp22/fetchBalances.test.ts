import type { IChainConnectorDot } from "@talismn/chain-connectors"
import { type SubPsp22Token, subPsp22TokenId } from "@talismn/chaindata-provider"
import { describe, expect, it, vi } from "vitest"

import type { TokensWithAddresses } from "../../types/IBalanceModule"
import { alephZero } from "./__fixtures__/alephZero"
import { fetchBalances } from "./fetchBalances"

type Call = {
  name: string
  origin: string
  contract: string
  argsHex: string
  resultHex: string
  expected: { kind: string; balance?: string }
}

const NETWORK_ID = "aleph-zero"
const CALLS = alephZero.calls as Call[]
const callOf = (name: string) => CALLS.find((c) => c.name === name)!

const USDT = alephZero.contracts.USDT
const USDC = alephZero.contracts.USDC
const { usdtHolder: USDT_HOLDER, usdcHolder: USDC_HOLDER, empty: EMPTY } = alephZero.accounts

const makeToken = (contractAddress: string): SubPsp22Token => ({
  id: subPsp22TokenId(NETWORK_ID, contractAddress),
  type: "substrate-psp22",
  platform: "polkadot",
  networkId: NETWORK_ID,
  contractAddress,
  symbol: "TKN",
  decimals: 6,
  isDefault: true,
})

/** answers ContractsApi_call from the captured node responses, and rejects any other call */
const makeConnector = (override?: (argsHex: string) => string | undefined) => {
  const resultByArgs = new Map(CALLS.map((c) => [c.argsHex, c.resultHex]))
  const send = vi.fn(async (_networkId: string, method: string, params: unknown[]) => {
    const [api, args] = params as [string, string]
    if (method !== "state_call" || api !== "ContractsApi_call")
      throw new Error(`unexpected ${method} ${api}`)
    const result = override?.(args) ?? resultByArgs.get(args)
    if (!result) throw new Error(`unexpected args ${args}`)
    return result
  })
  return { send, connector: { send } as unknown as IChainConnectorDot }
}

const run = (
  tokensWithAddresses: TokensWithAddresses,
  connector: IChainConnectorDot = makeConnector().connector
) =>
  fetchBalances({
    networkId: NETWORK_ID,
    tokensWithAddresses,
    connector,
    miniMetadata: alephZero.miniMetadata,
  })

const balanceRow = (contract: string, address: string, value: string) => ({
  source: "substrate-psp22",
  status: "live",
  address,
  networkId: NETWORK_ID,
  tokenId: subPsp22TokenId(NETWORK_ID, contract),
  value,
})

describe("substrate-psp22 fetchBalances", () => {
  it("dry-runs balance_of from the owner, with no value and no gas or storage limits", async () => {
    // expected args: papi's ContractsApi.call codec over the full metadata + the ink! client's
    // balance_of message encoding
    const { send, connector } = makeConnector()

    await run(
      [
        [makeToken(USDT), [USDT_HOLDER, EMPTY]],
        [makeToken(USDC), [USDC_HOLDER]],
      ],
      connector
    )

    expect(send.mock.calls).toEqual([
      [NETWORK_ID, "state_call", ["ContractsApi_call", callOf("usdtHolder").argsHex]],
      [NETWORK_ID, "state_call", ["ContractsApi_call", callOf("emptyUsdt").argsHex]],
      [NETWORK_ID, "state_call", ["ContractsApi_call", callOf("usdcHolder").argsHex]],
    ])
  })

  it("decodes a zero balance", async () => {
    expect(callOf("emptyUsdt").expected).toEqual({ kind: "balance", balance: "0" })

    const result = await run([[makeToken(USDT), [EMPTY]]])

    expect(result).toEqual({ success: [balanceRow(USDT, EMPTY, "0")], errors: [] })
  })

  // bug: decodeBalance reads the first 16 bytes of MessageResult<u128> return data, Ok tag
  // included, so every non-zero balance comes out ×256 (and loses its top byte)
  it.fails.each([
    ["USDT", USDT, USDT_HOLDER, "usdtHolder"],
    ["USDC", USDC, USDC_HOLDER, "usdcHolder"],
  ])(
    "decodes the %s balance_of u128 after the MessageResult Ok tag",
    async (_, contract, holder, name) => {
      const result = await run([[makeToken(contract), [holder]]])

      expect(result).toEqual({
        success: [balanceRow(contract, holder, callOf(name).expected.balance!)],
        errors: [],
      })
    }
  )

  it("returns one balance per token and address", async () => {
    const result = await run([
      [makeToken(USDT), [USDT_HOLDER, EMPTY]],
      [makeToken(USDC), [USDC_HOLDER]],
    ])

    expect(result.errors).toEqual([])
    expect(result.success.map(({ address, tokenId }) => ({ address, tokenId }))).toEqual([
      { address: USDT_HOLDER, tokenId: subPsp22TokenId(NETWORK_ID, USDT) },
      { address: EMPTY, tokenId: subPsp22TokenId(NETWORK_ID, USDT) },
      { address: USDC_HOLDER, tokenId: subPsp22TokenId(NETWORK_ID, USDC) },
    ])
    expect(result.success[1]).toEqual(balanceRow(USDT, EMPTY, "0"))
  })

  it("reports a call to an account without a contract as an error, not a balance", async () => {
    // the runtime answers Err(Module(Contracts(ContractNotFound)))
    expect(callOf("notAContract").expected).toEqual({
      kind: "dispatchError",
      error: { type: "Module", value: { type: "Contracts", value: { type: "ContractNotFound" } } },
    })

    const result = await run([[makeToken(USDT_HOLDER), [EMPTY]]])

    expect(result.success).toEqual([])
    expect(result.errors.map((e) => e.error.message)).toEqual(["Failed to fetch balance"])
  })

  // bug: the thrown Error is not a BalanceFetchError, so the reducer's error.tokenId and
  // error.address are undefined and the failure can't be matched to its balance
  it.fails("names the token and address of a failed call in its error", async () => {
    const result = await run([[makeToken(USDT_HOLDER), [EMPTY]]])

    expect(result.errors.map(({ tokenId, address }) => ({ tokenId, address }))).toEqual([
      { tokenId: subPsp22TokenId(NETWORK_ID, USDT_HOLDER), address: EMPTY },
    ])
  })

  // bug: the REVERT flag is ignored, so the Err(LangError) return data 0x0101 decodes as balance 257
  it.fails("reports a reverted call as an error, not a balance", async () => {
    const revert = callOf("revert")
    expect(revert.expected).toEqual({ kind: "revert", flags: 1 })
    const { connector } = makeConnector(() => revert.resultHex)

    const result = await run([[makeToken(USDT), [USDT_HOLDER]]], connector)

    expect(result.success).toEqual([])
    expect(result.errors).toHaveLength(1)
  })

  it("keeps the other balances when one call is rejected", async () => {
    const { connector } = makeConnector((args) => {
      if (args === callOf("usdtHolder").argsHex) throw new Error("rpc down")
      return undefined
    })

    const result = await run([[makeToken(USDT), [USDT_HOLDER, EMPTY]]], connector)

    expect(result.success).toEqual([balanceRow(USDT, EMPTY, "0")])
    expect(result.errors.map((e) => e.error.message)).toEqual(["rpc down"])
  })

  it("reports an owner that is not a 32-byte account as an error without calling the chain", async () => {
    const { send, connector } = makeConnector()
    const evmAddress = "0x0000000000000000000000000000000000000001"

    const result = await run([[makeToken(USDT), [evmAddress, EMPTY]]], connector)

    expect(send).toHaveBeenCalledTimes(1)
    expect(result.success).toEqual([balanceRow(USDT, EMPTY, "0")])
    expect(result.errors.map((e) => e.error.message)).toEqual([`Invalid address: ${evmAddress}`])
  })

  it("returns nothing and sends nothing for an empty request", async () => {
    const { send, connector } = makeConnector()

    expect(await run([], connector)).toEqual({ success: [], errors: [] })
    expect(await run([[makeToken(USDT), []]], connector)).toEqual({ success: [], errors: [] })
    expect(send).not.toHaveBeenCalled()
  })
})
