import { DEBUG } from "@core/constants"
import { Chain, ChainId } from "@core/domains/chains/types"
import { EvmNetwork, EvmNetworkId } from "@core/domains/ethereum/types"
import { TokenId } from "@core/domains/tokens/types"
import { BalanceSearchQuery, Balances } from "@talismn/balances"
import useBalances from "@ui/hooks/useBalances"
import { useSettings } from "@ui/hooks/useSettings"
import useTokens from "@ui/hooks/useTokens"
import { useMemo } from "react"

import { TransferableToken, TransferableTokenId } from "./types"

const nonEmptyBalanceFilter = ({ balances }: { balances: Balances }) => {
  const amount = balances.sorted.reduce(
    (amount, balance) => amount + BigInt(balance.transferable.planck),
    BigInt(0)
  )
  return amount > BigInt(0)
}

/**
 *
 * @returns tokens list split by network (ASTR on substrate and ASTR on evm will be 2 distinct entries)
 */
export const useTransferableTokens = () => {
  const { useTestnets = false } = useSettings()
  const { tokens } = useTokens(useTestnets)

  const transferableTokens = useMemo(() => {
    return (
      tokens?.flatMap((token) => {
        const { id: tokenId, chain, evmNetwork } = token

        return [
          chain && {
            id: `${tokenId}-${chain.id}`,
            chainId: chain.id,
            token,
          },
          evmNetwork && {
            id: `${tokenId}-${evmNetwork.id}`,
            evmNetworkId: evmNetwork.id,
            token,
          },
        ].filter(Boolean) as TransferableToken[]
      }) ?? []
    ).filter((tt, i, arr) => {
      // on substrate, there could be multiple tokens with same symbol on a same chain (ACA, KINT..)
      // a good fix would be to detect on subsquid side if ANY account has tokens, if not the token shouldn't be included in github tokens file
      // until then we hardcode an exclusion list here :

      // ACA, BNC and KAR use native (orml won't work)
      // INTR, KINT and MGX use orml (native won't work)

      const IGNORED_TOKENS = [
        "acala-substrate-orml-aca-acala",
        "bifrost-kusama-substrate-orml-bnc-bifrost-kusama",
        "bifrost-polkadot-substrate-orml-bnc-bifrost-polkadot",
        "interlay-substrate-native-intr-interlay",
        "karura-substrate-orml-kar-karura",
        "kintsugi-substrate-native-kint-kintsugi",
        "mangata-substrate-native-mgx-mangata",
      ]

      if (DEBUG) {
        // detect new duplicates
        const duplicates = arr.filter(
          (tt2) =>
            !IGNORED_TOKENS.includes(tt2.id) &&
            tt.chainId &&
            tt.token.symbol === tt2.token.symbol &&
            tt.chainId === tt2.chainId
        )
        if (duplicates.length > 1)
          // eslint-disable-next-line no-console
          console.warn(
            "Duplicate tokens found : ",
            duplicates.map((tt2) => tt2.id)
          )
      }

      return !IGNORED_TOKENS.includes(tt.id)
    })
  }, [tokens])

  return transferableTokens
}

/**
 * sorted version, should only be used in asset picker
 */
export const useSortedTransferableTokens = (withBalanceFirst = false) => {
  const transferableTokens = useTransferableTokens()
  const { useTestnets = false } = useSettings()
  const balances = useBalances(useTestnets)

  const sortable = useMemo(() => {
    return transferableTokens.map((transferableToken) => {
      const sortIndex =
        1 + balances.sorted.findIndex((b) => b.tokenId === transferableToken.token.id)
      const balanceFilter: BalanceSearchQuery = transferableToken.chainId
        ? { tokenId: transferableToken.token.id, chainId: transferableToken.chainId }
        : {
            tokenId: transferableToken.token.id,
            evmNetworkId: transferableToken.evmNetworkId,
          }
      return {
        ...transferableToken,
        sortIndex,
        balances: balances?.find(balanceFilter) ?? new Balances([]),
      }
    })
  }, [balances, transferableTokens])

  const results = useMemo(() => {
    const sorted = sortable.sort(
      (a, b) =>
        (a?.sortIndex || Number.MAX_SAFE_INTEGER) - (b?.sortIndex || Number.MAX_SAFE_INTEGER)
    )

    if (!withBalanceFirst) return sorted
    return [
      ...sorted.filter((token) => nonEmptyBalanceFilter(token)),
      ...sorted.filter((token) => !nonEmptyBalanceFilter(token)),
    ] as TransferableToken[]
  }, [withBalanceFirst, sortable])

  // keep only TransferableToken fields
  return results.map<TransferableToken>(({ id, chainId, evmNetworkId, token }) => ({
    id,
    chainId,
    evmNetworkId,
    token,
  }))
}

export const useTransferableTokenById = (id?: TransferableTokenId) => {
  const transferableTokens = useTransferableTokens()

  return useMemo(
    () => transferableTokens.find((tt) => tt.id === id) ?? undefined,
    [id, transferableTokens]
  )
}

export const useTransferableTokenId = ({
  tokenId,
  chainId,
  evmNetworkId,
}: {
  tokenId: TokenId
  chainId?: ChainId
  evmNetworkId?: EvmNetworkId
}) => {
  const items = useTransferableTokens()
  const result = items.find(
    (tt) =>
      tt.token.id === tokenId &&
      ((chainId && tt.chainId === chainId) || (evmNetworkId && tt.evmNetworkId === evmNetworkId))
  )
  return result?.id ?? undefined
}
