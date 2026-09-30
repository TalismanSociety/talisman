export type SendFundsTransactionProps = {
  tokenId: string | undefined
  from: string | undefined
  to: string | undefined
  value: string | undefined
  sendMax: boolean
  allowReap: boolean
  /** freezes fee, tip and payload refreshes while the payload is out for signing */
  isLocked?: boolean
}
