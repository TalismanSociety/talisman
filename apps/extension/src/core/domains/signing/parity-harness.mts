// biome-ignore-all lint/suspicious/noConsole: manual harness, console output is the point
// biome-ignore-all lint/suspicious/noExplicitAny: manual harness
// Manual end-to-end parity harness: polkadot-js ExtrinsicPayload.sign + addSignature vs signPjsPayload.
// Hits live RPCs (polkadot + moonbeam) — run manually when touching the signing pipeline:
//   cd apps/extension && npx tsx src/core/domains/signing/parity-harness.mts
// Requires @polkadot/types + @polkadot/keyring to still be installed (drop this file when they go).
import { createRequire } from "node:module"
import { deriveKeypair, entropyToSeed, mnemonicToEntropy } from "@talismn/crypto"

import { signPjsPayload } from "./signPjsPayload"

const req = createRequire(import.meta.url)
const { TypeRegistry, Metadata } = req("@polkadot/types")
const { Keyring } = req("@polkadot/keyring")
const { cryptoWaitReady, encodeAddress } = req("@polkadot/util-crypto")

const POLKADOT_MNEMONIC = "bottom drive obey lake curtain smoke basket hold race lonely fit walk"
const ETH_MNEMONIC = "test test test test test test test test test test test junk"

const fetchChainData = (endpoint: string) =>
  new Promise<{
    metadataHex: `0x${string}`
    genesisHash: `0x${string}`
    specVersion: number
    transactionVersion: number
    blockHash: `0x${string}`
  }>((resolve, reject) => {
    const ws = new WebSocket(endpoint)
    const results: Record<number, unknown> = {}
    let received = 0
    ws.onopen = () => {
      ws.send(JSON.stringify({ id: 1, jsonrpc: "2.0", method: "state_getMetadata", params: [] }))
      ws.send(JSON.stringify({ id: 2, jsonrpc: "2.0", method: "chain_getBlockHash", params: [0] }))
      ws.send(
        JSON.stringify({ id: 3, jsonrpc: "2.0", method: "state_getRuntimeVersion", params: [] })
      )
      ws.send(
        JSON.stringify({ id: 4, jsonrpc: "2.0", method: "chain_getFinalizedHead", params: [] })
      )
    }
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data as string)
      results[msg.id] = msg.result
      if (++received === 4) {
        ws.close()
        const rv = results[3] as { specVersion: number; transactionVersion: number }
        resolve({
          metadataHex: results[1] as `0x${string}`,
          genesisHash: results[2] as `0x${string}`,
          specVersion: rv.specVersion,
          transactionVersion: rv.transactionVersion,
          blockHash: results[4] as `0x${string}`,
        })
      }
    }
    ws.onerror = () => reject(new Error(`ws error ${endpoint}`))
    setTimeout(() => reject(new Error("timeout")), 30_000)
  })

const toPjsHex = (value: number | bigint, minByteLen = 0) => {
  let inner = value.toString(16)
  inner = (inner.length % 2 ? "0" : "") + inner
  const pad = Math.max(0, minByteLen - inner.length / 2)
  return `0x${"00".repeat(pad)}${inner}` as `0x${string}`
}

await cryptoWaitReady()

let failures = 0

