import { ChainId } from "../Chain"
import { EvmNetworkId } from "../EvmNetwork"

export type TokenId = string

/** `TokenBase` is a common interface which all tokens must implement. */
export type TokenBase = {
  id: TokenId
  type: string
  isTestnet: boolean
  isDefault?: boolean
  symbol: string
  decimals: number
  logo: string
  coingeckoId?: string
  dcentName?: string
  // Example use-case:
  // An account on moonbeam has tokens via both the substrate and evm APIs
  // We want to show both (i.e. GLMR on Moonbeam Parachain & GLMR on Moonbeam EVM Blockchain) but
  // since both sides represent the same allocation of tokens we only want to count one of them
  // when we're summing up the account's total GLMR across all chains
  mirrorOf?: string

  // These are here because they *may* be present on a number of different token types.
  // By including them here (as potentially undefined), we can avoid having to check for them on every token type.
  chain?: { id: ChainId } | null
  evmNetwork?: { id: EvmNetworkId } | null
}

/** Used by plugins to help define their custom `TokenType` */
export type NewTokenType<
  ModuleType extends string,
  TokenParams extends Record<string, unknown>
> = TokenBase & { type: ModuleType } & TokenParams
