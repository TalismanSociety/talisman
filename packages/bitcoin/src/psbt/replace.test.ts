import { hex } from "@scure/base"
import { NETWORK, Transaction } from "@scure/btc-signer"
import {
  deriveKeypair,
  entropyToSeed,
  getBitcoinOrdinalsBasePath,
  getBitcoinPaymentsBasePath,
  mnemonicToEntropy,
} from "@talismn/crypto"
import { describe, expect, it } from "vitest"

import type { BitcoinUtxo } from "../types"
import { buildTransferPsbt, type PsbtAccountMeta } from "./buildTransferPsbt"
import { finalizeAndExtract } from "./finalize"
import { buildReplacementPsbt, type ReplaceAddressInfo, reconstructReplaceContext } from "./replace"
import { signPsbtWithKeys } from "./sign"

const MNEMONIC =
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"

const FAKE_TXID = "75ddabb27b8845f5247975c8a5ba7c6f336c4570708ebe230caf6db5217ae858"

const getFixtures = async () => {
  const seed = await entropyToSeed(mnemonicToEntropy(MNEMONIC), "bitcoin-ecdsa")
  const paymentsPath = getBitcoinPaymentsBasePath(0)
  const key = (path: string) => deriveKeypair(seed, path, "bitcoin-ecdsa")

  const recipient = key(`${getBitcoinPaymentsBasePath(1)}/0/0`).address
  const p0 = key(`${paymentsPath}/0/0`)
  const p1 = key(`${paymentsPath}/0/1`)
  const change0 = key(`${paymentsPath}/1/0`)
  const change1 = key(`${paymentsPath}/1/1`)

  const account: PsbtAccountMeta = {
    masterFingerprint: "0x73c5da0a",
    trees: [
      { tree: "payments", derivationPath: paymentsPath },
      { tree: "ordinals", derivationPath: getBitcoinOrdinalsBasePath(0) },
    ],
  }

  // funding transaction paying our two receive addresses — serves as the prev tx
  const funding = new Transaction({ allowUnknownInputs: true })
  funding.addInput({ txid: FAKE_TXID, index: 0 })
  funding.addOutputAddress(p0.address, 100_000n, NETWORK)
  funding.addOutputAddress(p1.address, 60_000n, NETWORK)
  const fundingHex = hex.encode(funding.unsignedTx)
  const fundingTxid = Transaction.fromRaw(funding.unsignedTx, {
    allowUnknownInputs: true,
    disableScriptCheck: true,
  }).id

  const utxos: BitcoinUtxo[] = [
    {
      txid: fundingTxid,
      vout: 0,
      valueSats: 100_000n,
      confirmations: 3,
      address: p0.address,
      addressType: "p2wpkh",
      tree: "payments",
      change: 0,
      index: 0,
      publicKey: p0.publicKey,
    },
    {
      txid: fundingTxid,
      vout: 1,
      valueSats: 60_000n,
      confirmations: 3,
      address: p1.address,
      addressType: "p2wpkh",
      tree: "payments",
      change: 0,
      index: 1,
      publicKey: p1.publicKey,
    },
  ]

  const keysByAddress = new Map(
    [p0, p1, change0, change1].map((k) => [k.address, k.secretKey] as const)
  )
  const keysByUtxo = (selected: BitcoinUtxo[]) =>
    selected.map((utxo, inputIndex) => {
      const secretKey = keysByAddress.get(utxo.address)
      if (!secretKey) throw new Error("no key for utxo")
      return { inputIndex, secretKey }
    })

  const ourAddresses = new Map<string, ReplaceAddressInfo>([
    [
      p0.address,
      { addressType: "p2wpkh", tree: "payments", change: 0, index: 0, publicKey: p0.publicKey },
    ],
    [
      p1.address,
      { addressType: "p2wpkh", tree: "payments", change: 0, index: 1, publicKey: p1.publicKey },
    ],
    [
      change0.address,
      {
        addressType: "p2wpkh",
        tree: "payments",
        change: 1,
        index: 0,
        publicKey: change0.publicKey,
      },
    ],
    [
      change1.address,
      {
        addressType: "p2wpkh",
        tree: "payments",
        change: 1,
        index: 1,
        publicKey: change1.publicKey,
      },
    ],
  ])

  const getTxHex = async (txid: string) => {
    if (txid === fundingTxid) return fundingHex
    throw new Error(`Unknown txid ${txid}`)
  }

  // the "pending" transaction to replace: p0+p1 → recipient 120k + change
  const built = buildTransferPsbt({
    utxos,
    recipient,
    amountSats: 120_000n,
    feeRateSatVb: 2,
    changeAddress: change0.address,
    network: "bitcoin",
    account,
    lockTimeHeight: 899_000,
  })
  const signed = signPsbtWithKeys(built.psbt, keysByUtxo(built.selectedUtxos))
  const original = finalizeAndExtract(signed)

  return {
    account,
    recipient,
    utxos,
    keysByUtxo,
    ourAddresses,
    getTxHex,
    built,
    original,
    changeAddress: change0.address,
    freshChangeAddress: change1.address,
  }
}

