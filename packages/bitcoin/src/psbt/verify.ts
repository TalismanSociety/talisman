import { hex } from "@scure/base"
import { Address, OutScript, Transaction } from "@scure/btc-signer"

import { getBtcSignerNetwork } from "../networks"
import type { BitcoinNetworkName } from "../types"

export type PsbtInputInfo = {
  txid: string
  vout: number
  amountSats: bigint
  /** [fingerprint hex, full path] pairs claimed by the PSBT (untrusted until signature-checked) */
  derivations: Array<{ publicKey: string; fingerprint: `0x${string}`; path: number[] }>
  isTaproot: boolean
}

export type PsbtOutputInfo = {
  address: string | null
  amountSats: bigint
}

export type PsbtInfo = {
  inputs: PsbtInputInfo[]
  outputs: PsbtOutputInfo[]
  totalInputSats: bigint
  totalOutputSats: bigint
  feeSats: bigint
}

const toFingerprintHex = (fingerprint: number): `0x${string}` =>
  `0x${(fingerprint >>> 0).toString(16).padStart(8, "0")}`

export const inspectPsbt = (psbt: Uint8Array, network: BitcoinNetworkName): PsbtInfo => {
  const btcNetwork = getBtcSignerNetwork(network)
  const tx = Transaction.fromPSBT(psbt)

  const inputs: PsbtInputInfo[] = []
  for (let i = 0; i < tx.inputsLength; i++) {
    const input = tx.getInput(i)
    if (!input.txid || input.index === undefined || !input.witnessUtxo)
      throw new Error(`PSBT input ${i} is missing txid or witnessUtxo`)

    const derivations: PsbtInputInfo["derivations"] = []
    for (const [publicKey, der] of input.bip32Derivation ?? [])
      derivations.push({
        publicKey: hex.encode(publicKey),
        fingerprint: toFingerprintHex(der.fingerprint),
        path: [...der.path],
      })
    for (const [publicKey, der] of input.tapBip32Derivation ?? [])
      derivations.push({
        publicKey: hex.encode(publicKey),
        fingerprint: toFingerprintHex(der.der.fingerprint),
        path: [...der.der.path],
      })

    inputs.push({
      txid: hex.encode(input.txid),
      vout: input.index,
      amountSats: input.witnessUtxo.amount,
      derivations,
      isTaproot: !!input.tapInternalKey,
    })
  }

  const outputs: PsbtOutputInfo[] = []
  for (let i = 0; i < tx.outputsLength; i++) {
    const output = tx.getOutput(i)
    if (output.script === undefined || output.amount === undefined)
      throw new Error(`PSBT output ${i} is malformed`)
    let address: string | null = null
    try {
      // TS6 quibbles over ArrayBufferLike vs ArrayBuffer on decode's return; values are compatible
      const decoded = OutScript.decode(output.script) as Parameters<
        ReturnType<typeof Address>["encode"]
      >[0]
      address = Address(btcNetwork).encode(decoded)
    } catch {
      address = null
    }
    outputs.push({ address, amountSats: output.amount })
  }

  const totalInputSats = inputs.reduce((acc, input) => acc + input.amountSats, 0n)
  const totalOutputSats = outputs.reduce((acc, output) => acc + output.amountSats, 0n)

  return {
    inputs,
    outputs,
    totalInputSats,
    totalOutputSats,
    feeSats: totalInputSats - totalOutputSats,
  }
}

export const isPsbtFullySigned = (psbt: Uint8Array): boolean => {
  const tx = Transaction.fromPSBT(psbt)
  for (let i = 0; i < tx.inputsLength; i++) {
    const input = tx.getInput(i)
    // empty byte arrays may be present on unsigned inputs — check lengths, not existence
    const signed =
      (input.finalScriptWitness?.length ?? 0) > 0 ||
      (input.finalScriptSig?.length ?? 0) > 0 ||
      (input.partialSig?.length ?? 0) > 0 ||
      (input.tapKeySig?.length ?? 0) > 0
    if (!signed) return false
  }
  return tx.inputsLength > 0
}
