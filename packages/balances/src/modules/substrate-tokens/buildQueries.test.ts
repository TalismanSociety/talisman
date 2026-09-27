import { AccountId } from "@polkadot-api/substrate-bindings"
import { type SubTokensToken, subTokensTokenId } from "@talismn/chaindata-provider"
import { describe, expect, it, vi } from "vitest"

import type { MiniMetadata } from "../../types"
import { acala } from "./__fixtures__/acala"
import { hydration } from "./__fixtures__/hydration"
import { buildQueries } from "./buildQueries"
import type { MiniMetadataExtra } from "./config"

vi.mock("../../log", () => ({
  default: { error: vi.fn(), warn: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

type Case = { address: string; onChainId: string | number; stateKey: string; keySource: string }

const ACALA_MINI = acala.miniMetadata as MiniMetadata<MiniMetadataExtra>
const HYDRATION_MINI = hydration.miniMetadata as MiniMetadata<MiniMetadataExtra>

const makeToken = (networkId: string, onChainId: string | number) =>
  ({
    id: subTokensTokenId(networkId, onChainId),
    type: "substrate-tokens",
    platform: "polkadot",
    networkId,
    onChainId,
    symbol: "TKN",
    decimals: 10,
    existentialDeposit: "0",
    isDefault: true,
  }) as SubTokensToken

const stateKeysFor = (
  networkId: string,
  miniMetadata: MiniMetadata<MiniMetadataExtra>,
  defs: Array<{ address: string; onChainId: string | number }>
) =>
  buildQueries(
    networkId,
    defs.map(({ address, onChainId }) => ({ token: makeToken(networkId, onChainId), address })),
    miniMetadata
  ).flatMap((query) => query.stateKeys)

const symbolOf = (onChainId: string | number) =>
  Object.entries(acala.tokens).find(([, id]) => id === onChainId)?.[0]

describe("substrate-tokens buildQueries", () => {
  // keySource "node": the key was listed by the node itself (state_getKeysPaged on the account prefix)
  // keySource "papi": the account holds no such currency, the key comes from papi with the full metadata
  it.each((acala.cases as Case[]).map((c) => ({ ...c, symbol: symbolOf(c.onChainId) })))(
    "builds the Acala Tokens.Accounts key for $symbol ($keySource) of $address",
    (c) => {
      expect(stateKeysFor("acala", ACALA_MINI, [c])).toEqual([c.stateKey])
    }
  )

  it.each(hydration.cases as Case[])(
    "builds the Hydration Tokens.Accounts key for numeric id $onChainId ($keySource) of $address",
    (c) => {
      expect(stateKeysFor("hydradx", HYDRATION_MINI, [c])).toEqual([c.stateKey])
    }
  )

  it("builds the same key whatever the SS58 prefix of the address", () => {
    const c = acala.cases[0] as Case
    const genericAddress = AccountId(42).dec(AccountId().enc(c.address))

    expect(stateKeysFor("acala", ACALA_MINI, [{ ...c, address: genericAddress }])).toEqual([
      c.stateKey,
    ])
  })

  it("accepts a numeric onChainId given as a string", () => {
    const c = hydration.cases.find((c) => c.onChainId === 1000795) as Case

    expect(stateKeysFor("hydradx", HYDRATION_MINI, [{ ...c, onChainId: "1000795" }])).toEqual([
      c.stateKey,
    ])
  })

  it("builds one query per def, in def order", () => {
    const defs = (acala.cases as Case[]).slice(0, 4)

    const queries = buildQueries(
      "acala",
      defs.map(({ address, onChainId }) => ({ token: makeToken("acala", onChainId), address })),
      ACALA_MINI
    )

    expect(queries.map((q) => q.stateKeys)).toEqual(defs.map((c) => [c.stateKey]))
  })

  it("drops a def whose onChainId is not a currency of the chain", () => {
    const c = acala.cases[0] as Case

    expect(
      stateKeysFor("acala", ACALA_MINI, [
        { address: c.address, onChainId: '{"type":"NotACurrency","value":1}' },
        { address: c.address, onChainId: 5 },
        c,
      ])
    ).toEqual([c.stateKey])
  })

  it("drops a def whose address is not an SS58 account", () => {
    const c = acala.cases[0] as Case

    expect(
      stateKeysFor("acala", ACALA_MINI, [
        { address: "0x0000000000000000000000000000000000000001", onChainId: c.onChainId },
        c,
      ])
    ).toEqual([c.stateKey])
  })

  it("reads the pallet from the mini metadata extra", () => {
    const c = acala.cases[0] as Case
    const miniMetadata = {
      ...ACALA_MINI,
      id: "substrate-tokens-other-pallet",
      extra: { palletId: "OrmlTokens" },
    }

    expect(stateKeysFor("acala", miniMetadata, [c])).toEqual([])
  })

  it("decodes a null storage value to zero free, reserved and frozen values", () => {
    const c = acala.cases[0] as Case
    const [query] = buildQueries(
      "acala",
      [{ token: makeToken("acala", c.onChainId), address: c.address }],
      ACALA_MINI
    )

    expect(query?.decodeResult([null])).toEqual({
      source: "substrate-tokens",
      status: "live",
      address: c.address,
      networkId: "acala",
      tokenId: subTokensTokenId("acala", c.onChainId),
      values: [
        { type: "free", label: "free", amount: "0" },
        { type: "reserved", label: "reserved", amount: "0" },
        { type: "locked", label: "frozen", amount: "0" },
      ],
    })
  })
})
