import type { BittensorValidator } from "@core/domains/bittensor/exports"
import type { Account } from "@core/domains/keyring/exports"
import { type AmountWithLabel, type BalanceJson, Balances } from "@talismn/balances"
import {
  type SubDTaoToken,
  subDTaoTokenId,
  subNativeTokenId,
  type Token,
} from "@talismn/chaindata-provider"
import { newTokenRates } from "@talismn/token-rates"
import { shortenAddress } from "@ui/util/shortenAddress"
import type { TFunction } from "i18next"
import { describe, expect, it } from "vitest"

import { parseBittensorPositionRoute } from "./bittensorPositionRoute"
import {
  type BittensorStakePositionContext,
  toBittensorStakePositions,
  toEarnPosition,
} from "./bittensorStakePosition"

const NETWORK_ID = "bittensor"
const OWNER = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
const WATCHED = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty"
const STRANGER = "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y"
const HOTKEY = "5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy"
const TAO = 10n ** 9n

const t = ((key: string, options?: Record<string, unknown>) =>
  key.replace(/{{(\w+)}}/g, (_, name) => String(options?.[name]))) as unknown as TFunction

const dtaoToken = (netuid: number, hotkey?: string, networkId = NETWORK_ID): SubDTaoToken => ({
  id: subDTaoTokenId(networkId, netuid, hotkey),
  type: "substrate-dtao",
  platform: "polkadot",
  networkId,
  netuid,
  hotkey,
  isDefault: true,
  isTransferable: true,
  symbol: netuid === 0 ? "TAO" : "α",
  decimals: 9,
  name: netuid === 0 ? "SN0 | Root TAO" : `SN${netuid} | Affine α`,
  subnetName: netuid === 0 ? "Root" : "Affine",
})

const ROOT = dtaoToken(0, HOTKEY)
const SUBNET_BASE = dtaoToken(120)
const SUBNET = dtaoToken(120, HOTKEY)
const TESTNET_SUBNET = dtaoToken(120, HOTKEY, "some-other-chain")

const balanceJson = (
  address: string,
  token: SubDTaoToken,
  values: AmountWithLabel<string>[]
): BalanceJson => ({
  address,
  networkId: token.networkId,
  tokenId: token.id,
  source: "substrate-dtao",
  status: "live",
  values,
})

const free = (amount: bigint, meta?: unknown): AmountWithLabel<string> => ({
  type: "free",
  label: "Staking",
  amount: amount.toString(),
  ...(meta ? { meta } : {}),
})

const claimable = (amount: bigint): AmountWithLabel<string>[] => [
  {
    type: "locked",
    label: "Claimable rewards",
    amount: amount.toString(),
    includeInTransferable: true,
  },
  { type: "extra", label: "Claimable rewards", amount: amount.toString(), includeInTotal: true },
]

const convictionLock = (amount: bigint): AmountWithLabel<string> => ({
  type: "locked",
  label: "Decaying Conviction Lock",
  amount: amount.toString(),
  meta: { convictionLock: { type: "conviction-lock", hotkey: HOTKEY, lockType: "decaying" } },
})

const makeBalances = (jsons: BalanceJson[]) =>
  new Balances(jsons, {
    tokens: Object.fromEntries(
      [ROOT, SUBNET_BASE, SUBNET, TESTNET_SUBNET].map((token) => [token.id, token as Token])
    ),
    tokenRates: {
      [ROOT.id]: { ...newTokenRates(), usd: { price: 300 } },
      [SUBNET.id]: { ...newTokenRates(), usd: { price: 2 } },
    },
  })

const ctx: BittensorStakePositionContext = {
  bittensorNetworkIds: [NETWORK_ID],
  accountsByAddress: {
    [OWNER]: { type: "keypair", address: OWNER } as Account,
    [WATCHED]: { type: "watch-only", address: WATCHED } as Account,
  },
  validatorsByHotkey: { [HOTKEY]: { hotkey: HOTKEY, name: "Yuma" } as BittensorValidator },
}

