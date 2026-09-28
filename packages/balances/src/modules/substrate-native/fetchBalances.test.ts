import { readFileSync } from "node:fs"
import path from "node:path"
import { gunzipSync } from "node:zlib"

import type { IChainConnectorDot } from "@talismn/chain-connectors"
import { type SubNativeToken, subNativeTokenId } from "@talismn/chaindata-provider"
import { parseMetadataRpc } from "@talismn/scale"
import { u8aToHex } from "@talismn/util"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { AmountWithLabel, IBalance, MiniMetadata } from "../../types"
import { polkadotAssetHub as fixture } from "./__fixtures__/polkadotAssetHub"
import type { MiniMetadataExtra } from "./config"
import { fetchBalances } from "./fetchBalances"
import { getMiniMetadata } from "./getMiniMetadata"

vi.mock("../../log", () => ({
  default: { error: vi.fn(), warn: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

const NETWORK_ID = "polkadot-asset-hub"
const TOKEN: SubNativeToken = {
  id: subNativeTokenId(NETWORK_ID),
  type: "substrate-native",
  platform: "polkadot",
  networkId: NETWORK_ID,
  symbol: "DOT",
  decimals: 10,
  existentialDeposit: "100000000",
}

const FIXTURES_DIR = path.resolve(
  import.meta.dirname,
  "../../../../../apps/extension/tests/fixtures"
)
const METADATA_RPC =
  `0x${gunzipSync(readFileSync(path.join(FIXTURES_DIR, fixture.source.metadataFixture))).toString("hex")}` as const
const MINI_METADATA = getMiniMetadata({
  networkId: NETWORK_ID,
  specVersion: 2003001,
  metadataRpc: METADATA_RPC,
})

type NativeAccount = (typeof fixture.accounts)[keyof typeof fixture.accounts]
type PoolFixture = (typeof fixture.pools)[keyof typeof fixture.pools]
type Entry = { key: string; value: string | null }

const { poolMember, activeMember, directStaker, freezeHolder, emptyAccount } = fixture.accounts

const accountEntries = (account: NativeAccount): Entry[] => [
  account.entries.account,
  account.entries.locks,
  account.entries.freezes,
  account.entries.holds,
  account.entries.stakingLedger,
  account.entries.poolMembers,
]
const poolEntries = (pool: PoolFixture): Entry[] => [
  pool.entries.bondedPools,
  pool.entries.ledger,
  pool.entries.metadata,
]
const allEntries = [
  ...Object.values(fixture.accounts).flatMap(accountEntries),
  ...Object.values(fixture.pools).flatMap(poolEntries),
]
const keysOf = (entries: Entry[]) => entries.map(({ key }) => key)

/** a node serving the captured storage: state_queryStorageAt answers every key, null when absent */
const makeConnector = (overrides: Record<string, string | null> = {}) => {
  const storage = new Map<string, string | null>(allEntries.map(({ key, value }) => [key, value]))
  for (const [key, value] of Object.entries(overrides)) storage.set(key, value)

  const send = vi.fn(async (_networkId: string, method: string, params: unknown[]) => {
    if (method !== "state_queryStorageAt") throw new Error(`unexpected rpc ${method}`)
    const [keys] = params as [string[]]
    return [
      {
        block: fixture.source.blockHash,
        changes: keys.map((key) => [key, storage.get(key) ?? null]),
      },
    ]
  })
  return { connector: { send } as unknown as IChainConnectorDot, send }
}

const fetchNative = (
  addresses: string[],
  connector: IChainConnectorDot,
  miniMetadata: MiniMetadata<MiniMetadataExtra> = MINI_METADATA
) =>
  fetchBalances({
    networkId: NETWORK_ID,
    tokensWithAddresses: [[TOKEN, addresses]],
    connector,
    miniMetadata,
  })

const baseValues = (account: NativeAccount): AmountWithLabel<string>[] => {
  const data = account.entries.account.expected?.data
  return [
    { type: "free", label: "free", amount: data?.free ?? "0" },
    { type: "reserved", label: "reserved", amount: data?.reserved ?? "0" },
    { type: "locked", label: "misc", amount: data?.frozen ?? "0" },
    { type: "locked", label: "fees", amount: "0" },
  ]
}

const nativeBalance = (address: string, values: AmountWithLabel<string>[]): IBalance => ({
  source: "substrate-native",
  status: "live",
  address,
  networkId: NETWORK_ID,
  tokenId: TOKEN.id,
  values,
  useLegacyTransferableCalculation: false,
})

const poolOf = (member: NativeAccount) =>
  fixture.pools[String(member.entries.poolMembers.expected?.pool_id) as keyof typeof fixture.pools]

/** staking = points_to_balance runtime api, unbonding = member_total_balance - staking */
const nomPoolValues = (
  member: typeof poolMember | typeof activeMember
): AmountWithLabel<string>[] => {
  const pool = poolOf(member)
  const poolId = String(pool.poolId)
  const description = pool.entries.metadata.expectedText
  const staking = BigInt(member.runtimeApi.pointsToBalance)
  const unbonding = BigInt(member.runtimeApi.memberTotalBalance) - staking
  return [
    {
      source: "nompools-staking",
      type: "nompool",
      label: "nompools-staking",
      amount: staking.toString(),
      meta: { type: "nompool", poolId, description },
    },
    {
      source: "nompools-staking",
      type: "nompool",
      label: "nompools-unbonding",
      amount: unbonding.toString(),
      meta: { poolId, description, unbonding: true },
    },
  ]
}

describe("substrate-native fetchBalances", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("decodes a pool member with a governance lock, a delegated staking hold and an unbonding pool stake", async () => {
    const { connector, send } = makeConnector()
    const lock = poolMember.entries.locks.expected![0]!
    const hold = poolMember.entries.holds.expected![0]!

    const result = await fetchNative([poolMember.address], connector)

    expect(result).toEqual({
      success: [
        nativeBalance(poolMember.address, [
          ...baseValues(poolMember),
          {
            type: "locked",
            source: "substrate-native-locks",
            label: "democracy",
            meta: { id: lock.idText },
            amount: lock.amount,
          },
          {
            type: "locked",
            source: "substrate-native-holds",
            label: hold.id.type,
            amount: "0",
            meta: { amount: hold.amount },
          },
          ...nomPoolValues(poolMember),
        ]),
      ],
      errors: [],
    })
    expect(lock.idText).toBe("pyconvot")
    expect(hold.id.type).toBe("DelegatedStaking")
    expect(send.mock.calls).toEqual([
      [NETWORK_ID, "state_queryStorageAt", [keysOf(accountEntries(poolMember))]],
      [NETWORK_ID, "state_queryStorageAt", [keysOf(poolEntries(poolOf(poolMember)))]],
    ])
  })

  it("converts pool points to stake at the pool's points-to-balance ratio", async () => {
    const { connector } = makeConnector()
    const pool = poolOf(activeMember)
    // the one pool on chain whose points and bonded stake differ
    expect(pool.entries.bondedPools.expected.points).not.toBe(pool.entries.ledger.expected.active)

    const { success } = await fetchNative([activeMember.address], connector)

    expect(success[0]!.values).toEqual([
      ...baseValues(activeMember),
      {
        type: "locked",
        source: "substrate-native-holds",
        label: "DelegatedStaking",
        amount: "0",
        meta: { amount: activeMember.entries.holds.expected![0]!.amount },
      },
      ...nomPoolValues(activeMember),
    ])
  })

  it("sums a direct staker's unlocking chunks into one Unbonding lock", async () => {
    const { connector, send } = makeConnector()
    const ledger = directStaker.entries.stakingLedger.expected!
    const unlocking = ledger.unlocking.reduce((sum, chunk) => sum + BigInt(chunk.value), 0n)

    const { success } = await fetchNative([directStaker.address], connector)

    expect(success).toEqual([
      nativeBalance(directStaker.address, [
        ...baseValues(directStaker),
        {
          type: "locked",
          source: "substrate-native-holds",
          label: "Staking",
          amount: "0",
          meta: { amount: directStaker.entries.holds.expected![0]!.amount },
        },
        {
          type: "locked",
          source: "substrate-native-unbonding",
          label: "Unbonding",
          amount: unlocking.toString(),
        },
      ]),
    ])
    expect(unlocking).toBeGreaterThan(0n)
    // no pool membership: the nompool pass has no keys and never reaches the node
    expect(send).toHaveBeenCalledTimes(1)
  })

  it("sums several unlocking chunks, not the ledger total", async () => {
    const ledger = directStaker.entries.stakingLedger
    const ledgerCodec = parseMetadataRpc(METADATA_RPC).builder.buildStorage(
      "Staking",
      "Ledger"
    ).value
    const twoChunks = u8aToHex(
      ledgerCodec.enc({
        stash: ledger.expected!.stash,
        total: 800_000_000_000n,
        active: 100_000_000_000n,
        unlocking: [
          { value: 500_000_000_000n, era: 326 },
          { value: 200_000_000_000n, era: 327 },
        ],
      })
    )
    const { connector } = makeConnector({ [ledger.key]: twoChunks })

    const { success } = await fetchNative([directStaker.address], connector)

    expect(success[0]?.values).toContainEqual({
      type: "locked",
      source: "substrate-native-unbonding",
      label: "Unbonding",
      amount: "700000000000",
    })
  })

  it("labels a NominationPools freeze as other-nominationpools (current behaviour)", async () => {
    const { connector } = makeConnector()
    const freeze = freezeHolder.entries.freezes.expected![0]!
    vi.spyOn(console, "warn").mockImplementation(() => {})

    const { success } = await fetchNative([freezeHolder.address], connector)

    expect(success[0]!.values).toEqual([
      ...baseValues(freezeHolder),
      {
        type: "locked",
        source: "substrate-native-freezes",
        label: "other-nominationpools",
        amount: freeze.amount,
      },
    ])
    expect(freeze.id.type).toBe("NominationPools")
    // the empty Holds vec (0x00) adds no rows
    expect(freezeHolder.entries.holds.value).toBe("0x00")
  })

  it("emits zero base rows for an account with no storage", async () => {
    const { connector } = makeConnector()

    const { success, errors } = await fetchNative([emptyAccount.address], connector)

    expect(errors).toEqual([])
    expect(success).toEqual([
      nativeBalance(emptyAccount.address, [
        { type: "free", label: "free", amount: "0" },
        { type: "reserved", label: "reserved", amount: "0" },
        { type: "locked", label: "misc", amount: "0" },
        { type: "locked", label: "fees", amount: "0" },
      ]),
    ])
  })

  it("queries several addresses in one call, in request order", async () => {
    const { connector, send } = makeConnector()
    const addresses = [emptyAccount, poolMember, directStaker, activeMember]

    const { success } = await fetchNative(
      addresses.map(({ address }) => address),
      connector
    )

    expect(success.map(({ address }) => address)).toEqual(addresses.map(({ address }) => address))
    expect(success.map(({ values }) => values?.[0]?.amount)).toEqual(
      addresses.map((account) => baseValues(account)[0]!.amount)
    )
    expect(send.mock.calls).toEqual([
      [NETWORK_ID, "state_queryStorageAt", [keysOf(addresses.flatMap(accountEntries))]],
      [
        NETWORK_ID,
        "state_queryStorageAt",
        [keysOf([...poolEntries(poolOf(poolMember)), ...poolEntries(poolOf(activeMember))])],
      ],
    ])
  })

  // BUG: a pool without a NominationPools.Metadata entry (ValueQuery, absent until set) reads as
  // null, and `changes.includes(null)` then drops the member's whole pooled stake
  it.fails("keeps pooled stake when the pool has no metadata entry", async () => {
    const { connector } = makeConnector({ [poolOf(activeMember).entries.metadata.key]: null })

    const { success } = await fetchNative([activeMember.address], connector)

    expect(success[0]!.values).toContainEqual(
      expect.objectContaining({
        label: "nompools-staking",
        amount: activeMember.runtimeApi.pointsToBalance,
      })
    )
  })

  it("reports an unencodable address as a zero balance instead of an error (current behaviour)", async () => {
    const { connector, send } = makeConnector()

    const result = await fetchNative(["not-an-address"], connector)

    expect(result).toEqual({
      success: [
        nativeBalance("not-an-address", [
          { type: "free", label: "free", amount: "0" },
          { type: "reserved", label: "reserved", amount: "0" },
          { type: "locked", label: "misc", amount: "0" },
          { type: "locked", label: "fees", amount: "0" },
        ]),
      ],
      errors: [],
    })
    expect(send).not.toHaveBeenCalled()
  })

  it("returns nothing without querying when no token is requested", async () => {
    const { connector, send } = makeConnector()

    const result = await fetchBalances({
      networkId: NETWORK_ID,
      tokensWithAddresses: [],
      connector,
      miniMetadata: MINI_METADATA,
    })

    expect(result).toEqual({ success: [], errors: [] })
    expect(send).not.toHaveBeenCalled()
  })

  describe("rejects an unusable miniMetadata with one error per address", () => {
    const cases: Array<[string, MiniMetadata<MiniMetadataExtra>, string]> = [
      [
        "no data",
        { ...MINI_METADATA, data: null },
        "Minimetadata is required for fetching balances",
      ],
      [
        "another module's source",
        { ...MINI_METADATA, source: "substrate-assets" },
        "Invalid request: miniMetadata source is not substrate-native",
      ],
      [
        "another chain",
        { ...MINI_METADATA, chainId: "polkadot" },
        `Invalid request: Expected chainId is ${NETWORK_ID}`,
      ],
    ]

    it.each(cases)("%s", async (_, miniMetadata, message) => {
      const { connector, send } = makeConnector()

      const result = await fetchNative(
        [poolMember.address, emptyAccount.address],
        connector,
        miniMetadata
      )

      expect(result).toEqual({
        success: [],
        errors: [
          { tokenId: TOKEN.id, address: poolMember.address, error: new Error(message) },
          { tokenId: TOKEN.id, address: emptyAccount.address, error: new Error(message) },
        ],
      })
      expect(send).not.toHaveBeenCalled()
    })
  })

  it("throws when the miniMetadata data cannot be parsed", async () => {
    const { connector } = makeConnector()
    const corrupt = { ...MINI_METADATA, id: "corrupt-native-minimetadata", data: "0x00" as const }

    await expect(fetchNative([poolMember.address], connector, corrupt)).rejects.toThrow(
      `No network storage coders found for networkId: ${NETWORK_ID}`
    )
  })
})
