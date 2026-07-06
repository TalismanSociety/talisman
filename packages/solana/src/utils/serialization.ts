import type {
  Blockhash,
  Instruction,
  SignaturesMap,
  TransactionMessageBytes,
  TransactionMessageBytesBase64,
} from "@solana/kit"
import {
  appendTransactionMessageInstructions,
  compileTransaction,
  createTransactionMessage,
  getBase64Decoder,
  getCompiledTransactionMessageDecoder,
  getCompiledTransactionMessageEncoder,
  getTransactionDecoder,
  getTransactionEncoder,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  address as solAddress,
} from "@solana/kit"
import { base58 } from "@talismn/crypto"

import type { SolTransaction } from "./transaction"

export const transactionFromBytes = (bytes: Uint8Array): SolTransaction =>
  getTransactionDecoder().decode(bytes)

export const transactionToBytes = (tx: SolTransaction): Uint8Array =>
  new Uint8Array(getTransactionEncoder().encode(tx))

/** base58 of the wire-format transaction — both legacy and v0, wire-compatible with web3.js */
export const serializeTransaction = (tx: SolTransaction): string =>
  base58.encode(transactionToBytes(tx))

export const deserializeTransaction = (transaction: string): SolTransaction =>
  transactionFromBytes(base58.decode(transaction))

/** decoded compiled message — legacy and v0 wire formats are handled transparently */
export const getCompiledMessage = (tx: SolTransaction) =>
  getCompiledTransactionMessageDecoder().decode(tx.messageBytes)

/**
 * Whether the bytes parse as a complete compiled transaction message (legacy or v0).
 * Wallets must refuse to sign such a payload as a "message": Solana software accounts sign raw
 * message bytes with no domain separator, so the resulting ed25519 signature would double as a
 * valid transaction signature.
 */
export const isCompiledTransactionMessage = (bytes: Uint8Array): boolean => {
  try {
    const [, offset] = getCompiledTransactionMessageDecoder().read(bytes, 0)
    return offset === bytes.length
  } catch {
    return false
  }
}

/** base64 of the compiled message bytes, the format `getFeeForMessage` expects */
export const getMessageBase64 = (tx: SolTransaction): TransactionMessageBytesBase64 =>
  getBase64Decoder().decode(tx.messageBytes) as TransactionMessageBytesBase64

export const buildUnsignedTransaction = ({
  feePayer,
  blockhash,
  lastValidBlockHeight,
  instructions,
  version = "legacy",
}: {
  feePayer: string
  blockhash: string
  lastValidBlockHeight: bigint
  instructions: Instruction[]
  version?: "legacy" | 0
}): SolTransaction =>
  pipe(
    createTransactionMessage({ version }),
    (m) => setTransactionMessageFeePayer(solAddress(feePayer), m),
    (m) =>
      setTransactionMessageLifetimeUsingBlockhash(
        { blockhash: blockhash as Blockhash, lastValidBlockHeight },
        m
      ),
    (m) => appendTransactionMessageInstructions(instructions, m),
    compileTransaction
  )

/**
 * Returns a copy of the transaction with its lifetime token (recent blockhash) replaced,
 * re-encoding the compiled message. Existing signatures are reset to null — changing the
 * blockhash invalidates them.
 */
export const setTransactionBlockhash = (tx: SolTransaction, blockhash: string): SolTransaction => {
  const compiled = getCompiledTransactionMessageDecoder().decode(tx.messageBytes)
  const messageBytes = getCompiledTransactionMessageEncoder().encode({
    ...compiled,
    lifetimeToken: blockhash,
  }) as TransactionMessageBytes

  return Object.freeze({
    messageBytes,
    signatures: Object.freeze(
      Object.fromEntries(Object.keys(tx.signatures).map((address) => [address, null]))
    ) as SignaturesMap,
  })
}

export const txToHumanJSON = (tx: string | SolTransaction) => {
  if (typeof tx === "string") tx = deserializeTransaction(tx)
  const message = getCompiledMessage(tx)
  const { header, staticAccounts } = message

  // standard account ordering: writable signers, readonly signers, writable non-signers, readonly non-signers
  const isSigner = (index: number) => index < header.numSignerAccounts
  const isWritable = (index: number) =>
    index < header.numSignerAccounts
      ? index < header.numSignerAccounts - header.numReadonlySignerAccounts
      : index < staticAccounts.length - header.numReadonlyNonSignerAccounts

  return {
    version: message.version,
    signatures: Object.values(tx.signatures).map((sig) => (sig ? base58.encode(sig) : null)),
    feePayer: staticAccounts[0] ?? null,
    recentBlockhash: "lifetimeToken" in message ? message.lifetimeToken : null,
    staticAccountKeys: staticAccounts as readonly string[],
    // ⚠️ NOTE: without address lookup table accounts we only have static keys.
    addressTableLookups:
      ("addressTableLookups" in message ? message.addressTableLookups : undefined)?.map((l) => ({
        accountKey: l.lookupTableAddress as string,
        writableIndexes: Array.from(l.writableIndexes),
        readonlyIndexes: Array.from(l.readonlyIndexes),
      })) ?? [],
    instructions: ("instructions" in message ? message.instructions : []).map((ix) => ({
      programIdIndex: ix.programAddressIndex,
      programId: staticAccounts[ix.programAddressIndex] ?? null,
      accounts: (ix.accountIndices ?? []).map((i) => ({
        index: i,
        pubkey: staticAccounts[i] ?? null,
        isSigner: isSigner(i),
        isWritable: isWritable(i),
      })),
      data: base58.encode((ix.data as Uint8Array | undefined) ?? new Uint8Array()),
    })),
  }
}
