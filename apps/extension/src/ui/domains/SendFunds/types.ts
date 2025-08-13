export type SendFundsTransactionProps = {
  tokenId: string | undefined
  from: string | undefined
  to: string | undefined
  value: string | undefined
  sendMax: boolean
  allowReap: boolean
}
