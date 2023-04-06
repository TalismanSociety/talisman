import { Balances } from "@core/domains/balances/types"
import { BalanceFormatter, BalanceLockType, LockedBalance } from "@core/domains/balances/types"
import { Address } from "@core/types/base"
import { getNetworkCategory } from "@core/util/getNetworkCategory"
import { sortBigBy } from "@talisman/util/bigHelper"
import { useBalancesStatus } from "@talismn/balances-react"
import { ChainId, EvmNetworkId, Token } from "@talismn/chaindata-provider"
import { TokenRates } from "@talismn/token-rates"
import { planckToTokens } from "@talismn/util"
import useChain from "@ui/hooks/useChain"
import useToken from "@ui/hooks/useToken"
import BigNumber from "bignumber.js"
import { useMemo } from "react"

import { useSelectedAccount } from "../SelectedAccountContext"
import { useTokenBalancesSummary } from "../useTokenBalancesSummary"
import { useBalanceLocks } from "./useBalanceLocks"

type DetailRow = {
  key: BalanceLockType
  title: string
  tokens: BigNumber
  fiat: number | null
  locked: boolean
  address?: Address
}

type ChainTokenBalancesParams = {
  chainId: ChainId | EvmNetworkId
  balances: Balances
}

const getBalanceLockTypeTitle = (input: BalanceLockType | string, allLocks: LockedBalance[]) => {
  if (!input) return input

  if (input === "democracy") return "Governance"
  if (input === "staking") return "Staking"
  if (input === "nompools-staking") return "Pooled staking"
  if (input === "vesting") return "Vesting"
  if (input === "dapp-staking") return "DApp staking"
  if (input === "other")
    return allLocks.some(({ type }) => type !== "other") ? "Locked (other)" : "Locked"

  //capitalize
  return input.charAt(0).toUpperCase() + input.slice(1)
}

const getFiat = (amount: string, token?: Token, tokenRates?: TokenRates) =>
  token && tokenRates ? new BalanceFormatter(amount, token.decimals, tokenRates).fiat("usd") : null

export const useChainTokenBalances = ({ chainId, balances }: ChainTokenBalancesParams) => {
  const chain = useChain(chainId)
  const nativeToken = useToken(chain?.nativeToken?.id)

  const { account } = useSelectedAccount()
  const { summary, tokenBalances, tokenBalanceRates, token } = useTokenBalancesSummary(balances)
  const nativeTokenRates = nativeToken && tokenBalanceRates[nativeToken.id]

  const addressesWithLocks = useMemo(
    () => [
      ...new Set(
        tokenBalances
          .filter((b) => b.frozen.planck > BigInt(0))
          .map((b) => b.address)
          .filter(Boolean) as Address[]
      ),
    ],
    [tokenBalances]
  )

  // query only locks for addresses that have frozen balance
  const {
    consolidatedLocks,
    isLoading: isLoadingLocks,
    error,
    balanceLocks,
  } = useBalanceLocks({
    chainId,
    addresses: addressesWithLocks,
  })

  const detailRows: DetailRow[] = useMemo(() => {
    return summary
      ? ([
          // AVAILABLE
          ...(account
            ? [
                {
                  key: "available",
                  title: "Available",
                  tokens: summary.availableTokens,
                  fiat: summary.availableFiat,
                  locked: false,
                },
              ]
            : tokenBalances
                .filter((b) => b.transferable.planck > BigInt(0))
                .map((b) => ({
                  key: `${b.id}-available`,
                  title: "Available",
                  tokens: BigNumber(b.transferable.tokens),
                  fiat: b.transferable.fiat("usd"),
                  locked: false,
                  address: b.address,
                }))
                .sort(sortBigBy("tokens", true))),
          // LOCKED
          ...(nativeToken
            ? account
              ? consolidatedLocks
                  .map(({ type, amount }) => ({
                    key: type,
                    title: getBalanceLockTypeTitle(type, consolidatedLocks),
                    tokens: BigNumber(planckToTokens(amount, nativeToken.decimals)),
                    fiat: getFiat(amount, nativeToken, nativeTokenRates),
                    locked: true,
                  }))
                  .sort(sortBigBy("tokens", true))
              : Object.entries(balanceLocks)
                  .flatMap(([address, balances]) =>
                    balances.map(({ amount, type }) => ({
                      key: type + address,
                      title: getBalanceLockTypeTitle(type, consolidatedLocks),
                      tokens: BigNumber(planckToTokens(amount, nativeToken.decimals)),
                      fiat: getFiat(amount, nativeToken, nativeTokenRates),
                      locked: true,
                      address,
                    }))
                  )
                  .sort(sortBigBy("tokens", true))
            : []),
          // LOCKED ERROR FALLBACK
          error && {
            key: "frozen",
            title: "Frozen",
            tokens: summary.frozenTokens,
            fiat: summary.frozenFiat,
            locked: true,
          },
          ...tokenBalances
            .filter((b) => b.reserved.planck > BigInt(0))
            .flatMap((b) =>
              b.reserves.map((reserve, index) => ({
                key: `${b.id}-reserved-${index}`,
                title: getBalanceLockTypeTitle(reserve.label, []),
                tokens: BigNumber(reserve.amount.tokens),
                fiat: reserve.amount.fiat("usd"),
                locked: true,
                // only show address when we're viewing balances for all accounts
                address: account ? undefined : b.address,
              }))
            )
            .sort(sortBigBy("tokens", true)),
        ].filter((row) => row && row.tokens.gt(0)) as DetailRow[])
      : []
  }, [
    account,
    balanceLocks,
    consolidatedLocks,
    error,
    nativeToken,
    nativeTokenRates,
    summary,
    tokenBalances,
  ])

  const { evmNetwork } = balances.sorted[0]
  const relay = useChain(chain?.relay?.id)
  const networkType = useMemo(
    () => getNetworkCategory({ chain, evmNetwork, relay }),
    [chain, evmNetwork, relay]
  )

  const status = useBalancesStatus(balances, isLoadingLocks)

  return {
    summary,
    symbol: token?.symbol,
    detailRows,
    evmNetwork,
    chain,
    status,
    networkType,
    chainOrNetwork: chain || evmNetwork,
  }
}
