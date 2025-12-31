export type ConfirmedExternalAddresses = {
  [tokenId: string]: string[]
}

export interface SendFundsMessages {
  "pri(sendFunds.confirmedAddresses.subscribe)": [null, boolean, ConfirmedExternalAddresses]
  "pri(sendFunds.confirmedAddresses.add)": [{ tokenId: string; address: string }, boolean]
}
