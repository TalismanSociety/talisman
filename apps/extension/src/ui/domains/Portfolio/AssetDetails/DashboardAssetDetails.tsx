import { ChainId, EvmNetworkId, TokenId } from "@talismn/chaindata-provider"
import { ZapOffIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { formatDuration, intervalToDuration } from "date-fns"
import { FC, Suspense, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { Address, Balance, Balances } from "@extension/core"
import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import Tokens from "@ui/domains/Asset/Tokens"
import { AssetBalanceCellValue } from "@ui/domains/Portfolio/AssetBalanceCellValue"
import { NoTokensMessage } from "@ui/domains/Portfolio/NoTokensMessage"
import { BondButton } from "@ui/domains/Staking/Bond/BondButton"
import { useNomPoolStakingStatus } from "@ui/domains/Staking/hooks/nomPools/useNomPoolStakingStatus"
import { NomPoolWithdrawButton } from "@ui/domains/Staking/NomPoolWithdraw/NomPoolWithdrawButton"
import { UnbondButton } from "@ui/domains/Staking/Unbond/UnbondButton"
import { BalancesStatus } from "@ui/hooks/useBalancesStatus"
import { useSelectedCurrency } from "@ui/state"

import { StaleBalancesIcon } from "../StaleBalancesIcon"
import { usePortfolioNavigation } from "../usePortfolioNavigation"
import { CopyAddressButton } from "./CopyAddressIconButton"
import { PortfolioAccount } from "./PortfolioAccount"
import { SendFundsButton } from "./SendFundsIconButton"
import { TokenContextMenu } from "./TokenContextMenu"
import { useAssetDetails } from "./useAssetDetails"
import { DetailRow, useChainTokenBalances } from "./useChainTokenBalances"
import { useUniswapV2BalancePair } from "./useUniswapV2BalancePair"

const AssetState = ({
  title,
  description,
  render,
  address,
  isLoading,
  locked,
}: {
  title: string
  description?: string
  render: boolean
  address?: Address
  isLoading?: boolean
  locked?: boolean
}) => {
  if (!render) return null
  return (
    <div className="flex flex-col justify-center gap-2 overflow-hidden p-8">
      <div className="flex w-full items-baseline gap-4 overflow-hidden">
        <div className="shrink-0 whitespace-nowrap font-bold text-white">{title}</div>
        {/* show description next to title when address is set */}
        {description && address && <div className="grow truncate text-sm">{description}</div>}
      </div>
      {address && (
        <div className="text-sm">
          <PortfolioAccount address={address} />
        </div>
      )}
      {/* show description below title when address is not set */}
      {isLoading && !description && locked && (
        <div className="bg-grey-700 rounded-xs h-[1.6rem] w-80 animate-pulse" />
      )}
      {description && !address && (
        <div className="flex-shrink-0 truncate text-sm">{description}</div>
      )}
    </div>
  )
}

type AssetRowProps = {
  chainId: ChainId | EvmNetworkId
  balances: Balances
}

const ChainTokenBalances = ({ chainId, balances }: AssetRowProps) => {
  const { t } = useTranslation()
  const { chainOrNetwork, summary, symbol, tokenId, detailRows, status, networkType } =
    useChainTokenBalances({ chainId, balances })

  // wait for data to load
  if (!chainOrNetwork || !summary || !symbol || balances.count === 0) return null

  const isUniswapV2LpToken = balances.sorted[0]?.source === "evm-uniswapv2"

  return (
    <div className="mb-8">
      <div
        className={classNames(
          "bg-grey-800 grid grid-cols-[40%_30%_30%]",
          detailRows.length ? "rounded-t" : "rounded",
        )}
      >
        <div className="flex">
          <div className="shrink-0 p-8 text-xl">
            <TokenLogo tokenId={tokenId} />
          </div>
          <div className="flex grow flex-col justify-center gap-2 whitespace-nowrap">
            <div className="base text-body flex items-center font-bold">
              <ChainLogo className="mr-2" id={chainOrNetwork.id} />
              <span className="mr-2">{chainOrNetwork.name}</span>
              <CopyAddressButton networkId={chainOrNetwork.id} />
              <Suspense fallback={<SuspenseTracker name="ChainTokenBalances.Buttons" />}>
                <SendFundsButton symbol={symbol} networkId={chainOrNetwork.id} />
                {tokenId && (
                  <TokenContextMenu
                    tokenId={tokenId}
                    placement="bottom-start"
                    className="text-body-secondary hover:text-body focus:text-body hover:bg-grey-700 focus-visible:bg-grey-700 inline-flex h-9 w-9 items-center justify-center rounded-full p-0 text-xs opacity-50"
                  />
                )}
              </Suspense>
            </div>
            <div>{networkType}</div>
          </div>
        </div>
        <div>
          <AssetBalanceCellValue
            locked
            render={summary.lockedTokens.gt(0)}
            tokens={summary.lockedTokens}
            fiat={summary.lockedFiat}
            symbol={symbol}
            tooltip={t("Total Locked Balance")}
            balancesStatus={status}
            className={classNames(
              status.status === "fetching" && "animate-pulse transition-opacity",
            )}
          />
        </div>
        <div className="flex items-center justify-end gap-2">
          {tokenId && <BondButton tokenId={tokenId} balances={balances} />}
          <AssetBalanceCellValue
            render
            tokens={summary.availableTokens}
            fiat={summary.availableFiat}
            symbol={symbol}
            tooltip={t("Total Available Balance")}
            balancesStatus={status}
            className={classNames(
              status.status === "fetching" && "animate-pulse transition-opacity",
            )}
          />
        </div>
      </div>
      {isUniswapV2LpToken &&
        balances.sorted
          .filter((balance) => balance.total.planck > 0n)
          .map((balance, i, balances) => (
            <ChainTokenBalancesUniswapV2Row
              key={balance.id}
              balance={balance}
              isLastBalance={balances.length === i + 1}
              status={status}
            />
          ))}
      {!isUniswapV2LpToken &&
        detailRows
          .filter((row) => row.tokens.gt(0))
          .map((row, i, rows) => (
            <ChainTokenBalancesDetailRow
              key={row.key}
              row={row}
              isLastRow={rows.length === i + 1}
              symbol={symbol}
              status={status}
              tokenId={tokenId}
            />
          ))}
    </div>
  )
}

const ChainTokenBalancesUniswapV2Row = ({
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

  if (!balance.evmNetworkId) return null
  if (!balancePair) return null
  const token = balance.token
  if (token?.type !== "evm-uniswapv2") return null

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

const ChainTokenBalancesDetailRow = ({
  row,
  isLastRow,
  status,
  symbol,
  tokenId,
}: {
  row: DetailRow
  isLastRow?: boolean
  status: BalancesStatus
  symbol: string
  tokenId?: TokenId // unsafe, there could be multiple aggregated here
}) => (
  <div
    key={row.key}
    className={classNames("bg-grey-850 grid grid-cols-[40%_30%_30%]", isLastRow && "rounded-b")}
  >
    <div>
      <AssetState
        title={row.title}
        description={row.description}
        render
        address={row.address}
        isLoading={row.isLoading}
        locked={row.locked}
      />
    </div>
    {!row.locked && <div></div>}
    <div>
      <AssetBalanceCellValue
        render={row.tokens.gt(0)}
        tokens={row.tokens}
        fiat={row.fiat}
        symbol={symbol}
        locked={row.locked}
        balancesStatus={status}
        className={classNames(
          (status.status === "fetching" || row.isLoading) && "animate-pulse transition-opacity",
        )}
      />
    </div>
    {!!row.locked && row.meta && tokenId && (
      <LockedExtra
        tokenId={tokenId}
        address={row.address}
        isLoading={status.status === "fetching"}
        rowMeta={row.meta}
      />
    )}
  </div>
)

const LockedExtra: FC<{
  tokenId: TokenId
  address?: string // this is only set when browsing all accounts
  isLoading: boolean
  rowMeta: { poolId?: number; unbonding?: boolean }
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
    [data?.accounts, rowAddress],
  )

  const withdrawIn = useMemo(
    () =>
      !!rowMeta.unbonding && !!accountStatus?.canWithdrawIn
        ? formatDuration(intervalToDuration({ start: 0, end: accountStatus.canWithdrawIn }))
        : null,
    [accountStatus?.canWithdrawIn, rowMeta.unbonding],
  )

  if (!rowAddress) return null

  return (
    <div className="flex h-[6.6rem] flex-col items-end justify-center gap-2 whitespace-nowrap p-8 text-right">
      {rowMeta.unbonding ? (
        accountStatus?.canWithdraw ? (
          <NomPoolWithdrawButton tokenId={tokenId} address={rowAddress} variant="large" />
        ) : (
          <>
            <div className={classNames(isLoading && "animate-pulse transition-opacity")}>
              <div className="flex items-center gap-2">
                <ZapOffIcon className="shrink-0 text-sm" />
                <div>{t("Unbonding")}</div>
              </div>
            </div>
            {!!withdrawIn && (
              <div className="text-body-500 text-sm">
                {t("{{duration}} left", { duration: withdrawIn })}
              </div>
            )}
          </>
        )
      ) : accountStatus?.canUnstake || tokenId === "bittensor-substrate-native" ? (
        <UnbondButton
          tokenId={tokenId}
          address={rowAddress}
          variant="large"
          poolId={rowMeta.poolId}
        />
      ) : null}
    </div>
  )
}

type AssetsTableProps = {
  balances: Balances
  symbol: string
}

export const DashboardAssetDetails = ({ balances, symbol }: AssetsTableProps) => {
  const { balancesByChain: rows } = useAssetDetails(balances)

  if (rows.length === 0) return <NoTokensMessage symbol={symbol} />

  return (
    <div className="text-body-secondary">
      {rows.map(([chainId, bal]) => (
        <ChainTokenBalances key={chainId} chainId={chainId} balances={bal} />
      ))}
    </div>
  )
}
