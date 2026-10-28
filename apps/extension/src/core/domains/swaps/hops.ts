import type { FeatureFlag } from "@core/domains/app/types"
import type { TokenId } from "@talismn/chaindata-provider"
import { isAddressEqual, isEthereumAddress } from "@talismn/crypto"
import type { AccountType } from "@talismn/keyring"

import { quoteFromLegs } from "./helpers"
import type { BaseQuote, EntryHop, QuoteParams, SupportedSwapProtocol } from "./types"

/** an owned EVM account that could hold the funds between two legs */
export type IntermediateCandidate = {
  address: string
  type: AccountType
  /** its balance of the hub token */
  hubBalance: bigint
  /** a live plan already holds it */
  busy: boolean
}

/**
 * The recipient when it is one of the user's EVM accounts, as it signs the next leg with the same
 * address. Else the free keypair account holding the least of the hub token, so a plan never
 * mingles with a large balance. Else a free Ledger account, which signs the next leg on the device.
 */
export const pickIntermediateAccount = (
  candidates: readonly IntermediateCandidate[],
  recipient: string | null
): string | null => {
  const free = candidates.filter(
    (candidate) => isEthereumAddress(candidate.address) && !candidate.busy
  )
  const own =
    recipient && isEthereumAddress(recipient)
      ? free.find((candidate) => isAddressEqual(candidate.address, recipient))
      : undefined
  if (own) return own.address

  const keypair = free
    .filter((candidate) => candidate.type === "keypair")
    .sort((a, b) => (a.hubBalance < b.hubBalance ? -1 : a.hubBalance > b.hubBalance ? 1 : 0))[0]
  if (keypair) return keypair.address

  return free.find((candidate) => candidate.type === "ledger-ethereum")?.address ?? null
}

/** the realm-bound face of a module the composition calls: the pages' SwapModule has this shape */
export type HopModule = {
  protocol: SupportedSwapProtocol
  entryHops?: EntryHop[]
  getFromAssets: (signal: AbortSignal) => Promise<TokenId[]>
  getToAssets: (fromTokenId: TokenId | null, signal: AbortSignal) => Promise<TokenId[]>
  getQuote: (params: QuoteParams, signal: AbortSignal) => Promise<BaseQuote | BaseQuote[] | null>
}

export type EntryHopOptions = {
  enabled: (flag: FeatureFlag) => boolean
  resolve: (protocol: SupportedSwapProtocol) => HopModule | undefined
  candidates: (hub: TokenId) => Promise<IntermediateCandidate[]>
}

const first = (quote: BaseQuote | BaseQuote[] | null) => (Array.isArray(quote) ? quote[0] : quote)

const unique = (tokenIds: TokenId[]) => [...new Set(tokenIds)]

/**
 * Advertises the module's enabled entry hops as sources and composes a two-leg quote for them:
 * leg 0 through the via module to the intermediate, leg 1 through the module itself, quoted
 * `upTo` what leg 0 delivers. Everything else passes through to the module.
 */
export const withEntryHops = <T extends HopModule>(module: T, options: EntryHopOptions): T => {
  const hops = (module.entryHops ?? []).filter((hop) => options.enabled(hop.flag))
  if (!hops.length) return module

  const composeQuote = async (
    hop: EntryHop,
    params: QuoteParams,
    signal: AbortSignal
  ): Promise<BaseQuote | null> => {
    const via = options.resolve(hop.via)
    if (!via) return null
    const intermediate = pickIntermediateAccount(
      await options.candidates(hop.hub),
      params.toAddress
    )
    if (!intermediate) return null

    const leg0 = first(
      await via.getQuote(
        { ...params, toTokenId: hop.hub, toAddress: intermediate, input: "exact" },
        signal
      )
    )
    if (!leg0) return null
    const leg1 = first(
      await module.getQuote(
        {
          fromTokenId: hop.hub,
          toTokenId: params.toTokenId,
          fromAmount: leg0.outputAmountBN,
          fromAddress: intermediate,
          toAddress: params.toAddress,
          selectedSubProtocol: params.selectedSubProtocol,
          input: "upTo",
        },
        signal
      )
    )
    if (!leg1) return null

    const { legs, inputAmountBN, outputAmountBN, fees, timeInSec, ...presentation } = leg1
    return quoteFromLegs([leg0.legs[0], legs[0]], {
      ...presentation,
      subProtocol: `via-${hop.via}`,
      maxNativeTokenGasBuffer: undefined,
    })
  }

  return {
    ...module,
    getFromAssets: async (signal) =>
      unique([...(await module.getFromAssets(signal)), ...hops.map((hop) => hop.from)]),
    getToAssets: async (fromTokenId, signal) => {
      const own = await module.getToAssets(fromTokenId, signal)
      const viaHops = hops.filter((hop) => fromTokenId === null || hop.from === fromTokenId)
      const hubTargets = await Promise.all(
        viaHops.map((hop) => module.getToAssets(hop.hub, signal))
      )
      return unique([...own, ...hubTargets.flat()])
    },
    getQuote: (params, signal) => {
      const hop = hops.find((candidate) => candidate.from === params.fromTokenId)
      return hop ? composeQuote(hop, params, signal) : module.getQuote(params, signal)
    },
  }
}

/** Keeps only the quotes the user signs in one transaction, for a wallet without the multi-hop flag */
export const withSingleLegQuotes = <T extends HopModule>(module: T): T => ({
  ...module,
  getQuote: async (params, signal) => {
    const quotes = await module.getQuote(params, signal)
    if (!quotes) return quotes
    const single = (Array.isArray(quotes) ? quotes : [quotes]).filter(
      (quote) => quote.legs.length === 1
    )
    return single.length ? single : null
  },
})
