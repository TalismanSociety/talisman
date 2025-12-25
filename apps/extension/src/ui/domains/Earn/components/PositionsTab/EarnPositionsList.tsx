import { Token, TokenId } from "@talismn/chaindata-provider"
import { isAddressEqual, normalizeAddress } from "@talismn/crypto"
import { ChevronDownIcon, ChevronRightIcon } from "@talismn/icons"
import { classNames, cn, isNotNil, LoadableStatus } from "@talismn/util"
import { YieldxyzPositionEnhanced } from "extension-core"
import { isNil, toPairs, uniq } from "lodash-es"
import { FC, Fragment, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { Fiat } from "@ui/domains/Asset/Fiat"
import { TokenDisplaySymbol } from "@ui/domains/Asset/TokenDisplaySymbol"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { useEarnAssetsState } from "@ui/domains/Earn/context/EarnAssetsStateContext"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { NetworkName } from "@ui/domains/Networks/NetworkName"
import { usePortfolioNavigation } from "@ui/domains/Portfolio/usePortfolioNavigation"
import { useNavigateWithQuery } from "@ui/hooks/useNavigateWithQuery"
import { usePortfolioGlobalData, useTokensMap } from "@ui/state"
import { useYieldxyzPositionsEnhanced } from "@ui/state/yield"

import { AccountDisplay } from "../../shared/AccountDisplay"
import { YieldxyzProviderLogo } from "../../yieldxyz/components/YieldxyzProviderLogo"
import { useGetYieldxyzToken } from "../../yieldxyz/hooks/useGetYieldxyzToken"
import { EarnTypeBadge } from "../EarnTypeBadge"

const YieldPositionRow: FC<{
  position: YieldxyzPositionEnhanced // TODO change back to YieldxyzPosition after moving display fields
  status: LoadableStatus
}> = ({ position, status }) => {
  const navigate = useNavigateWithQuery()

  return (
    <button
      type="button"
      className="hover:bg-grey-750 flex h-28 w-full items-center gap-6 px-8 text-sm"
      onClick={() =>
        navigate(
          `/earn/positions/yieldxyz/${encodeURIComponent(position.yieldId)}/${encodeURIComponent(position.address)}`,
        )
      }
    >
      <YieldxyzProviderLogo providerId={position.product.providerId} className="size-16" />
      <div className="flex grow flex-col items-start justify-center gap-1 overflow-hidden text-left">
        <div className="text-body h-[1.8rem] w-full truncate">
          {position.product.metadata.name}{" "}
          <EarnTypeBadge className="shrink-0">{position.product.mechanics?.type}</EarnTypeBadge>
        </div>
        <div className="flex items-center gap-3">
          <AccountDisplay
            address={position.address}
            className="gap-[0.4em]"
            iconClassName="text-[1.2em]"
          />
        </div>
      </div>
      <div className="flex grow-0 flex-col items-end justify-center gap-2 overflow-hidden">
        <div>
          <TokensList position={position} />
        </div>
        <div className={cn("", status === "loading" && "animate-pulse")}>
          <Fiat amount={position.totalAmountUsd} forceCurrency="usd" noCountUp />
        </div>
      </div>
    </button>
  )
}

const TokensList: FC<{ position: YieldxyzPositionEnhanced; className?: string }> = ({
  position,
  className,
}) => {
  const { getYieldxyzTokenId } = useGetYieldxyzToken()
  const tokensMap = useTokensMap()
  const tokenIds = useMemo(() => {
    return uniq([
      ...position.product.inputTokens.map((token) => getYieldxyzTokenId(token)),
      ...(position.product.outputToken ? [getYieldxyzTokenId(position.product.outputToken)] : []),
      ...position.balances.map((balance) => getYieldxyzTokenId(balance.token)).filter(isNotNil),
    ])
      .filter(isNotNil)
      .filter((tokenId) => !!tokensMap[tokenId]) // only known tokens
      .sort((a, b) => a.localeCompare(b))
  }, [getYieldxyzTokenId, position, tokensMap])

  return (
    <div
      className={cn("text-body flex w-full shrink-0 items-center truncate font-bold", className)}
    >
      {tokenIds.map((tokenId, i, arr) => (
        <Fragment key={tokenId}>
          <span key={tokenId} className="inline-flex shrink-0 items-center gap-2">
            <TokenLogo tokenId={tokenId} className="size-8" />
            <TokenDisplaySymbol tokenId={tokenId} />
          </span>
          {i < arr.length - 1 && <span className="mx-2 text-white">/</span>}
        </Fragment>
      ))}
    </div>
  )
}

const TokenRow: FC<{
  status: LoadableStatus
  token: Token
  positions: YieldxyzPositionEnhanced[]
  totalUsd: number
  isExpanded: boolean
  onClick: () => void
}> = ({ token, positions, totalUsd, status, isExpanded, onClick }) => (
  <div className="bg-grey-900 w-full overflow-hidden rounded">
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "hover:bg-grey-750 flex h-28 w-full items-center gap-6 overflow-hidden px-8",
        isExpanded && "bg-grey-800",
      )}
    >
      <TokenLogo tokenId={token.id} className="size-16" />
      <div className="text-body-secondary flex grow flex-col justify-center gap-2 text-left text-sm font-medium">
        <div className="">
          <span className="text-body font-bold">
            <TokenDisplaySymbol tokenId={token.id} />
          </span>{" "}
          {token.name}
        </div>
        <div className="flex w-full items-center gap-2 overflow-hidden">
          <NetworkLogo networkId={token.networkId} className="shrink=0 size-8" />
          <NetworkName networkId={token.networkId} className="truncate" />
        </div>
      </div>

      <div className={cn("flex items-center gap-4", status === "loading" && "animate-pulse")}>
        <Fiat amount={totalUsd} forceCurrency="usd" noCountUp />
      </div>
      {isExpanded ? (
        <ChevronDownIcon className="text-body-secondary size-8 shrink-0" />
      ) : (
        <ChevronRightIcon className="text-body-secondary size-8 shrink-0" />
      )}
    </button>
    <div className={cn("flex w-full flex-col", isExpanded ? "block" : "hidden")}>
      {isExpanded &&
        positions.map((position, i) => (
          <YieldPositionRow key={`${position.yieldId}-${i}`} status={status} position={position} />
        ))}
    </div>
  </div>
)

