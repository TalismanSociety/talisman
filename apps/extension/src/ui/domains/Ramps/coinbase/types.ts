/////////////////////////////////////////////////////////////////////////////////////////
////                        Copied from coinbase-api repo                           /////
/////////////////////////////////////////////////////////////////////////////////////////
export type CoinbasePaymentMethod =
  | "CARD"
  | "CRYPTO_ACCOUNT"
  | "FIAT_WALLET"
  | "APPLE_PAY"
  | "ACH_BANK_ACCOUNT"

export type CoinbaseCurrencyPaymentLimit = {
  id: CoinbasePaymentMethod
  max: string
  min: string
}

type CoinbaseCurrency = {
  /** Currency code */
  id: string
  limits: CoinbaseCurrencyPaymentLimit[]
}

type CoinbaseToken = {
  id: string
  name: string
  symbol: string
  networks: CoinbaseTokenNetwork[]
  icon_url: string
}

export type CoinbaseTokenNetwork = {
  name: string
  display_name: string
  /** Empty string if native */
  contract_address: string
  chain_id: string
  icon_url: string
}

export type CoinbaseBuyOptions = {
  payment_currencies: CoinbaseCurrency[]
  purchase_currencies: CoinbaseToken[]
}

export type CoinbaseBuyQuoteRequest = {
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

export type CoinbaseSellOptions = {
  cashout_currencies: CoinbaseCurrency[]
  sell_currencies: CoinbaseToken[]
}

export type CoinbaseSellQuoteRequest = {
  cashoutCurrency: string
  paymentMethod: string
  sellAmount: string
  sellCurrency: string
  sellNetwork: string
}

export type CoinbaseSellQuoteResponse = {
  coinbase_fee: {
    currency: string
    value: string
  }
  cashout_subtotal: {
    currency: string
    value: string
  }
  cashout_total: {
    currency: string
    value: string
  }
  sell_amount: {
    currency: string
    value: string
  }
  quote_id: string
}
