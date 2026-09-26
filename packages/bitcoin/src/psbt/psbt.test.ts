import { p2tr, Transaction } from "@scure/btc-signer"
import {
  deriveKeypair,
  encodeP2trAddress,
  entropyToSeed,
  getBitcoinOrdinalsBasePath,
  getBitcoinPaymentsBasePath,
  getBitcoinXpub,
  mnemonicToEntropy,
} from "@talismn/crypto"
import { describe, expect, it } from "vitest"

import type { BitcoinUtxo } from "../types"
import { buildTransferPsbt, type PsbtAccountMeta } from "./buildTransferPsbt"
import { finalizeAndExtract } from "./finalize"
import { signPsbtWithKeys } from "./sign"
import { inspectPsbt, isPsbtFullySigned } from "./verify"

const MNEMONIC =
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"

const FAKE_TXID_1 = "75ddabb27b8845f5247975c8a5ba7c6f336c4570708ebe230caf6db5217ae858"
const FAKE_TXID_2 = "1dea7cd05979072a3578cab271c02244ea8a090bbb46aa680a65ecd027048d83"
const FAKE_TXID_3 = "b2540eab6e5f5c9d85a1b6e9ec5f0f2c8a0e0d3f6f6f4f2f0f0e0d0c0b0a0908"

const getFixtures = async () => {
  const seed = await entropyToSeed(mnemonicToEntropy(MNEMONIC), "bitcoin-ecdsa")
  const paymentsPath = getBitcoinPaymentsBasePath(0)
  const ordinalsPath = getBitcoinOrdinalsBasePath(0)

  const key = (path: string) => deriveKeypair(seed, path, "bitcoin-ecdsa")

  // unrelated recipient: account 1 of the same seed — never among our own utxo addresses
  const recipient = key(`${getBitcoinPaymentsBasePath(1)}/0/0`).address

  const p0 = key(`${paymentsPath}/0/0`)
  const p1 = key(`${paymentsPath}/0/1`)
  const change0 = key(`${paymentsPath}/1/0`)
  const o0 = key(`${ordinalsPath}/0/0`)

  const account: PsbtAccountMeta = {
    masterFingerprint: "0x73c5da0a",
    trees: [
      { tree: "payments", derivationPath: paymentsPath },
      { tree: "ordinals", derivationPath: ordinalsPath },
    ],
  }

  const utxos: BitcoinUtxo[] = [
    {
      txid: FAKE_TXID_1,
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
      txid: FAKE_TXID_2,
      vout: 1,
      valueSats: 60_000n,
      confirmations: 10,
      address: p1.address,
      addressType: "p2wpkh",
      tree: "payments",
      change: 0,
      index: 1,
      publicKey: p1.publicKey,
    },
    {
      txid: FAKE_TXID_3,
      vout: 0,
      valueSats: 80_000n,
      confirmations: 5,
      address: o0.address,
      addressType: "p2tr",
      tree: "ordinals",
      change: 0,
      index: 0,
      publicKey: o0.publicKey,
    },
  ]

  const keysByAddress = new Map([p0, p1, change0, o0].map((k) => [k.address, k.secretKey] as const))
  const keysByUtxo = (selected: BitcoinUtxo[]) =>
    selected.map((utxo, inputIndex) => {
      const secretKey = keysByAddress.get(utxo.address)
      if (!secretKey) throw new Error("no key for utxo")
      return { inputIndex, secretKey }
    })

  return { utxos, account, changeAddress: change0.address, keysByUtxo, recipient, seed }
}