const EarnTokenRowSkeleton: FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      className={classNames(
        "text-body-secondary bg-grey-850 mb-4 grid w-full grid-cols-[40%_30%_30%] rounded text-left text-base",
        className,
      )}
    >
      <div>
        <div className="flex h-[6.6rem]">
          <div className="p-8 text-xl">
            <div className="bg-grey-700 h-16 w-16 animate-pulse rounded-full"></div>
          </div>
          <div className="flex grow flex-col justify-center gap-2">
            <div className="bg-grey-700 rounded-xs h-8 w-20 animate-pulse"></div>
          </div>
        </div>
      </div>
      <div></div>
      <div>
        <div className="flex h-full flex-col items-end justify-center gap-2 px-8">
          <div className="bg-grey-700 rounded-xs h-8 w-[10rem] animate-pulse"></div>
          <div className="bg-grey-700 rounded-xs h-8 w-[6rem] animate-pulse"></div>
        </div>
      </div>
    </div>
  )
}

export const EarnPositionsList: FC<{ search: string }> = ({ search }) => {
  const { t } = useTranslation()
  const { isInitialising } = usePortfolioGlobalData()
  const { selectedAccount, selectedFolder, selectedAccounts } = usePortfolioNavigation()
  const { status, data: positions } = useYieldxyzPositionsEnhanced()
  const isLoading = status === "loading"

  const { getYieldxyzToken } = useGetYieldxyzToken()
  const tokensMay = useTokensMap()

  const positionsByTokenIdMap = useMemo(() => {
    return positions
      ?.map((position) => {
        const tokens = position.product.inputTokens.map((token) => getYieldxyzToken(token))
        if (tokens.some(isNil)) return null // ignore positions with unknown tokens
        return { position, tokenIds: tokens.filter(isNotNil).map((t) => t.id) }
      })
      .filter(isNotNil)
      .reduce<Record<TokenId, YieldxyzPositionEnhanced[]>>((acc, { position, tokenIds }) => {
        for (const tokenId of tokenIds) {
          if (!acc[tokenId]) acc[tokenId] = []
          acc[tokenId].push(position)
        }
        return acc
      }, {})
  }, [positions, getYieldxyzToken])

  const selectedAccountsPositions = useMemo(() => {
    const accountAddresses = selectedAccounts.map((acc) => normalizeAddress(acc.address))
    return toPairs(positionsByTokenIdMap)
      .map(([tokenId, allPositions]) => {
        const positions = allPositions.filter((position) =>
          accountAddresses.some((address) => isAddressEqual(address, position.address)),
        )
        const totalUsd = positions.reduce((sum, pos) => {
          return (
            sum + pos.balances.reduce((bSum, bal) => bSum + parseFloat(bal.amountUsd || "0"), 0)
          )
        }, 0)
        return {
          token: tokensMay[tokenId],
          positions,
          totalUsd,
        }
      })
      .filter(({ token, positions }) => !!token && !!positions.length)
      .sort((p1, p2) => p2.totalUsd - p1.totalUsd)
  }, [positionsByTokenIdMap, selectedAccounts, tokensMay])

  const displayPositions = useMemo(() => {
    const lowerSearch = (search || "").toLowerCase().trim()
    if (!lowerSearch) return selectedAccountsPositions

    return selectedAccountsPositions.filter(({ token, positions }) => {
      const search = [token.symbol, token.name]
      for (const position of positions) {
        search.push(
          position.displayName,
          position.product.providerId,
          ...(position.product.tags ?? []),
        )
        for (const balance of position.balances)
          search.push(balance.token.symbol, balance.token.name)
      }

      return search.join(" ").toLowerCase().includes(lowerSearch)
    })
  }, [search, selectedAccountsPositions])

  // Get expanded state from context
  const { isDefiExpanded, expandedTokens, toggleDefiExpanded, toggleTokenExpanded } =
    useEarnAssetsState()

  //   Toggle handlers
  const handleDefiToggle = useCallback(() => {
    toggleDefiExpanded()
  }, [toggleDefiExpanded])

  // Calculate total fiat value from all Defi positions
  const totalDefiAmountUsd = useMemo(
    () => displayPositions.reduce((sum, { totalUsd }) => sum + totalUsd, 0),
    [displayPositions],
  )

  if (!displayPositions.length && !isInitialising && !isLoading) {
    return (
      <div className="text-body-secondary bg-grey-850 mb-4 flex h-[6.6rem] flex-col justify-center rounded-sm p-8">
        {selectedAccount
          ? t("No staking positions found for this account.")
          : selectedFolder
            ? t("No staking positions found in this folder.")
            : t("No staking positions found.")}
      </div>
    )
  }

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={handleDefiToggle}
        className="text-body-secondary hover:text-body mb-4 flex w-full items-center justify-between pr-2 text-sm font-medium"
      >
        <h2 className="text-body-secondary text-sm font-medium">{t("DeFi Positions")}</h2>
        <div className="flex items-center gap-2">
          <div className="text-body-secondary text-base font-normal">
            <Fiat amount={totalDefiAmountUsd} forceCurrency="usd" />
          </div>
          {isDefiExpanded ? (
            <ChevronDownIcon className="text-body-secondary h-8 w-8" />
          ) : (
            <ChevronRightIcon className="text-body-secondary h-8 w-8" />
          )}
        </div>
      </button>
      {isDefiExpanded && (
        <div className="flex flex-col gap-4">
          {displayPositions.map(({ token, positions, totalUsd }) => (
            <TokenRow
              key={token.id}
              token={token}
              positions={positions}
              totalUsd={totalUsd}
              status={status}
              isExpanded={expandedTokens.has(token.id)}
              onClick={() => toggleTokenExpanded(token.id)}
            />
          ))}
          {(isInitialising || isLoading) && <EarnTokenRowSkeleton />}
        </div>
      )}
    </div>
  )
}
