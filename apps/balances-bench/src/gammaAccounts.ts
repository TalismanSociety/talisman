import { ChainConnectorDotStub, type IChainConnectorDot } from "@talismn/chain-connectors"
import type { DotNetwork } from "@talismn/chaindata-provider"
import { fetchBestMetadata } from "@talismn/sapi"
import { getStorageKeyPrefix, type MetadataBuilder, parseMetadataRpc } from "@talismn/scale"

import { log } from "./log"

const FINNEY_RPC = "wss://entrypoint-finney.opentensor.ai:443"
export const FINNEY_ARCHIVE_RPC = "wss://archive.chain.opentensor.ai:443"

export const connectFinney = (rpc: string) =>
  new ChainConnectorDotStub({ id: "bittensor", rpcs: [rpc] } as unknown as DotNetwork)

export const fetchMetadataAt = (connector: IChainConnectorDot, at: string) =>
  fetchBestMetadata((method, params) => connector.send("bittensor", method, [...params, at]), false)

const CATEGORIES = [
  "one deposit",
  "two or more deposits on one subnet",
  "deposits on two or more subnets",
  "a deposit with a daily cap below its balance",
  "a deposit with cap 0",
  "funds a hotkey it does not own",
] as const
type Category = (typeof CATEGORIES)[number]

type StoredDeposit = {
  netuid: number
  hotkey: string
  balance: bigint
  cap: bigint | undefined
  ownedByColdkey: boolean
}

const PAGE_SIZE = 1000

const fetchAllKeys = async (connector: IChainConnectorDot, prefix: string, at: string) => {
  const keys: string[] = []
  for (;;) {
    const page = await connector.send<string[]>("bittensor", "state_getKeysPaged", [
      prefix,
      PAGE_SIZE,
      keys.at(-1) ?? null,
      at,
    ])
    keys.push(...page)
    if (page.length < PAGE_SIZE) return keys
  }
}

const fetchValues = async (connector: IChainConnectorDot, keys: string[], at: string) => {
  if (!keys.length) return new Map<string, string | null>()
  const [{ changes }] = await connector.send<Array<{ changes: Array<[string, string | null]> }>>(
    "bittensor",
    "state_queryStorageAt",
    [keys, at]
  )
  return new Map(changes)
}

const fetchStoredDeposits = async (
  connector: IChainConnectorDot,
  builder: MetadataBuilder,
  at: string
): Promise<Map<string, StoredDeposit[]>> => {
  const depositsStorage = builder.buildStorage("SubtensorModule", "GammaDeposits")
  const ownerStorage = builder.buildStorage("SubtensorModule", "Owner")

  const depositKeys = await fetchAllKeys(
    connector,
    getStorageKeyPrefix("SubtensorModule", "GammaDeposits"),
    at
  )
  const depositValues = await fetchValues(connector, depositKeys, at)

  const rows = depositKeys.map((key) => {
    const [netuid, hotkey] = depositsStorage.keys.dec(key) as [number, string]
    const deposit = depositsStorage.value.dec(depositValues.get(key)!) as {
      coldkey: string
      balance: bigint
      daily_spend_cap?: { cap: bigint }
    }
    return { netuid, hotkey, deposit }
  })

  const hotkeys = [...new Set(rows.map((row) => row.hotkey))]
  const ownerKeys = hotkeys.map((hotkey) => ownerStorage.keys.enc(hotkey))
  const ownerValues = await fetchValues(connector, ownerKeys, at)
  const ownerByHotkey = new Map(
    hotkeys.map((hotkey, i) => {
      const value = ownerValues.get(ownerKeys[i])
      return [hotkey, value ? (ownerStorage.value.dec(value) as string) : null]
    })
  )

  const byColdkey = new Map<string, StoredDeposit[]>()
  for (const { netuid, hotkey, deposit } of rows) {
    const deposits = byColdkey.get(deposit.coldkey) ?? []
    deposits.push({
      netuid,
      hotkey,
      balance: deposit.balance,
      cap: deposit.daily_spend_cap?.cap,
      ownedByColdkey: ownerByHotkey.get(hotkey) === deposit.coldkey,
    })
    byColdkey.set(deposit.coldkey, deposits)
  }
  return byColdkey
}

const MATCHERS: Record<Category, (deposits: StoredDeposit[]) => boolean> = {
  "one deposit": (deposits) => deposits.length === 1,
  "two or more deposits on one subnet": (deposits) =>
    deposits.some((a) => deposits.filter((b) => b.netuid === a.netuid).length >= 2),
  "deposits on two or more subnets": (deposits) =>
    new Set(deposits.map((deposit) => deposit.netuid)).size >= 2,
  "a deposit with a daily cap below its balance": (deposits) =>
    deposits.some(({ cap, balance }) => cap !== undefined && cap > 0n && cap < balance),
  "a deposit with cap 0": (deposits) => deposits.some(({ cap }) => cap === 0n),
  "funds a hotkey it does not own": (deposits) =>
    deposits.some(({ ownedByColdkey }) => !ownedByColdkey),
}

type GammaAccounts = {
  blockNumber: number
  specVersion: number
  depositCount: number
  coldkeys: Record<Category, { coldkey: string; candidates: number } | null>
}

const findGammaAccounts = async (
  connector: IChainConnectorDot,
  at: string
): Promise<GammaAccounts> => {
  const [header, { specVersion }, metadataRpc] = await Promise.all([
    connector.send<{ number: string }>("bittensor", "chain_getHeader", [at]),
    connector.send<{ specVersion: number }>("bittensor", "state_getRuntimeVersion", [at]),
    fetchMetadataAt(connector, at),
  ])
  const byColdkey = await fetchStoredDeposits(connector, parseMetadataRpc(metadataRpc).builder, at)
  const sorted = [...byColdkey.entries()].sort(([a], [b]) => (a < b ? -1 : 1))

  const coldkeys = Object.fromEntries(
    CATEGORIES.map((category) => {
      const matches = sorted.filter(([, deposits]) => MATCHERS[category](deposits))
      return [
        category,
        matches.length ? { coldkey: matches[0][0], candidates: matches.length } : null,
      ]
    })
  ) as GammaAccounts["coldkeys"]

  return {
    blockNumber: Number.parseInt(header.number, 16),
    specVersion,
    depositCount: sorted.reduce((sum, [, deposits]) => sum + deposits.length, 0),
    coldkeys,
  }
}

const main = async () => {
  const connector = connectFinney(FINNEY_RPC)
  try {
    const at = await connector.send<string>("bittensor", "chain_getFinalizedHead", [])
    const { blockNumber, specVersion, depositCount, coldkeys } = await findGammaAccounts(
      connector,
      at
    )
    log.log(`block ${blockNumber} (${at}) spec ${specVersion}, ${depositCount} GammaDeposits`)
    for (const category of CATEGORIES) {
      const found = coldkeys[category]
      log.log(
        `${category}: ${found ? `${found.coldkey} (${found.candidates} candidates)` : "none on chain"}`
      )
    }
  } finally {
    connector.destroy()
  }
}

if (require.main === module)
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      log.error(error)
      process.exit(1)
    })
