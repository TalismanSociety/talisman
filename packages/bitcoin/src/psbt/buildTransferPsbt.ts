import { base64, hex } from "@scure/base"
import {
  Address,
  bip32Path,
  OutScript,
  p2tr,
  p2wpkh,
  selectUTXO,
  type Transaction,
} from "@scure/btc-signer"

import { DUST_LIMIT_MAX_SATS, RBF_SEQUENCE } from "../constants"
import { getBtcSignerNetwork } from "../networks"
import type { BitcoinNetworkName, BitcoinTree, BitcoinUtxo } from "../types"

export type PsbtAccountMeta = {
  /** 4-byte master fingerprint, e.g. "0x73c5da0a" */
  masterFingerprint: `0x${string}`
  trees: Array<{ tree: BitcoinTree; derivationPath: string }>
}

export type BuildTransferPsbtResult = {
  psbt: Uint8Array
  psbtBase64: string
  feeSats: bigint
  /** amount actually sent to the recipient (differs from requested for "max") */
  sentSats: bigint
  /** our utxo metadata in FINAL tx input order — drives per-input signing */
  selectedUtxos: BitcoinUtxo[]
  changeSats: bigint | null
  usesOrdinalsUtxos: boolean
}

const xOnly = (publicKey: Uint8Array) => (publicKey.length === 33 ? publicKey.slice(1) : publicKey)

const utxoKey = (txid: string, vout: number) => `${txid.toLowerCase()}:${vout}`

const buildSelectionInput = (
  utxo: BitcoinUtxo,
  account: PsbtAccountMeta | undefined,
  network: ReturnType<typeof getBtcSignerNetwork>
) => {
  const fingerprint = account ? Number.parseInt(account.masterFingerprint.slice(2), 16) : undefined
  const basePath = account?.trees.find((t) => t.tree === utxo.tree)?.derivationPath
  const fullPath =
    basePath !== undefined ? bip32Path(`${basePath}/${utxo.change}/${utxo.index}`) : undefined

  if (utxo.addressType === "p2tr") {
    const internalKey = xOnly(utxo.publicKey)
    const spend = p2tr(internalKey, undefined, network)
    return {
      txid: utxo.txid,
      index: utxo.vout,
      sequence: RBF_SEQUENCE,
      witnessUtxo: { script: spend.script, amount: utxo.valueSats },
      tapInternalKey: internalKey,
      ...(fingerprint !== undefined && fullPath
        ? {
            tapBip32Derivation: [
              [internalKey, { hashes: [] as Uint8Array[], der: { fingerprint, path: fullPath } }],
            ] as [
              Uint8Array,
              { hashes: Uint8Array[]; der: { fingerprint: number; path: number[] } },
            ][],
          }
        : {}),
    }
  }

  const spend = p2wpkh(utxo.publicKey, network)
  return {
    txid: utxo.txid,
    index: utxo.vout,
    sequence: RBF_SEQUENCE,
    witnessUtxo: { script: spend.script, amount: utxo.valueSats },
    ...(fingerprint !== undefined && fullPath
      ? {
          bip32Derivation: [[utxo.publicKey, { fingerprint, path: fullPath }]] as [
            Uint8Array,
            { fingerprint: number; path: number[] },
          ][],
        }
      : {}),
  }
}

// TS6 disallows passing OutScript.decode's return (script: ArrayBufferLike) straight to
// Address.encode (script: ArrayBuffer) — the runtime values are compatible
const scriptToAddress = (script: Uint8Array, coder: ReturnType<typeof Address>): string =>
  coder.encode(OutScript.decode(script) as Parameters<(typeof coder)["encode"]>[0])

