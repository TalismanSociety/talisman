import { ed25519 } from "@noble/curves/ed25519.js"
import { merkleizeMetadata } from "@polkadot-api/merkleize-metadata"
import { getSs58AddressInfo } from "polkadot-api"

import { expect } from "../fixtures"
import { liveRpc } from "./chains"
import { exchange, hardened } from "./emulator"
import {
  emulatorStopped,
  type LedgerDappWindow,
  ledgerSuite,
  rejectedOnDevice,
  type SigningCase,
  wrongAppOpen,
} from "./suite"

type InjectedWindow = Window & {
  injectedWeb3?: {
    talisman?: {
      enable: (origin: string) => Promise<{
        accounts: { get: () => Promise<{ address: string }[]> }
        signer: Record<string, (params: unknown) => Promise<unknown>>
      }>
    }
  }
}

const bytes = (hex: string) => Uint8Array.from(Buffer.from(hex.replace(/^0x/, ""), "hex"))
const toHex = (value: Uint8Array) => Buffer.from(value).toString("hex")
const u32 = (value: number) => {
  const encoded = Buffer.alloc(4)
  encoded.writeUInt32LE(value)
  return toHex(encoded)
}

const publicKey = (address: string) => {
  const info = getSs58AddressInfo(address)
  if (!info.isValid) throw new Error(`not an ss58 address: ${address}`)
  return info.publicKey
}

const TEXT = "Talisman Ledger emulator e2e"

// The Ledger app decodes a transaction with a proof of the runtime metadata, so the extrinsic
// is one for the live Polkadot relay chain: its runtime version and metadata come from there.
const POLKADOT = {
  genesisHash: "0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3",
  specName: "polkadot",
  tokenSymbol: "DOT",
  decimals: 10,
  base58Prefix: 0,
  signedExtensions: [
    "CheckNonZeroSender",
    "CheckSpecVersion",
    "CheckTxVersion",
    "CheckGenesis",
    "CheckMortality",
    "CheckNonce",
    "CheckWeight",
    "ChargeTransactionPayment",
    "PrevalidateAttests",
    "CheckMetadataHash",
  ],
}

// System.remark(TEXT): pallet 0, call 0, then the text as a SCALE byte vector
const REMARK = `0x0000${(TEXT.length << 2).toString(16).padStart(2, "0")}${toHex(Buffer.from(TEXT))}`

type ExtrinsicPayload = {
  address: string
  blockHash: string
  genesisHash: string
  method: string
  specVersion: string
  transactionVersion: string
}

const extrinsic: SigningCase = {
  name: "an extrinsic",
  request: async ({ address }) => {
    const { specVersion, transactionVersion } = await liveRpc<{
      specVersion: number
      transactionVersion: number
    }>("polkadot", "state_getRuntimeVersion")
    return {
      method: "signPayload",
      params: {
        address,
        // immortal, so the block the era counts from is the genesis block
        era: "0x00",
        blockHash: POLKADOT.genesisHash,
        blockNumber: "0x0",
        genesisHash: POLKADOT.genesisHash,
        method: REMARK,
        nonce: "0x0",
        tip: "0x0",
        specVersion: `0x${specVersion.toString(16)}`,
        transactionVersion: `0x${transactionVersion.toString(16)}`,
        signedExtensions: POLKADOT.signedExtensions,
        version: 4,
        withSignedTransaction: true,
      },
    }
  },
  verify: async (result, call, { address }) => {
    const payload = call.params as ExtrinsicPayload
    const { signature, signedTransaction } = result as {
      signature: string
      signedTransaction: string
    }
    const specVersion = Number(payload.specVersion)
    const metadata = await liveRpc<string>("polkadot", "state_call", [
      "Metadata_metadata_at_version",
      `0x${u32(15)}`,
    ])
    const metadataHash = merkleizeMetadata(bytes(metadata), { ...POLKADOT, specVersion }).digest()

    // What the chain checks the signature against: the call, then the value of each signed
    // extension (era, nonce, tip, metadata hash mode), then what each one adds implicitly.
    const signed = bytes(
      [
        payload.method,
        "00", // immortal era
        "00", // nonce 0
        "00", // tip 0
        "01", // the metadata hash is signed
        u32(specVersion),
        u32(Number(payload.transactionVersion)),
        payload.genesisHash,
        payload.blockHash,
        "01", // Some(metadata hash)
        toHex(metadataHash),
      ]
        .map((part) => part.replace(/^0x/, ""))
        .join("")
    )

    const [scheme, ...ed25519Signature] = bytes(signature)
    expect(scheme, "MultiSignature::Ed25519").toBe(0)
    expect(ed25519.verify(Uint8Array.from(ed25519Signature), signed, publicKey(address))).toBe(true)
    expect(signedTransaction).toContain(signature.slice(2))
    expect(signedTransaction.endsWith(REMARK.slice(2))).toBe(true)
  },
}

const rawMessage: SigningCase = {
  name: "a raw message",
  request: ({ address }) => ({
    method: "signRaw",
    params: { address, data: `0x${toHex(Buffer.from(TEXT))}`, type: "bytes" },
  }),
  verify: (result, _call, { address }) => {
    const { signature } = result as { signature: string }
    const signed = Uint8Array.from(Buffer.from(`<Bytes>${TEXT}</Bytes>`))
    expect(ed25519.verify(bytes(signature), signed, publicKey(address))).toBe(true)
  },
}

ledgerSuite({
  app: "polkadot",
  // @zondax/ledger-substrate generic app: GET_ADDR, ed25519, m/44'/354'/0'/0'/0', ss58 prefix 42
  deviceAccountZero: async () => {
    const path = Buffer.alloc(20)
    for (const [i, index] of [44, 354, 0, 0, 0].entries())
      path.writeUInt32LE(hardened(index), i * 4)
    const payload = Buffer.concat([path, Buffer.from([42, 0])])
    const response = await exchange(
      `f9010000${payload.length.toString(16).padStart(2, "0")}${payload.toString("hex")}`
    )
    return response.subarray(32).toString("ascii")
  },
  installDapp: () => {
    const injected = (window as InjectedWindow).injectedWeb3?.talisman
    if (!injected) return false
    let enabled: ReturnType<typeof injected.enable> | undefined
    ;(window as LedgerDappWindow).ledgerDapp = {
      connect: async () => {
        enabled = injected.enable("Ledger emulator dapp")
        const accounts = await (await enabled).accounts.get()
        return accounts.map((account) => account.address)
      },
      send: async ({ method, params }) => (await enabled)?.signer[method](params),
    }
    return true
  },
  signing: [extrinsic, rawMessage],
  errorSigning: rawMessage,
  errors: [rejectedOnDevice, wrongAppOpen("polkadot", "ethereum"), emulatorStopped("polkadot")],
})
