import { AccountId } from "@polkadot-api/substrate-bindings"
import type { IChainConnectorDot } from "@talismn/chain-connectors"
import { type SubHydrationToken, subHydrationTokenId } from "@talismn/chaindata-provider"
import { describe, expect, it, vi } from "vitest"

import type { MiniMetadata } from "../../types"
import type { TokensWithAddresses } from "../../types/IBalanceModule"
import { hydration } from "./__fixtures__/hydration"
import { fetchBalances } from "./fetchBalances"

vi.mock("../../log", () => ({
  default: { error: vi.fn(), warn: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

type Call = (typeof hydration.calls)[number]

const NETWORK_ID = "hydradx"
const MINI_METADATA = hydration.miniMetadata as MiniMetadata
const RESERVED_ONLY = hydration.accounts.reservedOnly
const FREE_AND_RESERVED = hydration.accounts.freeAndReserved

const callOf = (address: string) => hydration.calls.find((c) => c.address === address) as Call
const heldOf = (address: string, assetId: number) =>
  callOf(address).expected.find((b) => b.assetId === assetId)!

const makeToken = (onChainId: number): SubHydrationToken => ({
  id: subHydrationTokenId(NETWORK_ID, onChainId),
  type: "substrate-hydration",
  platform: "polkadot",
  networkId: NETWORK_ID,
  onChainId,
  assetType: "Token",
  isSufficient: true,
  symbol: `ASSET${onChainId}`,
  decimals: 12,
  existentialDeposit: "0",
  isDefault: true,
})

/** answers CurrenciesApi_accounts from the captured node responses, and rejects any other call */
const makeConnector = () => {
  const resultByArgs = new Map(hydration.calls.map((c) => [c.argsHex, c.resultHex]))
  const send = vi.fn(async (_networkId: string, method: string, params: unknown[]) => {
    const [api, args] = params as [string, string]
    if (method !== "state_call" || api !== "CurrenciesApi_accounts")
      throw new Error(`unexpected ${method} ${api}`)
    const result = resultByArgs.get(args)
    if (!result) throw new Error(`unexpected args ${args}`)
    return result
  })
  return { send, connector: { send } as unknown as IChainConnectorDot }
}

const run = (
  tokensWithAddresses: TokensWithAddresses,
  connector: IChainConnectorDot = makeConnector().connector,
  miniMetadata: MiniMetadata = MINI_METADATA
) => fetchBalances({ networkId: NETWORK_ID, tokensWithAddresses, connector, miniMetadata })

const expectedBalance = (address: string, assetId: number) => {
  const held = heldOf(address, assetId)
  return {
    address,
    networkId: NETWORK_ID,
    tokenId: subHydrationTokenId(NETWORK_ID, assetId),
    source: "substrate-hydration",
    status: "live",
    values: [
      { type: "free", label: "free", amount: held.free },
      { type: "reserved", label: "reserved", amount: held.reserved },
      { type: "locked", label: "frozen", amount: held.frozen },
    ],
  }
}

describe("substrate-hydration fetchBalances", () => {
  it("calls CurrenciesApi_accounts once per address, with the account id as argument", async () => {
    const { send, connector } = makeConnector()

    await run(
      [
        [makeToken(0), [RESERVED_ONLY, FREE_AND_RESERVED]],
        [makeToken(5), [RESERVED_ONLY, FREE_AND_RESERVED]],
        [makeToken(33), [RESERVED_ONLY]],
      ],
      connector
    )

    expect(send.mock.calls).toEqual([
      [NETWORK_ID, "state_call", ["CurrenciesApi_accounts", callOf(RESERVED_ONLY).argsHex]],
      [NETWORK_ID, "state_call", ["CurrenciesApi_accounts", callOf(FREE_AND_RESERVED).argsHex]],
    ])
  })

  it("decodes free, reserved and frozen for each requested asset the account holds", async () => {
    // HDX (0) carries the native frozen amount, 1000795 free + reserved, 33 and 222 reserved only
    expect(heldOf(RESERVED_ONLY, 0).frozen).not.toBe("0")

    const result = await run([
      [makeToken(0), [RESERVED_ONLY]],
      [makeToken(1000795), [RESERVED_ONLY]],
      [makeToken(33), [RESERVED_ONLY]],
      [makeToken(222), [RESERVED_ONLY]],
    ])

    expect(result).toEqual({
      success: [
        expectedBalance(RESERVED_ONLY, 0),
        expectedBalance(RESERVED_ONLY, 1000795),
        expectedBalance(RESERVED_ONLY, 33),
        expectedBalance(RESERVED_ONLY, 222),
      ],
      errors: [],
    })
  })

  it("emits a row for an asset the chain returns with an all-zero balance", async () => {
    expect(heldOf(RESERVED_ONLY, 670)).toEqual({
      assetId: 670,
      free: "0",
      reserved: "0",
      frozen: "0",
    })

    const result = await run([[makeToken(670), [RESERVED_ONLY]]])

    expect(result.success).toEqual([expectedBalance(RESERVED_ONLY, 670)])
  })

  it("emits no row and no error for a requested asset the account does not hold", async () => {
    // the runtime api only lists held assets: asset 5 is absent for this account
    expect(callOf(RESERVED_ONLY).expected.map((b) => b.assetId)).not.toContain(5)

    const result = await run([[makeToken(5), [RESERVED_ONLY, FREE_AND_RESERVED]]])

    expect(result).toEqual({ success: [expectedBalance(FREE_AND_RESERVED, 5)], errors: [] })
  })

  it("ignores held assets that were not requested", async () => {
    const result = await run([[makeToken(15), [RESERVED_ONLY]]])

    expect(callOf(RESERVED_ONLY).expected.length).toBeGreaterThan(1)
    expect(result.success).toEqual([expectedBalance(RESERVED_ONLY, 15)])
  })

  it("keys each row by its own address when several addresses hold the same asset", async () => {
    const result = await run([[makeToken(0), [RESERVED_ONLY, FREE_AND_RESERVED]]])

    expect(heldOf(RESERVED_ONLY, 0).free).not.toBe(heldOf(FREE_AND_RESERVED, 0).free)
    expect(result.success).toEqual([
      expectedBalance(RESERVED_ONLY, 0),
      expectedBalance(FREE_AND_RESERVED, 0),
    ])
  })

  it("keeps the requested address on the balance when it is given in another SS58 format", async () => {
    const genericAddress = AccountId(42).dec(AccountId().enc(FREE_AND_RESERVED))
    expect(genericAddress).not.toBe(FREE_AND_RESERVED)
    const { send, connector } = makeConnector()

    const result = await run([[makeToken(5), [genericAddress]]], connector)

    expect(send).toHaveBeenCalledWith(NETWORK_ID, "state_call", [
      "CurrenciesApi_accounts",
      callOf(FREE_AND_RESERVED).argsHex,
    ])
    expect(result.success).toEqual([
      { ...expectedBalance(FREE_AND_RESERVED, 5), address: genericAddress },
    ])
  })

  it("errors every def when one of the runtime calls fails", async () => {
    const { send, connector } = makeConnector()
    send.mockImplementation(async (_networkId, _method, params) => {
      const [, args] = params as [string, string]
      if (args === callOf(FREE_AND_RESERVED).argsHex) throw new Error("rpc down")
      return callOf(RESERVED_ONLY).resultHex
    })

    const result = await run([[makeToken(0), [RESERVED_ONLY, FREE_AND_RESERVED]]], connector)

    expect(result.success).toEqual([])
    expect(
      result.errors.map((e) => ({
        tokenId: e.tokenId,
        address: e.address,
        message: e.error.message,
      }))
    ).toEqual([
      {
        tokenId: subHydrationTokenId(NETWORK_ID, 0),
        address: RESERVED_ONLY,
        message: `Failed to fetch balance for ${RESERVED_ONLY} on ${NETWORK_ID}`,
      },
      {
        tokenId: subHydrationTokenId(NETWORK_ID, 0),
        address: FREE_AND_RESERVED,
        message: `Failed to fetch balance for ${FREE_AND_RESERVED} on ${NETWORK_ID}`,
      },
    ])
  })

  it("pins: one address that is not an SS58 account fails every def of the batch", async () => {
    const { connector } = makeConnector()

    const result = await run(
      [[makeToken(0), [RESERVED_ONLY, "0x0000000000000000000000000000000000000001"]]],
      connector
    )

    expect(result.success).toEqual([])
    expect(result.errors.map((e) => e.address)).toEqual([
      RESERVED_ONLY,
      "0x0000000000000000000000000000000000000001",
    ])
  })

  it("errors every def when the runtime call result cannot be decoded", async () => {
    const { send, connector } = makeConnector()
    send.mockResolvedValue("0x04")

    const result = await run([[makeToken(0), [RESERVED_ONLY]]], connector)

    expect(result.success).toEqual([])
    expect(result.errors.map((e) => e.error.message)).toEqual([
      `Failed to fetch balance for ${RESERVED_ONLY} on ${NETWORK_ID}`,
    ])
  })
})

describe("substrate-hydration fetchBalances guards", () => {
  const token = makeToken(0)
  const defs: TokensWithAddresses = [[token, [RESERVED_ONLY, FREE_AND_RESERVED]]]

  const expectErrorsForEveryDef = async (miniMetadata: MiniMetadata, message: string) => {
    const { send, connector } = makeConnector()
    const result = await run(defs, connector, miniMetadata)

    expect(send).not.toHaveBeenCalled()
    expect(result.success).toEqual([])
    expect(
      result.errors.map((e) => ({
        tokenId: e.tokenId,
        address: e.address,
        message: e.error.message,
      }))
    ).toEqual([
      { tokenId: token.id, address: RESERVED_ONLY, message },
      { tokenId: token.id, address: FREE_AND_RESERVED, message },
    ])
  }

  it("returns nothing and sends nothing for an empty request", async () => {
    const { send, connector } = makeConnector()

    expect(await run([], connector)).toEqual({ success: [], errors: [] })
    expect(send).not.toHaveBeenCalled()
  })

  it("errors every def when the mini metadata has no data", () =>
    expectErrorsForEveryDef(
      { ...MINI_METADATA, data: null },
      "Minimetadata is required for fetching balances"
    ))

  it("errors every def when the mini metadata belongs to another module", () =>
    expectErrorsForEveryDef(
      { ...MINI_METADATA, source: "substrate-tokens" },
      "Invalid request: miniMetadata source is not substrate-hydration"
    ))

  it("errors every def when the mini metadata belongs to another chain", () =>
    expectErrorsForEveryDef(
      { ...MINI_METADATA, chainId: "basilisk" },
      "Invalid request: Expected chainId is hydradx"
    ))
})
