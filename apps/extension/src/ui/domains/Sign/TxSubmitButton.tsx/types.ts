import { EthNetworkId } from "@talismn/chaindata-provider"
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

export type TxSubmitButtonTransaction = TxSubmitButtonTransactionDot | TxSubmitButtonTransactionEth

type TransactionPlatform = TxSubmitButtonTransaction["platform"]

export type TxSubmitButtonProps<
  P extends TransactionPlatform | undefined = undefined,
  Tx = P extends "polkadot"
    ? TxSubmitButtonTransactionDot
    : P extends "ethereum"
      ? TxSubmitButtonTransactionEth
      : TxSubmitButtonTransaction | null | undefined,
> = {
  tx: Tx
  containerId?: string
  label?: string
  className?: string
  disabled?: boolean
  onSubmit: (hash: `0x${string}`) => void
}