describe("toBittensorStakePositions", () => {
  it("derives a root position with claimable rewards and a root stake hold", () => {
    const balances = makeBalances([
      balanceJson(OWNER, ROOT, [
        free(2n * TAO, { rootStakeHold: { type: "root-stake-hold", unlockAtBlock: 1234 } }),
        ...claimable(TAO),
      ]),
    ])

    const [position, ...rest] = toBittensorStakePositions(balances, ctx)

    expect(rest).toEqual([])
    expect(position).toMatchObject({
      kind: "root",
      address: OWNER,
      hotkey: HOTKEY,
      netuid: 0,
      tokenId: ROOT.id,
      groupTokenId: subNativeTokenId(NETWORK_ID),
      validatorName: "Yuma",
      stake: 2n * TAO,
      claimable: TAO,
      stakeUsd: 600,
      claimableUsd: 300,
      totalUsd: 900,
      lock: { kind: "root-stake-hold", unlockAtBlock: 1234 },
      canSign: true,
    })
  })

  it("attaches the subnet conviction lock from the base token and never lists the base token", () => {
    const balances = makeBalances([
      balanceJson(OWNER, SUBNET_BASE, [free(0n), convictionLock(5n * TAO)]),
      balanceJson(OWNER, SUBNET, [free(10n * TAO)]),
    ])

    const positions = toBittensorStakePositions(balances, ctx)

    expect(positions).toHaveLength(1)
    expect(positions[0]).toMatchObject({
      kind: "subnet",
      tokenId: SUBNET.id,
      groupTokenId: SUBNET_BASE.id,
      claimable: 0n,
      totalUsd: 20,
      lock: { kind: "conviction-lock", amount: 5n * TAO, label: "Decaying Conviction Lock" },
    })
  })

  it("hides a ghost conviction lock that locks no stake", () => {
    const balances = makeBalances([
      balanceJson(OWNER, SUBNET_BASE, [free(0n), convictionLock(0n)]),
      balanceJson(OWNER, SUBNET, [free(10n * TAO)]),
    ])

    expect(toBittensorStakePositions(balances, ctx)[0].lock).toBeNull()
  })

  it("keeps a fully unstaked root pair while it has rewards to claim, drops empty pairs", () => {
    const balances = makeBalances([
      balanceJson(OWNER, ROOT, [free(0n), ...claimable(TAO)]),
      balanceJson(OWNER, SUBNET, [free(0n)]),
    ])

    const positions = toBittensorStakePositions(balances, ctx)

    expect(positions).toHaveLength(1)
    expect(positions[0]).toMatchObject({ kind: "root", stake: 0n, claimable: TAO })
  })

  it("marks watch-only positions as unsignable and drops unknown accounts and other networks", () => {
    const balances = makeBalances([
      balanceJson(WATCHED, ROOT, [free(TAO)]),
      balanceJson(STRANGER, ROOT, [free(TAO)]),
      balanceJson(OWNER, TESTNET_SUBNET, [free(TAO)]),
    ])

    const positions = toBittensorStakePositions(balances, ctx)

    expect(positions).toHaveLength(1)
    expect(positions[0]).toMatchObject({ address: WATCHED, canSign: false })
  })
})

describe("toEarnPosition", () => {
  const rowAction = { kind: "claim" as const, label: "Claim", onClick: () => {} }

  it("maps a root position to a TAO row with its APY, lock label and row action", () => {
    const [position] = toBittensorStakePositions(
      makeBalances([
        balanceJson(OWNER, ROOT, [
          free(TAO, { rootStakeHold: { type: "root-stake-hold", unlockAtBlock: 1 } }),
          ...claimable(TAO),
        ]),
      ]),
      ctx
    )

    const earnPosition = toEarnPosition({ position, apy: 5, rowAction, subtitleIcon: null, t })

    expect(earnPosition).toMatchObject({
      title: "TAO Staking",
      tokenIds: [subNativeTokenId(NETWORK_ID)],
      displayTokens: [{ tokenId: subNativeTokenId(NETWORK_ID), symbol: "TAO" }],
      apr: 5,
      rateType: "APY",
      isReadOnly: false,
      subtitle: { label: "Yuma", icon: null },
      lock: { label: "Root stake is temporarily locked after staking or claiming" },
      rowAction,
    })
    expect(earnPosition.detailUrl).toBe(
      `/earn/positions/bittensor/${encodeURIComponent(ROOT.id)}/${OWNER}`
    )
  })

  it("maps a subnet position to its alpha token, without a rate until the APY is known", () => {
    const [position] = toBittensorStakePositions(
      makeBalances([
        balanceJson(OWNER, SUBNET_BASE, [free(0n), convictionLock(5n * TAO)]),
        balanceJson(WATCHED, SUBNET, [free(10n * TAO)]),
        balanceJson(OWNER, SUBNET, [free(10n * TAO)]),
      ]),
      { ...ctx, validatorsByHotkey: {} }
    ).filter((p) => p.address === OWNER)

    const earnPosition = toEarnPosition({
      position,
      apy: null,
      rowAction: null,
      subtitleIcon: null,
      t,
    })

    expect(earnPosition).toMatchObject({
      title: "SN120 | Affine α",
      tokenIds: [SUBNET_BASE.id],
      displayTokens: [{ tokenId: SUBNET_BASE.id, symbol: "α" }],
      apr: null,
      rateType: null,
      subtitle: { label: shortenAddress(HOTKEY) },
      lock: {
        label: "Decaying Conviction Lock: 5 α of your stake on this subnet cannot be unstaked",
      },
    })
  })

  it("marks watch-only rows as read only", () => {
    const [position] = toBittensorStakePositions(
      makeBalances([balanceJson(WATCHED, SUBNET, [free(TAO)])]),
      ctx
    )

    expect(
      toEarnPosition({ position, apy: null, rowAction: null, subtitleIcon: null, t }).isReadOnly
    ).toBe(true)
  })
})

describe("parseBittensorPositionRoute", () => {
  it("accepts only hotkey-bearing dtao token ids", () => {
    expect(parseBittensorPositionRoute(SUBNET.id, OWNER)).toEqual({
      tokenId: SUBNET.id,
      address: OWNER,
    })
    expect(parseBittensorPositionRoute(SUBNET_BASE.id, OWNER)).toBeNull()
    expect(parseBittensorPositionRoute(subNativeTokenId(NETWORK_ID), OWNER)).toBeNull()
    expect(parseBittensorPositionRoute(SUBNET.id, undefined)).toBeNull()
  })
})