describe("buildTransferPsbt", () => {
  it("builds, signs and finalizes a p2wpkh transfer with change", async () => {
    const { utxos, account, changeAddress, keysByUtxo, recipient } = await getFixtures()

    const built = buildTransferPsbt({
      utxos,
      recipient: recipient,
      amountSats: 50_000n,
      feeRateSatVb: 5,
      changeAddress,
      network: "bitcoin",
      account,
    })

    expect(built.usesOrdinalsUtxos).toBe(false)
    expect(built.sentSats).toEqual(50_000n)
    expect(built.feeSats).toBeGreaterThan(0n)
    expect(built.changeSats).not.toBeNull()

    const info = inspectPsbt(built.psbt, "bitcoin")
    expect(info.feeSats).toEqual(built.feeSats)
    expect(info.inputs.every((i) => i.derivations.length > 0)).toBe(true)
    expect(info.inputs.every((i) => i.derivations[0].fingerprint === "0x73c5da0a")).toBe(true)
    expect(info.outputs.some((o) => o.address === recipient && o.amountSats === 50_000n)).toBe(true)

    expect(isPsbtFullySigned(built.psbt)).toBe(false)
    const signed = signPsbtWithKeys(built.psbt, keysByUtxo(built.selectedUtxos))
    expect(isPsbtFullySigned(signed)).toBe(true)

    const final = finalizeAndExtract(signed)
    expect(final.txid).toMatch(/^[0-9a-f]{64}$/)
    expect(final.vsize).toBeGreaterThan(0)
    expect(final.feeSats).toEqual(built.feeSats)
  })

  it("builds, signs and finalizes from a static-address utxo without a public key", async () => {
    const { utxos, keysByUtxo, recipient } = await getFixtures()
    // WIF/static-address utxos are serialized without a public key: the input
    // script must be recovered from the address
    const wifUtxo: BitcoinUtxo = { ...utxos[0], publicKey: new Uint8Array(0) }

    const built = buildTransferPsbt({
      utxos: [wifUtxo],
      recipient,
      amountSats: 40_000n,
      feeRateSatVb: 2,
      changeAddress: wifUtxo.address,
      network: "bitcoin",
    })

    expect(built.sentSats).toEqual(40_000n)
    expect(built.selectedUtxos).toHaveLength(1)

    const signed = signPsbtWithKeys(built.psbt, keysByUtxo(built.selectedUtxos))
    expect(isPsbtFullySigned(signed)).toBe(true)

    const final = finalizeAndExtract(signed)
    expect(final.txid).toMatch(/^[0-9a-f]{64}$/)
  })

  it("sweeps everything with amountSats max", async () => {
    const { utxos, account, changeAddress, keysByUtxo, recipient } = await getFixtures()
    const paymentsTotal = 160_000n

    const built = buildTransferPsbt({
      utxos,
      recipient: recipient,
      amountSats: "max",
      feeRateSatVb: 2,
      changeAddress,
      network: "bitcoin",
      account,
    })

    expect(built.usesOrdinalsUtxos).toBe(false) // ordinals excluded from sweep by default
    expect(built.changeSats).toBeNull()
    expect(built.sentSats + built.feeSats).toEqual(paymentsTotal)

    const signed = signPsbtWithKeys(built.psbt, keysByUtxo(built.selectedUtxos))
    const final = finalizeAndExtract(signed)
    expect(final.feeSats).toEqual(built.feeSats)
  })

  it("rejects dust amounts", async () => {
    const { utxos, account, changeAddress, recipient } = await getFixtures()
    expect(() =>
      buildTransferPsbt({
        utxos,
        recipient: recipient,
        amountSats: 100n,
        feeRateSatVb: 2,
        changeAddress,
        network: "bitcoin",
        account,
      })
    ).toThrow(/dust/)
  })

  it("fails without ordinals opt-in when payments tree is insufficient", async () => {
    const { utxos, account, changeAddress, recipient } = await getFixtures()
    expect(() =>
      buildTransferPsbt({
        utxos,
        recipient: recipient,
        amountSats: 200_000n, // payments tree holds 160k, total 240k
        feeRateSatVb: 2,
        changeAddress,
        network: "bitcoin",
        account,
      })
    ).toThrow(/Insufficient funds/)
  })

  it("spends taproot utxos on explicit opt-in, signing with schnorr", async () => {
    const { utxos, account, changeAddress, keysByUtxo, recipient } = await getFixtures()

    const built = buildTransferPsbt({
      utxos,
      recipient: recipient,
      amountSats: 200_000n,
      feeRateSatVb: 2,
      changeAddress,
      network: "bitcoin",
      account,
      allowOrdinalsUtxos: true,
    })

    expect(built.usesOrdinalsUtxos).toBe(true)
    const info = inspectPsbt(built.psbt, "bitcoin")
    expect(info.inputs.some((i) => i.isTaproot)).toBe(true)

    const signed = signPsbtWithKeys(built.psbt, keysByUtxo(built.selectedUtxos))
    expect(isPsbtFullySigned(signed)).toBe(true)
    const final = finalizeAndExtract(signed)
    expect(final.txid).toMatch(/^[0-9a-f]{64}$/)
  })

  it("signals BIP125 replace-by-fee and sets the anti-fee-sniping locktime", async () => {
    const { utxos, account, changeAddress, keysByUtxo, recipient } = await getFixtures()
    const tipHeight = 899_999

    const built = buildTransferPsbt({
      utxos,
      recipient,
      amountSats: 50_000n,
      feeRateSatVb: 5,
      changeAddress,
      network: "bitcoin",
      account,
      lockTimeHeight: tipHeight,
    })

    const tx = Transaction.fromPSBT(built.psbt)
    expect(tx.lockTime).toEqual(tipHeight)
    for (let i = 0; i < tx.inputsLength; i++) expect(tx.getInput(i).sequence).toEqual(0xfffffffd)

    // a locktimed, RBF-signalling transaction must still sign and finalize
    const signed = signPsbtWithKeys(built.psbt, keysByUtxo(built.selectedUtxos))
    const final = finalizeAndExtract(signed)
    expect(final.txid).toMatch(/^[0-9a-f]{64}$/)

    const finalTx = Transaction.fromRaw(Buffer.from(final.txHex, "hex"))
    expect(finalTx.lockTime).toEqual(tipHeight)
  })

  it("rejects a recipient on the wrong network", async () => {
    const { utxos, account, changeAddress } = await getFixtures()
    expect(() =>
      buildTransferPsbt({
        utxos,
        recipient: "tb1qcr8te4kr609gcawutmrza0j4xv80jy8zmfp6l0", // testnet hrp
        amountSats: 50_000n,
        feeRateSatVb: 2,
        changeAddress,
        network: "bitcoin",
        account,
      })
    ).toThrow()
  })
})

describe("p2tr encoder equivalence", () => {
  it("crypto encodeP2trAddress matches @scure/btc-signer p2tr for derived keys", async () => {
    const seed = await entropyToSeed(mnemonicToEntropy(MNEMONIC), "bitcoin-ecdsa")
    const basePath = getBitcoinOrdinalsBasePath(0)
    // also sanity-check the account xpub exists
    expect(getBitcoinXpub(seed, basePath).startsWith("xpub")).toBe(true)

    for (let i = 0; i < 50; i++) {
      const { publicKey } = deriveKeypair(seed, `${basePath}/0/${i}`, "bitcoin-ecdsa")
      const xOnly = publicKey.slice(1)
      expect(encodeP2trAddress(publicKey)).toEqual(p2tr(xOnly).address)
    }
  })
})
