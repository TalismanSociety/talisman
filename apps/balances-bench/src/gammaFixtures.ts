import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import path from "node:path"
import { gzipSync } from "node:zlib"
import type { IChainConnectorDot } from "@talismn/chain-connectors"
import { fromHex, parseMetadataRpc, toHex } from "@talismn/scale"

import { connectFinney, FINNEY_ARCHIVE_RPC, FINNEY_RPC, fetchMetadataAt } from "./gammaAccounts"
import { log } from "./log"

const FIXTURES_DIR = path.resolve(
  __dirname,
  "../../../packages/balances/src/modules/substrate-gamma/__fixtures__"
)

const SINGLE_DEPOSIT_COLDKEY = "5Fo2v1deBHBzANPFNHf9rCYfGcgSLy8PbPJUg4vwqCN1wzG3"
const SINGLE_DEPOSIT_HOTKEY = "5ExmGpDd1cziNENNaogDUA6RCNUvtp3aGjag53KRGEUokHns"

const LIVE = {
  spec: 497,
  coldkeys: [
    SINGLE_DEPOSIT_COLDKEY,
    "5CLWmDjLwkDtLQ86y9aiwfzrUCrtnnSWS9oEXianj2jMDCAo",
    "5DbyUgRHKtebU6QwbyNpYHiUqLDAZ9xHo12A84U9ER228JDM",
  ],
}
const OLDER_SPECS = [
  { spec: 488, block: 9478216, coldkeys: ["5GeRaijjCS9pHHgHFid4MuAqMRtW1imS7arBuxeQRvgSgzyC"] },
]

const RUNTIME_API = "GammaRuntimeApi"
const METHOD = "get_gamma_deposits_for_coldkey"
const CAPPED_SYNTHETIC = "capped.synthetic.bin.gz"

const metadataName = (spec: number) => `metadata-${spec}.scale.gz`
const responseName = (spec: number, coldkey: string) => `${spec}.${coldkey}.bin.gz`
const SPEC_FILE = /^(metadata-)?\d+\./
const EXPECTED = new Set(
  [LIVE, ...OLDER_SPECS].flatMap(({ spec, coldkeys }) => [
    metadataName(spec),
    ...coldkeys.map((coldkey) => responseName(spec, coldkey)),
  ])
)

type Fixtures = Map<string, string>

const record = async (
  connector: IChainConnectorDot,
  at: string,
  { spec, coldkeys }: { spec: number; coldkeys: string[] },
  fixtures: Fixtures
) => {
  const { specVersion } = await connector.send<{ specVersion: number }>(
    "bittensor",
    "state_getRuntimeVersion",
    [at]
  )
  if (specVersion !== spec) throw new Error(`expected spec ${spec} at ${at}, got ${specVersion}`)

  const metadataRpc = await fetchMetadataAt(connector, at)
  fixtures.set(metadataName(spec), metadataRpc)

  const call = parseMetadataRpc(metadataRpc).builder.buildRuntimeCall(RUNTIME_API, METHOD)
  for (const coldkey of coldkeys)
    fixtures.set(
      responseName(spec, coldkey),
      await connector.send<string>("bittensor", "state_call", [
        `${RUNTIME_API}_${METHOD}`,
        toHex(call.args.enc([coldkey])),
        at,
      ])
    )
  return metadataRpc
}

const cappedSynthetic = (metadataRpc: `0x${string}`) => {
  const call = parseMetadataRpc(metadataRpc).builder.buildRuntimeCall(RUNTIME_API, METHOD)
  const response = call.value.enc([
    {
      netuid: 25,
      hotkey: SINGLE_DEPOSIT_HOTKEY,
      deposit: {
        coldkey: SINGLE_DEPOSIT_COLDKEY,
        balance: 154770370n,
        daily_spend_cap: { cap: 100000000n, bucket: [0n, 9597000n] },
      },
      spendable: 100000000n,
    },
  ])
  return toHex(response)
}

const recordLive = async (fixtures: Fixtures) => {
  const finney = connectFinney(FINNEY_RPC)
  try {
    const at = await finney.send<string>("bittensor", "chain_getFinalizedHead", [])
    log.log(`recording spec ${LIVE.spec} at ${at} from ${FINNEY_RPC}`)
    fixtures.set(CAPPED_SYNTHETIC, cappedSynthetic(await record(finney, at, LIVE, fixtures)))
  } finally {
    finney.destroy()
  }
}

const recordArchive = async (fixtures: Fixtures) => {
  const archive = connectFinney(FINNEY_ARCHIVE_RPC)
  try {
    const hashes = await Promise.all(
      OLDER_SPECS.map(({ block }) =>
        archive.send<string>("bittensor", "chain_getBlockHash", [block])
      )
    ).catch((error) => {
      log.warn(`skipped older specs: ${FINNEY_ARCHIVE_RPC} is unreachable`, error)
      return null
    })
    if (!hashes) return
    for (const [i, older] of OLDER_SPECS.entries())
      await record(archive, hashes[i], older, fixtures)
  } finally {
    archive.destroy()
  }
}

const writeFixtures = (fixtures: Fixtures) => {
  for (const [name, hex] of fixtures) {
    writeFileSync(path.join(FIXTURES_DIR, name), gzipSync(fromHex(hex), { level: 9 }))
    log.log("wrote", name)
  }
  for (const name of readdirSync(FIXTURES_DIR))
    if (SPEC_FILE.test(name) && !EXPECTED.has(name)) {
      rmSync(path.join(FIXTURES_DIR, name))
      log.log("removed", name)
    }
}

const main = async () => {
  const fixtures: Fixtures = new Map()
  await recordLive(fixtures)
  await recordArchive(fixtures)
  mkdirSync(FIXTURES_DIR, { recursive: true })
  writeFixtures(fixtures)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    log.error(error)
    process.exit(1)
  })
