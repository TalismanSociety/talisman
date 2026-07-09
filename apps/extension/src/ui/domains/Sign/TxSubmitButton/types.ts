import type { SignerPayloadJSON } from "@core/domains/signing/types"
import type { WalletTransactionInfo } from "@core/domains/transactions/types"
import type { BtcNetworkId, EthNetworkId, SolNetworkId } from "@talismn/chaindata-provider"
import type { SolTransaction } from "@talismn/solana"
import type { TransactionRequest } from "viem"

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
  payload: SolTransaction
  txInfo?: WalletTransactionInfo
}

export type TxSubmitButtonTransactionBtc = {
  platform: "bitcoin"
  networkId: BtcNetworkId
  /** sender account identity (payments xpub, or bc1q address for WIF accounts) */
  address: string
  /** unsigned PSBT, base64 */
  payload: string
  /** fee ceiling enforced by the background before broadcast */
  maxFeeSats: string
  txInfo?: WalletTransactionInfo
}

export type TxSubmitButtonTransaction =
  | TxSubmitButtonTransactionDot
  | TxSubmitButtonTransactionEth
  | TxSubmitButtonTransactionSol
  | TxSubmitButtonTransactionBtc

type TransactionPlatform = TxSubmitButtonTransaction["platform"]

export type TxSubmitButtonProps<
  P extends TransactionPlatform | undefined = undefined,
  Tx = P extends "polkadot"
    ? TxSubmitButtonTransactionDot
    : P extends "ethereum"
      ? TxSubmitButtonTransactionEth
      : P extends "solana"
        ? TxSubmitButtonTransactionSol
        : P extends "bitcoin"
          ? TxSubmitButtonTransactionBtc
          : TxSubmitButtonTransaction | null | undefined,
> = {
  tx: Tx
  containerId?: string
  label?: string
  className?: string
  disabled?: boolean
  isProcessing?: boolean
  /**
   *
   * @param txId hash for polkadot and ethereum, signature for solana
   * @returns
   */
  onSubmit: (txId: string) => void
}
