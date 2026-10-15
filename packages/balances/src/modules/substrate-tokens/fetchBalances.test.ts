import { AccountId } from "@polkadot-api/substrate-bindings"
import type { IChainConnectorDot } from "@talismn/chain-connectors"
import { type SubTokensToken, subTokensTokenId } from "@talismn/chaindata-provider"
import { describe, expect, it, vi } from "vitest"

import type { MiniMetadata } from "../../types"
import type { TokensWithAddresses } from "../../types/IBalanceModule"
import { acala } from "./__fixtures__/acala"
import { hydration } from "./__fixtures__/hydration"
import type { MiniMetadataExtra } from "./config"
import { fetchBalances } from "./fetchBalances"

vi.mock("../../log", () => ({
  default: { error: vi.fn(), warn: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

type Case = {
  address: string
  onChainId: string | number
  stateKey: string
  value: string | null
  expected: { free: string; reserved: string; frozen: string } | null
}
type Fixture = {
  networkId: string
  blockHash: string
  miniMetadata: MiniMetadata<MiniMetadataExtra>
  cases: Case[]
}

const ACALA = acala as Fixture
const HYDRATION = hydration as Fixture

const makeToken = (networkId: string, onChainId: string | number): SubTokensToken => ({
  id: subTokensTokenId(networkId, onChainId),
  type: "substrate-tokens",
  platform: "polkadot",
  networkId,
  onChainId,
  symbol: "TKN",
  decimals: 10,
  existentialDeposit: "0",
  isDefault: true,
})

/** answers state_queryStorageAt from the captured node responses, and rejects any other key */
const makeConnector = (fixture: Fixture) => {
  const valueByKey = new Map(fixture.cases.map((c) => [c.stateKey, c.value]))
  const send = vi.fn(async (_networkId: string, method: string, params: unknown[]) => {
    if (method !== "state_queryStorageAt") throw new Error(`unexpected method ${method}`)
    const [keys] = params as [string[]]
    return [
      {
        block: fixture.blockHash,
        changes: keys.map((key) => {
          if (!valueByKey.has(key)) throw new Error(`unexpected state key ${key}`)
          return [key, valueByKey.get(key)]
        }),
      },
    ]
  })
  return { send, connector: { send } as unknown as IChainConnectorDot }
}

const casesFor = (fixture: Fixture, addresses: string[], onChainIds: Array<string | number>) =>
  addresses.flatMap((address) =>
    onChainIds.map(
      (onChainId) =>
        fixture.cases.find((c) => c.address === address && c.onChainId === onChainId) as Case
    )
  )

const run = (
  fixture: Fixture,
  tokensWithAddresses: TokensWithAddresses,
  connector: IChainConnectorDot = makeConnector(fixture).connector,
  miniMetadata: MiniMetadata<MiniMetadataExtra> = fixture.miniMetadata
) =>
  fetchBalances({
    networkId: fixture.networkId,
    tokensWithAddresses,
    connector,
    miniMetadata,
  })

const expectedValues = (expected: Case["expected"]) => [
  { type: "free", label: "free", amount: expected?.free ?? "0" },
  { type: "reserved", label: "reserved", amount: expected?.reserved ?? "0" },
  { type: "locked", label: "frozen", amount: expected?.frozen ?? "0" },
]

const ACALA_TOKENS = acala.tokens
const ACALA_MULTI = acala.accounts.multiCurrency
const ACALA_FROZEN = acala.accounts.frozen

describe("substrate-tokens fetchBalances decoding", () => {
  it.each(
    ACALA.cases
      .filter((c) => c.expected !== null)
      .map((c) => ({
        ...c,
        symbol: Object.entries(ACALA_TOKENS).find(([, id]) => id === c.onChainId)?.[0],
      }))
  )("decodes the Acala $symbol account data of $address", async (c) => {
    const result = await run(ACALA, [[makeToken("acala", c.onChainId), [c.address]]])

    expect(result).toEqual({
      success: [
        {
          source: "substrate-tokens",
          status: "live",
          address: c.address,
          networkId: "acala",
          tokenId: subTokensTokenId("acala", c.onChainId),
          values: expectedValues(c.expected),
        },
      ],
      errors: [],
    })
  })

  it("reports a frozen amount as a locked value labelled frozen", async () => {
    const ldot = casesFor(ACALA, [ACALA_FROZEN], [ACALA_TOKENS.LDOT])[0]!
    expect(ldot.expected?.frozen).not.toBe("0")

    const result = await run(ACALA, [[makeToken("acala", ACALA_TOKENS.LDOT), [ACALA_FROZEN]]])

    expect(result.success[0]?.values).toEqual([
      { type: "free", label: "free", amount: ldot.expected?.free },
      { type: "reserved", label: "reserved", amount: "0" },
      { type: "locked", label: "frozen", amount: ldot.expected?.frozen },
    ])
  })

  it("keeps free and reserved apart for numeric currency ids (Hydration)", async () => {
    const dot = casesFor(HYDRATION, [hydration.accounts.freeAndReserved], [5])[0]!
    expect(dot.expected?.free).not.toBe(dot.expected?.reserved)
    expect(dot.expected?.reserved).not.toBe("0")

    const result = await run(HYDRATION, [[makeToken("hydradx", 5), [dot.address]]])

    expect(result.success[0]?.values).toEqual([
      { type: "free", label: "free", amount: dot.expected?.free },
      { type: "reserved", label: "reserved", amount: dot.expected?.reserved },
      { type: "locked", label: "frozen", amount: "0" },
    ])
  })

  it("decodes a u128 above 2^64 without losing precision", async () => {
    const sky = casesFor(HYDRATION, [hydration.accounts.reservedOnly], [1000795])[0]!
    expect(BigInt(sky.expected?.reserved ?? 0)).toBeGreaterThan(2n ** 64n)

    const result = await run(HYDRATION, [[makeToken("hydradx", 1000795), [sky.address]]])

    expect(result.success[0]?.values).toEqual(expectedValues(sky.expected))
  })

  it("decodes an existing all-zero storage entry (Hydration)", async () => {
    const zero = casesFor(HYDRATION, [hydration.accounts.reservedOnly], [670])[0]!
    expect(zero.value).toMatch(/^0x0+$/)

    const result = await run(HYDRATION, [[makeToken("hydradx", 670), [zero.address]]])

    expect(result.success[0]?.values).toEqual(expectedValues(null))
  })

  it("emits zero free, reserved and frozen values when the account has no storage entry", async () => {
    // IBTC (ForeignAsset 3) and USDCet (Erc20) are not held: the node returns null for both keys
    const result = await run(ACALA, [
      [makeToken("acala", ACALA_TOKENS.IBTC), [ACALA_MULTI]],
      [makeToken("acala", ACALA_TOKENS.USDCet), [ACALA_MULTI]],
    ])

    expect(result.errors).toEqual([])
    expect(result.success.map((b) => [b.tokenId, "values" in b && b.values])).toEqual([
      [subTokensTokenId("acala", ACALA_TOKENS.IBTC), expectedValues(null)],
      [subTokensTokenId("acala", ACALA_TOKENS.USDCet), expectedValues(null)],
    ])
  })

  it("fetches every token and address in one state_queryStorageAt call, in def order", async () => {
    const onChainIds = Object.values(ACALA_TOKENS)
    const addresses = [ACALA_MULTI, ACALA_FROZEN]
    const { send, connector } = makeConnector(ACALA)

    const result = await run(
      ACALA,
      onChainIds.map((id) => [makeToken("acala", id), addresses]),
      connector
    )

    // getBalanceDefs order: token by token, then address by address
    const defOrder = onChainIds.flatMap((id) => casesFor(ACALA, addresses, [id]))
    expect(send).toHaveBeenCalledTimes(1)
    expect(send).toHaveBeenCalledWith("acala", "state_queryStorageAt", [
      defOrder.map((c) => c.stateKey),
    ])
    expect(result.errors).toEqual([])
    expect(
      result.success.map((b) => ({
        address: b.address,
        tokenId: b.tokenId,
        values: "values" in b && b.values,
      }))
    ).toEqual(
      defOrder.map((c) => ({
        address: c.address,
        tokenId: subTokensTokenId("acala", c.onChainId),
        values: expectedValues(c.expected),
      }))
    )
  })

  it("keeps the requested address on the balance when it is given in another SS58 format", async () => {
    const genericAddress = AccountId(42).dec(AccountId().enc(ACALA_FROZEN))
    expect(genericAddress).not.toBe(ACALA_FROZEN)

    const result = await run(ACALA, [[makeToken("acala", ACALA_TOKENS.LDOT), [genericAddress]]])

    expect(result.success).toHaveLength(1)
    expect(result.success[0]?.address).toBe(genericAddress)
    expect(result.success[0]?.values).toEqual(
      expectedValues(casesFor(ACALA, [ACALA_FROZEN], [ACALA_TOKENS.LDOT])[0]!.expected)
    )
  })

  it("pins: an unencodable onChainId gets a zero row without a reserved value, not an error", async () => {
    // the key can't be built, so the def is dropped from the query and fetchBalances falls back
    // to its "no entry" row — which, unlike the null-storage row, has no reserved value
    const badToken = makeToken("acala", '{"type":"NotACurrency","value":1}')
    const { send, connector } = makeConnector(ACALA)

    const result = await run(
      ACALA,
      [
        [badToken, [ACALA_MULTI]],
        [makeToken("acala", ACALA_TOKENS.DOT), [ACALA_MULTI]],
      ],
      connector
    )

    const dot = casesFor(ACALA, [ACALA_MULTI], [ACALA_TOKENS.DOT])[0]!
    expect(send).toHaveBeenCalledWith("acala", "state_queryStorageAt", [[dot.stateKey]])
    expect(result.errors).toEqual([])
    expect(result.success).toEqual([
      {
        source: "substrate-tokens",
        status: "live",
        address: ACALA_MULTI,
        networkId: "acala",
        tokenId: badToken.id,
        values: [
          { type: "free", label: "free", amount: "0" },
          { type: "locked", label: "frozen", amount: "0" },
        ],
      },
      expect.objectContaining({
        tokenId: subTokensTokenId("acala", ACALA_TOKENS.DOT),
        values: expectedValues(dot.expected),
      }),
    ])
  })

  it("pins: an undecodable storage value becomes a zero balance", async () => {
    const dot = casesFor(ACALA, [ACALA_MULTI], [ACALA_TOKENS.DOT])[0]!
    const send = vi.fn(async () => [
      { block: ACALA.blockHash, changes: [[dot.stateKey, "0x0102"]] },
    ])

    const result = await run(ACALA, [[makeToken("acala", ACALA_TOKENS.DOT), [ACALA_MULTI]]], {
      send,
    } as unknown as IChainConnectorDot)

    expect(result.success[0]?.values).toEqual(expectedValues(null))
  })

  it("rejects when the node answers state_queryStorageAt with no result set", async () => {
    const send = vi.fn(async () => [])

    await expect(
      run(ACALA, [[makeToken("acala", ACALA_TOKENS.DOT), [ACALA_MULTI]]], {
        send,
      } as unknown as IChainConnectorDot)
    ).rejects.toThrow("Empty state_queryStorageAt response on acala")
  })
})

describe("substrate-tokens fetchBalances guards", () => {
  const token = makeToken("acala", ACALA_TOKENS.DOT)
  const defs: TokensWithAddresses = [[token, [ACALA_MULTI, ACALA_FROZEN]]]

  const expectErrorsForEveryDef = async (
    miniMetadata: MiniMetadata<MiniMetadataExtra>,
    message: string
  ) => {
    const { send, connector } = makeConnector(ACALA)
    const result = await run(ACALA, defs, connector, miniMetadata)

    expect(send).not.toHaveBeenCalled()
    expect(result.success).toEqual([])
    expect(
      result.errors.map((e) => ({
        tokenId: e.tokenId,
        address: e.address,
        message: e.error.message,
      }))
    ).toEqual([
      { tokenId: token.id, address: ACALA_MULTI, message },
      { tokenId: token.id, address: ACALA_FROZEN, message },
    ])
  }

  it("returns nothing and sends nothing for an empty request", async () => {
    const { send, connector } = makeConnector(ACALA)

    expect(await run(ACALA, [], connector)).toEqual({ success: [], errors: [] })
    expect(send).not.toHaveBeenCalled()
  })

  it("errors every def when the mini metadata has no data", () =>
    expectErrorsForEveryDef(
      { ...ACALA.miniMetadata, data: null },
      "Minimetadata is required for fetching balances"
    ))

  it("errors every def when the mini metadata belongs to another module", () =>
    expectErrorsForEveryDef(
      { ...ACALA.miniMetadata, source: "substrate-assets" },
      "Invalid request: miniMetadata source is not substrate-tokens"
    ))

  it("errors every def when the mini metadata belongs to another chain", () =>
    expectErrorsForEveryDef(
      { ...ACALA.miniMetadata, chainId: "karura" },
      "Invalid request: Expected chainId is acala"
    ))
})
