import { Balance, type BalanceJson, type HydrateDb } from "@talismn/balances"
import type { Token } from "@talismn/chaindata-provider"
import { newTokenRates } from "@talismn/token-rates"

const DECIMALS = 10

export const makeToken = (id: string, symbol: string): Token =>
  ({ id, type: "substrate-native", symbol, decimals: DECIMALS, networkId: id }) as Token

export const makeBalance = (
  token: Token,
  tokens: number,
  { address = "account", usdPrice }: { address?: string; usdPrice?: number } = {}
) => {
  const rates = newTokenRates()
  rates.usd = { price: usdPrice ?? 0 }
  const db: HydrateDb = {
    tokens: { [token.id]: token },
    tokenRates: usdPrice === undefined ? {} : { [token.id]: rates },
  }
  return new Balance(
    {
      source: "test-source",
      status: "live",
      networkId: token.networkId,
      address,
      tokenId: token.id,
      value: (BigInt(tokens) * 10n ** BigInt(DECIMALS)).toString(),
    } as BalanceJson,
    db
  )
}
