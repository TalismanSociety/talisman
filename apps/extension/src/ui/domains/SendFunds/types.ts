export type SendFundsTransactionProps = {
  tokenId: string | undefined
  from: string | undefined
  to: string | undefined
  value: string | undefined
  sendMax: boolean
  allowReap: boolean
  /** freezes the EVM transaction, the Solana fee and the Polkadot tip while the payload is out for signing */
  isLocked?: boolean
}