export const buildTransferPsbt = (params: {
  utxos: BitcoinUtxo[]
  recipient: string
  /** "max" sweeps all selectable utxos to the recipient (no change output) */
  amountSats: bigint | "max"
  feeRateSatVb: number
  changeAddress: string
  network: BitcoinNetworkName
  /** default false: ordinals-tree utxos are never spent unless explicitly allowed */
  allowOrdinalsUtxos?: boolean
  /** populates PSBT bip32 derivation fields (required for hardware signing) */
  account?: PsbtAccountMeta
  /**
   * anti-fee-sniping: current tip height, set as nLockTime so the transaction is
   * only valid in the next block (the practice of Bitcoin Core and most wallets)
   */
  lockTimeHeight?: number
}): BuildTransferPsbtResult => {
  const network = getBtcSignerNetwork(params.network)

  // fail fast on an invalid recipient — decode also rejects wrong-network hrp
  Address(network).decode(params.recipient)

  if (params.amountSats !== "max" && params.amountSats < DUST_LIMIT_MAX_SATS)
    throw new Error(`Amount is below the dust limit (${DUST_LIMIT_MAX_SATS} sats)`)

  const paymentsUtxos = params.utxos.filter((u) => u.tree !== "ordinals")
  const ordinalsUtxos = params.allowOrdinalsUtxos
    ? params.utxos.filter((u) => u.tree === "ordinals")
    : []

  const feePerByte = BigInt(Math.max(1, Math.ceil(params.feeRateSatVb)))

  const select = (utxos: BitcoinUtxo[]) => {
    if (!utxos.length) return undefined
    const inputsByKey = new Map(utxos.map((u) => [utxoKey(u.txid, u.vout), u]))
    const selectionInputs = utxos.map((u) => buildSelectionInput(u, params.account, network))

    const isMax = params.amountSats === "max"
    const selection = selectUTXO(
      selectionInputs,
      isMax ? [] : [{ address: params.recipient, amount: params.amountSats as bigint }],
      isMax ? "all" : "default",
      {
        // for "max", routing the change to the recipient turns change into the swept amount
        changeAddress: isMax ? params.recipient : params.changeAddress,
        feePerByte,
        bip69: true,
        createTx: true,
        network,
        ...(params.lockTimeHeight ? { lockTime: params.lockTimeHeight } : {}),
      }
    )
    if (!selection?.tx) return undefined
    return { selection, inputsByKey }
  }

  // payments-tree first; ordinals utxos only join when payments alone cannot fund the transfer
  const result =
    select(paymentsUtxos) ??
    (ordinalsUtxos.length ? select([...paymentsUtxos, ...ordinalsUtxos]) : undefined)
  if (!result) throw new Error("Insufficient funds to cover amount and network fee")

  const { selection, inputsByKey } = result
  const tx = selection.tx as Transaction

  // map final input order back to our utxo metadata
  const selectedUtxos: BitcoinUtxo[] = []
  for (let i = 0; i < tx.inputsLength; i++) {
    const input = tx.getInput(i)
    if (!input.txid || input.index === undefined) throw new Error("Malformed selection input")
    const txidHex = hex.encode(input.txid)
    const utxo = inputsByKey.get(utxoKey(txidHex, input.index))
    if (!utxo) throw new Error("Selection returned an unknown input")
    selectedUtxos.push(utxo)
  }

  // recipient + change amounts from the final outputs
  let sentSats = 0n
  let changeSats: bigint | null = null
  const addressCoder = Address(network)
  for (let i = 0; i < tx.outputsLength; i++) {
    const output = tx.getOutput(i)
    if (output.script === undefined || output.amount === undefined) continue
    const address = scriptToAddress(output.script, addressCoder)
    if (address === params.recipient) sentSats += output.amount
    else if (address === params.changeAddress) changeSats = output.amount
  }

  const psbt = tx.toPSBT()
  const feeSats = selection.fee
  if (feeSats === undefined) throw new Error("Selection did not produce a fee")

  return {
    psbt,
    psbtBase64: base64.encode(psbt),
    feeSats,
    sentSats,
    selectedUtxos,
    changeSats,
    usesOrdinalsUtxos: selectedUtxos.some((u) => u.tree === "ordinals"),
  }
}
