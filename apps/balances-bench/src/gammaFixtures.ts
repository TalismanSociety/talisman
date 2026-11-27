import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import path from "node:path"
import { gzipSync } from "node:zlib"
import type { IChainConnectorDot } from "@talismn/chain-connectors"
import { fromHex, parseMetadataRpc, toHex } from "@talismn/scale"

import {
  connectFinney,
  FINNEY_ARCHIVE_RPC,
  FINNEY_RPC,
  fetchMetadataAt,
  findGammaAccounts,
} from "./gammaAccounts"
import { log } from "./log"

const FIXTURES_DIR = path.resolve(
  __dirname,
  "../../../packages/balances/src/modules/substrate-gamma/__fixtures__"
)

const LIVE_SPEC = 497
/** 487 never ran on finney: 486 upgraded straight to 488. */
const LAST_BLOCK_BY_OLDER_SPEC: Record<number, number> = {
  488: 9478216,
  493: 9570595,
  494: 9578499,
}

const SINGLE_DEPOSIT_COLDKEY = "5Fo2v1deBHBzANPFNHf9rCYfGcgSLy8PbPJUg4vwqCN1wzG3"
const SINGLE_DEPOSIT_HOTKEY = "5ExmGpDd1cziNENNaogDUA6RCNUvtp3aGjag53KRGEUokHns"

const RUNTIME_API = "GammaRuntimeApi"
const METHOD = "get_gamma_deposits_for_coldkey"

const write = (name: string, hex: string) => {
  writeFileSync(path.join(FIXTURES_DIR, name), gzipSync(fromHex(hex), { level: 9 }))
  log.log("wrote", name)
}

const record = async (
  connector: IChainConnectorDot,
  at: string,
  expectedSpec: number,
  coldkeys: string[]
) => {
  const { specVersion } = await connector.send<{ specVersion: number }>(
    "bittensor",
    "state_getRuntimeVersion",
    [at]
  )
  if (specVersion !== expectedSpec)
    throw new Error(`expected spec ${expectedSpec} at ${at}, got ${specVersion}`)

  const metadataRpc = await fetchMetadataAt(connector, at)
  write(`metadata-${specVersion}.scale.gz`, metadataRpc)

  const call = parseMetadataRpc(metadataRpc).builder.buildRuntimeCall(RUNTIME_API, METHOD)
  for (const coldkey of coldkeys) {
    const response = await connector.send<string>("bittensor", "state_call", [
      `${RUNTIME_API}_${METHOD}`,
      toHex(call.args.enc([coldkey])),
      at,
    ])
    write(`${specVersion}.${coldkey}.bin.gz`, response)
  }
  return metadataRpc
}

const writeCappedSynthetic = (metadataRpc: `0x${string}`) => {
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
  write("capped.synthetic.bin.gz", toHex(response))
}

const removeStaleResponses = (spec: number, coldkeys: string[]) => {
  const keep = new Set(coldkeys.map((coldkey) => `${spec}.${coldkey}.bin.gz`))
  for (const name of readdirSync(FIXTURES_DIR))
    if (name.startsWith(`${spec}.`) && !keep.has(name)) {
      rmSync(path.join(FIXTURES_DIR, name))
      log.log("removed", name)
    }
}

const recordArchive = async () => {
  const archive = connectFinney(FINNEY_ARCHIVE_RPC)
  try {
    for (const [spec, block] of Object.entries(LAST_BLOCK_BY_OLDER_SPEC)) {
      const at = await archive.send<string>("bittensor", "chain_getBlockHash", [block])
      const { coldkeys } = await findGammaAccounts(archive, at)
      const single = coldkeys["one deposit"]?.coldkey
      if (!single) throw new Error(`no single-deposit coldkey at spec ${spec}`)
      removeStaleResponses(Number(spec), [single])
      await record(archive, at, Number(spec), [single])
    }
  } catch (error) {
    log.warn(`skipped older specs: ${FINNEY_ARCHIVE_RPC} failed`, error)
  } finally {
    archive.destroy()
  }
}

const main = async () => {
  mkdirSync(FIXTURES_DIR, { recursive: true })

  const finney = connectFinney(FINNEY_RPC)
  try {
    const at = await finney.send<string>("bittensor", "chain_getFinalizedHead", [])
    const { blockNumber, coldkeys } = await findGammaAccounts(finney, at)
    log.log(`recording spec ${LIVE_SPEC} at block ${blockNumber} from ${FINNEY_RPC}`)

    const recorded = [
      ...new Set([
        SINGLE_DEPOSIT_COLDKEY,
        ...Object.values(coldkeys).flatMap((found) => (found ? [found.coldkey] : [])),
      ]),
    ].sort()
    removeStaleResponses(LIVE_SPEC, recorded)
    writeCappedSynthetic(await record(finney, at, LIVE_SPEC, recorded))
  } finally {
    finney.destroy()
  }

  await recordArchive()
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    log.error(error)
    process.exit(1)
  })
