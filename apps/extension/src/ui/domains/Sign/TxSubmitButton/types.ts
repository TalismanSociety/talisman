import { Transaction, VersionedTransaction } from "@solana/web3.js"
import { EthNetworkId, SolNetworkId } from "@talismn/chaindata-provider"
import { SignerPayloadJSON, WalletTransactionInfo } from "extension-core"
import { TransactionRequest } from "viem"

export type TxSubmitButtonTransactionDot = {
  platform: "polkadot"
  payload: SignerPayloadJSON
  txInfo?: WalletTransactionInfo
  txMetadata?: Uint8Array | `0x${string}`
}

export type TxSubmitButtonTransactionEth = {
  platform: "ethereum"
  networkId: EthNetworkId
  payload: TransactionRequest
  txInfo?: WalletTransactionInfo
}

export type TxSubmitButtonTransactionSol = {
  platform: "solana"
  networkId: SolNetworkId
  payload: Transaction | VersionedTransaction
  txInfo?: WalletTransactionInfo
}

export type TxSubmitButtonTransaction =
  | TxSubmitButtonTransactionDot
  | TxSubmitButtonTransactionEth
  | TxSubmitButtonTransactionSol

type TransactionPlatform = TxSubmitButtonTransaction["platform"]

export type TxSubmitButtonProps<
  P extends TransactionPlatform | undefined = undefined,
  Tx = P extends "polkadot"
    ? TxSubmitButtonTransactionDot
    : P extends "ethereum"
      ? TxSubmitButtonTransactionEth
      : P extends "solana"
        ? TxSubmitButtonTransactionSol
        : TxSubmitButtonTransaction | null | undefined,
> = {
  tx: Tx
  containerId?: string
  label?: string
  className?: string
  disabled?: boolean
  /**
   *
   * @param txId hash for polkadot and ethereum, signature for solana
   * @returns
   */
  onSubmit: (txId: string) => void
}
