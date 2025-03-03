import { TokenId } from "@talismn/chaindata-provider"
import { ArrowDownIcon, CreditCardIcon, LockIcon, ZapOffIcon } from "@talismn/icons"
import { classNames, planckToTokens } from "@talismn/util"
import { BigNumber } from "bignumber.js"
import { formatDuration, intervalToDuration } from "date-fns"
import { FC, Suspense, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { PillButton, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { Balance, Balances } from "@extension/core"
import { FadeIn } from "@talisman/components/FadeIn"
import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { useBuyTokensModal } from "@ui/domains/Asset/Buy/hooks/useBuyTokensModal"
import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import Tokens from "@ui/domains/Asset/Tokens"
import { useCopyAddressModal } from "@ui/domains/CopyAddress"
import { usePortfolioNavigation } from "@ui/domains/Portfolio/usePortfolioNavigation"
import { ROOT_NETUID } from "@ui/domains/Staking/Bittensor/constants"
import { BondButton } from "@ui/domains/Staking/Bond/BondButton"
import { useNomPoolStakingStatus } from "@ui/domains/Staking/hooks/nomPools/useNomPoolStakingStatus"
import { NomPoolWithdrawButton } from "@ui/domains/Staking/NomPoolWithdraw/NomPoolWithdrawButton"
import { UnbondButton } from "@ui/domains/Staking/Unbond/UnbondButton"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { BalancesStatus } from "@ui/hooks/useBalancesStatus"
import { useFeatureFlag, useSelectedCurrency } from "@ui/state"

import { StaleBalancesIcon } from "../StaleBalancesIcon"
import { CopyAddressButton } from "./CopyAddressIconButton"
import { PortfolioAccount } from "./PortfolioAccount"
import { SendFundsTokenButton } from "./SendFundsTokenIconButton"
import { TokenContextMenu } from "./TokenContextMenu"
import { useAssetDetails } from "./useAssetDetails"
import { BalanceDetailRow, useTokenBalances } from "./useTokenBalances"
import { useUniswapV2BalancePair } from "./useUniswapV2BalancePair"

const TokenBalances: FC<{ tokenId: TokenId; balances: Balances }> = ({ tokenId, balances }) => {
  const { chainOrNetwork, summary, token, detailRows, status, networkType } = useTokenBalances({
    tokenId,
    balances,
  })

  // wait for data to load
  if (!chainOrNetwork || !summary || !token || balances.count === 0) return null

  const isUniswapV2LpToken = balances.sorted[0]?.source === "evm-uniswapv2"

  return (
    <div className={classNames("text-body-secondary text-sm")}>
      <div
        className={classNames(
          "bg-grey-800 flex w-full items-center gap-6 border-transparent px-7 py-6",
          detailRows.length ? "rounded-t-sm" : "rounded",
        )}
      >
        <div className="text-xl">
          <TokenLogo tokenId={tokenId} />
        </div>
        <div className="flex grow flex-col justify-center gap-2 pr-8">
          <div className="flex grow justify-between font-bold text-white">
            <div className="flex items-center">
              <ChainLogo className="mr-2" id={chainOrNetwork.id} />
              <span className="mr-2 truncate">{chainOrNetwork.name}</span>
              <CopyAddressButton networkId={chainOrNetwork.id} />
              <Suspense fallback={<SuspenseTracker name="ChainTokenBalances.Buttons" />}>
                <SendFundsTokenButton tokenId={token.id} shouldClose />
              </Suspense>
            </div>
          </div>
          <div className="text-body-secondary flex justify-between text-xs">
            <div>{networkType}</div>
          </div>
        </div>
        {tokenId && (
          <div className="size-[3.8rem] shrink-0 empty:hidden">
            <Suspense fallback={<SuspenseTracker name="StakeButton" />}>
              <BondButton tokenId={tokenId} balances={balances} />
            </Suspense>
          </div>
        )}
        {tokenId && (
          <TokenContextMenu
            tokenId={tokenId}
            className="hover:bg-grey-700 focus-visible:bg-grey-700 rounded-full"
          />
        )}
      </div>
      {isUniswapV2LpToken &&
        balances.sorted
          .filter((balance) => balance.total.planck > 0n)
          .map((balance, i, balances) => (
            <TokenBalancesUniswapV2Row
              key={balance.id}
              balance={balance}
              isLastBalance={balances.length === i + 1}
              status={status}
            />
          ))}
      {!isUniswapV2LpToken &&
        detailRows
          .filter((row) => row.tokens.gt(0))
          .map((row, i, rows) => {
            const { symbol } = token
            const { meta: { dynamicInfo = {} } = {}, title } = row

            const balanceDetailSymbol = title.toLowerCase().includes("subnet")
              ? dynamicInfo?.tokenSymbol
              : symbol
            return (
              <TokenBalancesDetailRow
                key={row.key}
                row={row}
                isLastRow={rows.length === i + 1}
                symbol={balanceDetailSymbol}
                status={status}
                tokenId={tokenId}
                tokenDecimals={token.decimals}
              />
            )
          })}
    </div>
  )
}

const TokenBalancesUniswapV2Row = ({
  balance,
  isLastBalance,
  status,
}: {
  balance: Balance
  isLastBalance?: boolean
  status: BalancesStatus
}) => {
  const { selectedAccount } = usePortfolioNavigation()
  const selectedCurrency = useSelectedCurrency()
  const balancePair = useUniswapV2BalancePair(balance)
  if (!balancePair) return null

  const token = balance.token
  if (token?.type !== "evm-uniswapv2") return null
  if (!balance.evmNetworkId) return null

  return (
    <div
      className={classNames(
        "bg-black-secondary flex w-full flex-col justify-center gap-8 px-7 py-6",
        isLastBalance && "rounded-b-sm",
      )}
    >
      {/* only show address when we're viewing balances for all accounts */}
      {!selectedAccount && (
        <div className="flex items-end justify-between gap-4 text-xs">
          <PortfolioAccount address={balance.address} />
        </div>
      )}
      {balancePair.map(({ tokenId, symbol, holdingBalance }) => (
        <div key={tokenId} className="flex w-full items-center gap-6">
          <div className="text-xl">
            <TokenLogo tokenId={tokenId} />
          </div>
          <div className="grow font-bold text-white">{symbol}</div>
          <div
            className={classNames(
              "flex flex-col flex-nowrap justify-center gap-2 whitespace-nowrap text-right",
              status.status === "fetching" && "animate-pulse transition-opacity",
            )}
          >
            <div className={"font-bold text-white"}>
              <Tokens amount={holdingBalance.tokens} symbol={symbol} isBalance />
              {status.status === "stale" ? (
                <>
                  {" "}
                  <StaleBalancesIcon
                    className="inline align-baseline"
                    staleChains={status.staleChains}
                  />
                </>
              ) : null}
            </div>
            <div className="text-xs">
              {holdingBalance.fiat(selectedCurrency) === null ? (
                "-"
              ) : (
                <Fiat amount={holdingBalance.fiat(selectedCurrency)} isBalance />
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

const TokenBalancesDetailRow = ({
  row,
  isLastRow,
  status,
  symbol,
  tokenId,
  tokenDecimals,
}: {
  row: BalanceDetailRow
  isLastRow?: boolean
  status: BalancesStatus
  symbol: string
  tokenId?: TokenId
  tokenDecimals: number
}) => {
  const alphaBalanceInTao = new BigNumber(planckToTokens(row.meta?.amountTao, tokenDecimals) || "0")

  const tokenBalance = alphaBalanceInTao.gt(0) ? alphaBalanceInTao : row.tokens
  return (
    <div
      className={classNames(
        "bg-black-secondary flex w-full items-center gap-8 px-7 py-6",
        isLastRow && "rounded-b-sm",
      )}
    >
      <div className="flex grow flex-col justify-center gap-2 overflow-hidden">
        <div className="flex h-10 w-full items-center gap-2 font-bold text-white">
          <div className="truncate capitalize">{row.title}</div>
          {!!row.locked && tokenId && row.meta && (
            <LockedExtra
              tokenId={tokenId}
              address={row.address}
              rowMeta={row.meta}
              isLoading={status.status === "fetching" || !!row.isLoading}
            />
          )}
        </div>
        {!!row.address && (
          <div className="text-xs">
            <PortfolioAccount address={row.address} />
          </div>
        )}
        {!row.address && row.isLoading && !row.description && row.locked && (
          <div className="bg-grey-800 rounded-xs h-[1.4rem] max-w-48 animate-pulse" />
        )}
        {!row.address && row.description && (
          <div className="overflow-hidden text-ellipsis whitespace-nowrap text-xs">
            {row.description}
          </div>
        )}
      </div>
      <div
        className={classNames(
          "flex flex-col flex-nowrap items-end justify-center gap-2 whitespace-nowrap",
          status.status === "fetching" && "animate-pulse transition-opacity",
        )}
      >
        <div
          className={classNames(
            "flex h-10 items-center gap-2 font-bold",
            row.locked ? "text-body-secondary" : "text-white",
          )}
        >
          <Tokens amount={tokenBalance} symbol={symbol} isBalance />
          {row.locked ? <LockIcon className="lock shrink-0" /> : null}
          {status.status === "stale" ? (
            <StaleBalancesIcon className="shrink-0" staleChains={status.staleChains} />
          ) : null}
        </div>
        <div className="text-xs">
          {row.fiat === null ? "-" : <Fiat amount={row.fiat} isBalance />}
        </div>
      </div>
    </div>
  )
}

const LockedExtra: FC<{
  tokenId: TokenId
  address?: string // this is only set when browsing all accounts
  isLoading: boolean
  rowMeta: { poolId?: number; unbonding?: boolean; hotkey?: string; netuid?: number }
}> = ({ tokenId, address, rowMeta, isLoading }) => {
  const { t } = useTranslation()
  const { data } = useNomPoolStakingStatus(tokenId)
  const { selectedAccount } = usePortfolioNavigation()

  const rowAddress = useMemo(
    () => address ?? selectedAccount?.address ?? null,
    [selectedAccount?.address, address],
  )

  const accountStatus = useMemo(
    () => data?.accounts?.find((s) => s.address === rowAddress),
    [rowAddress, data?.accounts],
  )

  const withdrawIn = useMemo(
    () =>
      !!rowMeta.unbonding && !!accountStatus?.canWithdrawIn
        ? formatDuration(intervalToDuration({ start: 0, end: accountStatus.canWithdrawIn }))
        : null,
    [accountStatus?.canWithdrawIn, rowMeta.unbonding],
  )

  const canUnbond = useMemo(
    () => (accountStatus?.canUnstake && rowMeta.poolId) || tokenId === "bittensor-substrate-native",
    [accountStatus?.canUnstake, rowMeta.poolId, tokenId],
  )

  const isExternalUnbond = useMemo(
    () => tokenId === "bittensor-substrate-native" && rowMeta.netuid !== ROOT_NETUID,
    [rowMeta.netuid, tokenId],
  )

  if (!rowAddress) return null

  return (
    <>
      {rowMeta.unbonding ? (
        accountStatus?.canWithdraw ? (
          <NomPoolWithdrawButton tokenId={tokenId} address={rowAddress} variant="small" />
        ) : (
          <Tooltip>
            <TooltipTrigger
              className={classNames(
                "text-body-secondary bg-body/10 h-10 rounded-sm px-3 text-xs opacity-60",
                isLoading && "animate-pulse",
              )}
            >
              <div className="flex items-center gap-2">
                <ZapOffIcon className="shrink-0 text-xs" />
                <div>{t("Unbonding")}</div>
              </div>
            </TooltipTrigger>
            {!!withdrawIn && (
              <TooltipContent>{t("{{duration}} left", { duration: withdrawIn })}</TooltipContent>
            )}
          </Tooltip>
        )
      ) : canUnbond ? (
        <UnbondButton
          tokenId={tokenId}
          address={rowAddress}
          variant="small"
          poolId={rowMeta.poolId ?? rowMeta.hotkey}
          isExternalUnbond={isExternalUnbond}
        />
      ) : null}
    </>
  )
}

const NoTokens = ({ symbol }: { symbol: string }) => {
  const { t } = useTranslation()
  const { selectedAccount, selectedFolder } = usePortfolioNavigation()
  const { open } = useCopyAddressModal()
  const { genericEvent } = useAnalytics()
  const { open: openBuyTokensModal } = useBuyTokensModal()

  const handleCopy = useCallback(() => {
    open({
      address: selectedAccount?.address,
      qr: true,
    })
    genericEvent("open receive", { from: "asset details" })
  }, [selectedAccount?.address, genericEvent, open])

  const showBuyCrypto = useFeatureFlag("BUY_CRYPTO")
  const handleBuyCryptoClick = useCallback(async () => {
    openBuyTokensModal()
  }, [openBuyTokensModal])

  return (
    <FadeIn>
      <div className="bg-field text-body-secondary leading-base rounded-sm p-10 text-center text-sm">
        <div>
          {selectedAccount
            ? t("You don't have any {{symbol}} in this account", { symbol })
            : selectedFolder
              ? t("You don't have any {{symbol}} in this folder", { symbol })
              : t("You don't have any {{symbol}}", { symbol })}
        </div>
        <div className="mt-6 flex justify-center gap-4">
          <PillButton icon={ArrowDownIcon} onClick={handleCopy}>
            {t("Copy address")}
          </PillButton>
          {showBuyCrypto && (
            <PillButton icon={CreditCardIcon} onClick={handleBuyCryptoClick}>
              {t("Buy Crypto")}
            </PillButton>
          )}
        </div>
      </div>
    </FadeIn>
  )
}

export const PopupAssetDetails: FC<{
  balances: Balances
  symbol: string
}> = ({ balances, symbol }) => {
  const { balancesByToken: rows } = useAssetDetails(balances)
  const hasBalance = useMemo(
    () => rows.some(([, balances]) => balances.each.some((b) => b.total.planck > 0n)),
    [rows],
  )

  if (!hasBalance) return <NoTokens symbol={symbol} />

  return (
    <FadeIn>
      <div className="flex flex-col gap-8">
        {rows.map(([tokenId, bal]) => (
          <TokenBalances key={tokenId} tokenId={tokenId} balances={bal} />
        ))}
      </div>
    </FadeIn>
  )
}
