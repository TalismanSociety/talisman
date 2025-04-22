export type CoinbaseBuyOptionsRequestInput = {
  paymentCurrency: string
  paymentMethod: string
  paymentAmount: string
  purchaseCurrency: string
  purchaseNetwork: string
}

export type CoinbaseBuyQuoteResponse = {
  coinbase_fee: {
    currency: string
    value: string
  }
  network_fee: {
    currency: string
    value: string
  }
  payment_subtotal: {
    currency: string
    value: string
  }
  payment_total: {
    currency: string
    value: string
  }
  purchase_amount: {
    currency: string
    value: string
  }
  quote_id: string
}
