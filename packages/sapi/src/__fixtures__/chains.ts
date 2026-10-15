import { readFileSync } from "node:fs"
import path from "node:path"
import { gunzipSync } from "node:zlib"

import type { SignerPayloadJSON } from "../pjsInterop"
import { getScaleApi, type ScaleApi } from "../sapi"
import type { JsonRpcRequestSend } from "../types"

type FixtureChain = "polkadot" | "moonbeam" | "assethub"

type ParityFixture = {
  name: string
  chain: FixtureChain
  payload: SignerPayloadJSON
  signedTransaction: `0x${string}`
}

// shared with the extension's polkadot-js signing parity tests; only used from within the monorepo
const extensionFixturesDir = path.resolve(
  import.meta.dirname,
  "../../../../apps/extension/tests/fixtures"
)

export const PARITY_FIXTURES = JSON.parse(
  readFileSync(path.join(extensionFixturesDir, "pjs-signing-parity.json"), "utf8")
) as ParityFixture[]

export const getParityFixture = (name: string) => {
  const fixture = PARITY_FIXTURES.find((f) => f.name === name)
  if (!fixture) throw new Error(`Unknown parity fixture: ${name}`)
  return structuredClone(fixture)
}

const metadataCache = new Map<FixtureChain, `0x${string}`>()

export const getMetadata = (chain: FixtureChain): `0x${string}` => {
  const cached = metadataCache.get(chain)
  if (cached) return cached

  const gzipped = readFileSync(path.join(extensionFixturesDir, `${chain}-metadata-v15.scale.gz`))
  const hex = `0x${gunzipSync(gzipped).toString("hex")}` as const
  metadataCache.set(chain, hex)
  return hex
}

export const TOKENS: Record<FixtureChain, { symbol: string; decimals: number }> = {
  polkadot: { symbol: "DOT", decimals: 10 },
  moonbeam: { symbol: "GLMR", decimals: 18 },
  assethub: { symbol: "DOT", decimals: 10 },
}

const rejectSend: JsonRpcRequestSend = async (method) => {
  throw new Error(`Unexpected rpc call: ${method}`)
}

type TestScaleApiOptions = {
  send?: JsonRpcRequestSend
  hasCheckMetadataHash?: boolean
}

export const getTestScaleApi = (
  chain: FixtureChain,
  { send = rejectSend, hasCheckMetadataHash = false }: TestScaleApiOptions = {}
): ScaleApi =>
  getScaleApi({ chainId: chain, send }, getMetadata(chain), TOKENS[chain], hasCheckMetadataHash)

type RpcCall = { method: string; params: unknown[]; isCacheable?: boolean }

export const createRpcStub = (respond: (method: string, params: unknown[]) => unknown) => {
  const calls: RpcCall[] = []
  const send: JsonRpcRequestSend = async (method, params, isCacheable) => {
    calls.push({ method, params, isCacheable })
    return respond(method, params)
  }
  return { send, calls }
}