describe("reconstructReplaceContext", () => {
  it("recovers inputs, outputs, change and fee from the broadcast hex", async () => {
    const fx = await getFixtures()
    const context = await reconstructReplaceContext(
      fx.getTxHex,
      fx.original.txHex,
      fx.ourAddresses,
      "bitcoin"
    )

    expect(context.inputs).toHaveLength(2)
    expect(context.inputs.reduce((a, u) => a + u.valueSats, 0n)).toEqual(160_000n)
    expect(context.oldFeeSats).toEqual(fx.built.feeSats)
    expect(context.vsize).toEqual(fx.original.vsize)
    expect(context.externalOutputs).toEqual([{ address: fx.recipient, amountSats: 120_000n }])
    expect(context.changeOutput?.address).toEqual(fx.changeAddress)
  })

  it("recovers a p2wpkh public key from the witness when the address book has none", async () => {
    const fx = await getFixtures()
    // blank out the public keys, as for a WIF account
    const blank = new Map(
      [...fx.ourAddresses].map(([address, info]) => [
        address,
        { ...info, publicKey: new Uint8Array(0) },
      ])
    )
    const context = await reconstructReplaceContext(
      fx.getTxHex,
      fx.original.txHex,
      blank,
      "bitcoin"
    )
    expect(context.inputs.every((u) => u.publicKey.length === 33)).toBe(true)
  })

  it("rejects transactions with foreign inputs", async () => {
    const fx = await getFixtures()
    const onlyOne = new Map([...fx.ourAddresses].slice(0, 1))
    await expect(
      reconstructReplaceContext(fx.getTxHex, fx.original.txHex, onlyOne, "bitcoin")
    ).rejects.toThrow(/does not belong/)
  })
})

describe("buildReplacementPsbt", () => {
  it("speed-up preserves recipient outputs and pays the fee from change", async () => {
    const fx = await getFixtures()
    const context = await reconstructReplaceContext(
      fx.getTxHex,
      fx.original.txHex,
      fx.ourAddresses,
      "bitcoin"
    )

    const bumped = buildReplacementPsbt({
      context,
      type: "speed-up",
      feeRateSatVb: 10,
      network: "bitcoin",
      selfAddress: fx.freshChangeAddress,
      account: fx.account,
      lockTimeHeight: 899_001,
    })

    // BIP125: strictly more fee than the original, plus the relay increment
    expect(bumped.feeSats).toBeGreaterThan(context.oldFeeSats + BigInt(context.vsize) - 1n)
    expect(bumped.sentSats).toEqual(120_000n)
    expect(bumped.changeSats).not.toBeNull()
    expect((bumped.changeSats ?? 0n) + bumped.feeSats + bumped.sentSats).toEqual(160_000n)

    // same inputs as the original — required for the replacement to conflict
    expect(bumped.selectedUtxos.map((u) => `${u.txid}:${u.vout}`).sort()).toEqual(
      context.inputs.map((u) => `${u.txid}:${u.vout}`).sort()
    )

    // signs and finalizes with the same keys
    const signed = signPsbtWithKeys(bumped.psbt, fx.keysByUtxo(bumped.selectedUtxos))
    const final = finalizeAndExtract(signed)
    expect(final.feeSats).toEqual(bumped.feeSats)
    const tx = Transaction.fromRaw(hex.decode(final.txHex))
    expect(tx.lockTime).toEqual(899_001)
    for (let i = 0; i < tx.inputsLength; i++) expect(tx.getInput(i).sequence).toEqual(0xfffffffd)
  })

  it("respects the BIP125 floor when the requested rate is too low", async () => {
    const fx = await getFixtures()
    const context = await reconstructReplaceContext(
      fx.getTxHex,
      fx.original.txHex,
      fx.ourAddresses,
      "bitcoin"
    )

    const bumped = buildReplacementPsbt({
      context,
      type: "speed-up",
      feeRateSatVb: 1, // below the original's 2 sat/vB
      network: "bitcoin",
      selfAddress: fx.freshChangeAddress,
      account: fx.account,
    })
    expect(bumped.feeSats).toBeGreaterThanOrEqual(context.oldFeeSats + BigInt(context.vsize))
  })

  it("cancel sweeps everything to our own address", async () => {
    const fx = await getFixtures()
    const context = await reconstructReplaceContext(
      fx.getTxHex,
      fx.original.txHex,
      fx.ourAddresses,
      "bitcoin"
    )

    const cancelled = buildReplacementPsbt({
      context,
      type: "cancel",
      feeRateSatVb: 10,
      network: "bitcoin",
      selfAddress: fx.freshChangeAddress,
      account: fx.account,
    })

    expect(cancelled.sentSats + cancelled.feeSats).toEqual(160_000n)
    expect(cancelled.changeSats).toBeNull()

    const signed = signPsbtWithKeys(cancelled.psbt, fx.keysByUtxo(cancelled.selectedUtxos))
    const final = finalizeAndExtract(signed)
    expect(final.feeSats).toEqual(cancelled.feeSats)
  })
})