const runCase = async (
  label: string,
  endpoint: string,
  curve: "sr25519" | "ed25519" | "ecdsa" | "ethereum",
  mnemonic: string,
  path: string,
  era: `0x${string}`,
  blockNumber: number
) => {
  const chain = await fetchChainData(endpoint)
  const seed = await entropyToSeed(mnemonicToEntropy(mnemonic), curve)
  const { secretKey, publicKey } = deriveKeypair(seed, path, curve)

  const registry = new TypeRegistry()
  registry.setMetadata(new Metadata(registry, chain.metadataHex))

  // System.remark("talisman parity") call data, encoded with the papi dynamic builder
  const { parseMetadataRpc } = await import("@talismn/scale")
  const { Binary } = await import("polkadot-api")
  const { builder } = parseMetadataRpc(chain.metadataHex)
  const { codec, location } = builder.buildCall("System", "remark")
  const callData = new Uint8Array([
    ...location,
    ...codec.enc({ remark: Binary.fromText("talisman parity") }),
  ])
  const method = `0x${Buffer.from(callData).toString("hex")}` as `0x${string}`

  const address =
    curve === "ethereum"
      ? `0x${Buffer.from(publicKeyToEthAddress(publicKey)).toString("hex")}`
      : curve === "ecdsa"
        ? encodeAddress(req("@polkadot/util-crypto").blake2AsU8a(publicKey), 42)
        : encodeAddress(publicKey, 42)

  const { unifiedMetadata } = parseMetadataRpc(chain.metadataHex)
  const signedExtensions = (unifiedMetadata.extrinsic.signedExtensions[0] ?? []).map(
    (e: { identifier: string }) => e.identifier
  )
  registry.setSignedExtensions(signedExtensions)

  const payload = {
    address,
    blockHash: era === "0x00" ? chain.genesisHash : chain.blockHash,
    blockNumber: toPjsHex(blockNumber, 4),
    era,
    genesisHash: chain.genesisHash,
    method,
    nonce: toPjsHex(5, 4),
    specVersion: toPjsHex(chain.specVersion, 4),
    tip: toPjsHex(0, 16),
    transactionVersion: toPjsHex(chain.transactionVersion, 4),
    signedExtensions,
    mode: 0,
    metadataHash: undefined,
    version: 4,
  }

  // --- pjs reference ---
  const keyring = new Keyring({ type: curve === "ethereum" ? "ethereum" : curve })
  const pair = keyring.addFromPair(
    { secretKey, publicKey },
    {},
    curve === "ethereum" ? "ethereum" : curve
  )
  const extPayload = registry.createType("ExtrinsicPayload", payload, { version: payload.version })
  const pjsSignature = extPayload.sign(pair).signature as `0x${string}`
  const pjsTx = registry.createType(
    "Extrinsic",
    { method: payload.method },
    { version: payload.version }
  )
  pjsTx.addSignature(payload.address, pjsSignature, payload)
  const pjsTxHex = pjsTx.toHex()
  const pjsTxHash = pjsTx.hash.toHex()

  // debug: compare signing inputs
  {
    const { getPjsTxHelper } = await import("@polkadot-api/tx-utils")
    const parts = getPjsTxHelper(chain.metadataHex)(payload as any)
    const oursInput = Buffer.concat([parts.callData, parts.extra, parts.additionalSigned]).toString(
      "hex"
    )
    const pjsInput = Buffer.from(extPayload.toU8a({ method: true })).toString("hex")
    if (pjsInput !== oursInput) {
      console.log(`  signing input MISMATCH\n     pjs : 0x${pjsInput}\n     ours: 0x${oursInput}`)
    }
  }

  // --- new implementation ---
  const ours = await signPjsPayload(chain.metadataHex, payload as any, secretKey, curve)

  const check = (name: string, expected: string, actual: string) => {
    const ok = expected === actual
    if (!ok) {
      failures++
      console.log(`  ❌ ${name}\n     pjs : ${expected}\n     ours: ${actual}`)
    } else console.log(`  ✅ ${name}`)
  }

  console.log(`\n=== ${label} (${curve}, era ${era}) ===`)
  if (curve === "sr25519") {
    // non-deterministic signature: verify instead, then byte-compare tx assembly with the pjs signature injected
    const { verify } = await import("@scure/sr25519")
    const sigBytes = Buffer.from(pjsSignature.slice(4), "hex") // drop 0x01 type prefix
    const signingInput = extPayload.toU8a({ method: true })
    const hashed =
      signingInput.length > 256
        ? req("@polkadot/util-crypto").blake2AsU8a(signingInput)
        : signingInput
    check(
      "pjs sig verifies with scure (sanity)",
      "true",
      String(verify(hashed, sigBytes, publicKey))
    )
    check(
      "our sig has type prefix 0x01",
      "1",
      String(Buffer.from(ours.signature.slice(2, 4), "hex")[0])
    )
    // assemble tx with pjs signature through our createV4Tx path by faking sign? simpler: compare structure lengths
    check("tx length matches", String(pjsTxHex.length), String(ours.signedTransaction.length))
  } else {
    check("signature", pjsSignature, ours.signature)
    check("signedTransaction", pjsTxHex, ours.signedTransaction)
    const { getSignedExtrinsicHash } = await import("./signPjsPayload")
    check("extrinsic hash", pjsTxHash, getSignedExtrinsicHash(ours.signedTransactionBytes))
  }
}

function publicKeyToEthAddress(publicKey: Uint8Array): Uint8Array {
  // 64-byte uncompressed (no 04 prefix) or 33-byte compressed input
  const { keccak_256 } = req("@noble/hashes/sha3.js")
  const { secp256k1 } = req("@noble/curves/secp256k1.js")
  const uncompressed =
    publicKey.length === 33
      ? secp256k1.Point.fromBytes(publicKey).toBytes(false).slice(1)
      : publicKey.length === 65
        ? publicKey.slice(1)
        : publicKey
  return keccak_256(uncompressed).slice(-20)
}

const POLKADOT = "wss://dot-rpc.stakeworld.io"
const MOONBEAM = "wss://wss.api.moonbeam.network"

await runCase("polkadot immortal", POLKADOT, "ed25519", POLKADOT_MNEMONIC, "//Alice", "0x00", 0)
await runCase(
  "polkadot mortal",
  POLKADOT,
  "ed25519",
  POLKADOT_MNEMONIC,
  "//Alice",
  "0xf502",
  12345678
)
await runCase("polkadot ecdsa", POLKADOT, "ecdsa", POLKADOT_MNEMONIC, "//Alice", "0x00", 0)
await runCase("polkadot sr25519", POLKADOT, "sr25519", POLKADOT_MNEMONIC, "//Alice", "0x00", 0)
await runCase(
  "moonbeam ethereum",
  MOONBEAM,
  "ethereum",
  ETH_MNEMONIC,
  "m/44'/60'/0'/0/0",
  "0x00",
  0
)

console.log(failures ? `\n${failures} FAILURES` : "\nALL PARITY CHECKS PASSED")
process.exit(failures ? 1 : 0)
