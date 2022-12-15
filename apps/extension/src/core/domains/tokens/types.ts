import { ChainId } from "@core/domains/chains/types"
import { EvmNetworkId } from "@core/domains/ethereum/types"
import { RequestIdOnly } from "@core/types/base"

// orml tokens types -----------------------

export type TokenList = Record<TokenId, Token>

export type TokenId = string

export type Token = NativeToken | CustomNativeToken | OrmlToken | Erc20Token | CustomErc20Token
export type IToken = {
  id: TokenId
  type: string
  isTestnet: boolean
  symbol: string
  decimals: number
  coingeckoId?: string
  rates?: TokenRates
}
export type NativeToken = IToken & {
  type: "native"
  existentialDeposit: string
  chain?: { id: ChainId } | null
  evmNetwork?: { id: EvmNetworkId } | null
}
export type CustomNativeToken = NativeToken & {
  isCustom: true
  image?: string
}
export type OrmlToken = IToken & {
  type: "orml"
  existentialDeposit: string
  stateKey: `0x${string}`
  chain: { id: ChainId }
}
export type Erc20Token = IToken & {
  type: "erc20"
  contractAddress: string
  chain?: { id: ChainId } | null
  evmNetwork?: { id: EvmNetworkId } | null
}
export type CustomErc20Token = Erc20Token & {
  isCustom: true
  image?: string
}
export type CustomErc20TokenCreate = Pick<
  CustomErc20Token,
  "symbol" | "decimals" | "coingeckoId" | "contractAddress" | "image"
> & { chainId?: ChainId; evmNetworkId?: EvmNetworkId }

export type TokenRateCurrency = keyof TokenRates
export type TokenRates = {
  /** us dollar rate */
  usd: number | null

  /** australian dollar rate */
  aud: number | null

  /** new zealand dollar rate */
  nzd: number | null

  /** canadian dollar rate */
  cud: number | null

  /** hong kong dollar rate */
  hkd: number | null

  /** euro rate */
  eur: number | null

  /** british pound sterling rate */
  gbp: number | null

  /** japanese yen rate */
  jpy: number | null

  /** south korean won rate */
  krw: number | null

  /** chinese yuan rate */
  cny: number | null

  /** btc rate */
  btc: number | null

  /** eth rate */
  eth: number | null

  /** dot rate */
  dot: number | null
}

export interface TokenMessages {
  // token message signatures
  "pri(tokens.subscribe)": [null, boolean, boolean]

  // custom erc20 token management
  "pri(tokens.erc20.custom)": [null, Record<CustomErc20Token["id"], CustomErc20Token>]
  "pri(tokens.erc20.custom.byid)": [RequestIdOnly, CustomErc20Token]
  "pri(tokens.erc20.custom.add)": [CustomErc20TokenCreate, boolean]
  "pri(tokens.erc20.custom.remove)": [RequestIdOnly, boolean]
}
