import type { TokenId } from "@talismn/chaindata-provider"
import type {
  BaseQuote,
  ExchangeParams,
  QuoteParams,
  SwapBuildLegParams,
  SwapEnv,
  SwapModuleDefinition,
} from "../common.swap-module"

/** Only what the Chainflip module reads. fetch is looked up per call, so vi.stubGlobal still applies. */
export const chainflipTestEnv = (env: Partial<SwapEnv> = {}): SwapEnv =>
  ({ fetch: (...args: Parameters<typeof fetch>) => fetch(...args), ...env }) as SwapEnv

/** The module with its env bound, the way swaps.api.ts registers it. */
export const bindChainflipModule = (
  {
    getFromAssets,
    getToAssets,
    getQuote,
    createExchange,
    buildLeg,
    ...module
  }: SwapModuleDefinition,
  env: SwapEnv
) => ({
  ...module,
  getFromAssets: (signal: AbortSignal) => getFromAssets(env, signal),
  getToAssets: (fromTokenId: TokenId | null, signal: AbortSignal) =>
    getToAssets(fromTokenId, env, signal),
  // The contract allows an array; this module always returns a single quote or null.
  getQuote: (params: QuoteParams, signal: AbortSignal) =>
    getQuote(params, env, signal) as Promise<BaseQuote | null>,
  createExchange: (params: ExchangeParams) => {
    if (!createExchange) throw new Error("createExchange missing")
    return createExchange(params, env)
  },
  buildLeg: (params: SwapBuildLegParams) => buildLeg(params, env),
})
