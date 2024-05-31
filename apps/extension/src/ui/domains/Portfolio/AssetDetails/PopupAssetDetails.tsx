import { Balance, Balances, ChainId, EvmNetworkId } from "@extension/core"
import { FadeIn } from "@talisman/components/FadeIn"
import { ArrowDownIcon, CreditCardIcon, LockIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { api } from "@ui/api"
import { TokenContextMenu } from "@ui/apps/dashboard/routes/Portfolio/TokenContextMenu"
import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import Tokens from "@ui/domains/Asset/Tokens"
import { useCopyAddressModal } from "@ui/domains/CopyAddress"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { BalancesStatus } from "@ui/hooks/useBalancesStatus"
import { useSelectedCurrency } from "@ui/hooks/useCurrency"
import { useIsFeatureEnabled } from "@ui/hooks/useIsFeatureEnabled"
import { Suspense, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { PillButton } from "talisman-ui"

import { StaleBalancesIcon } from "../StaleBalancesIcon"
import { useSelectedAccount } from "../useSelectedAccount"
import { CopyAddressButton } from "./CopyAddressIconButton"
import { PortfolioAccount } from "./PortfolioAccount"
import { SendFundsButton } from "./SendFundsIconButton"
import { useAssetDetails } from "./useAssetDetails"
import { DetailRow, useChainTokenBalances } from "./useChainTokenBalances"
import { useUniswapV2BalancePair } from "./useUniswapV2BalancePair"

type AssetRowProps = {
  chainId: ChainId | EvmNetworkId
  balances: Balances
}

const ChainTokenBalances = ({ chainId, balances }: AssetRowProps) => {
  const { chainOrNetwork, summary, symbol, tokenId, detailRows, status, networkType } =
    useChainTokenBalances({ chainId, balances })

  // wait for data to load
  if (!chainOrNetwork || !summary || !symbol || balances.count === 0) return null

  const isUniswapV2LpToken = balances.sorted[0]?.source === "evm-uniswapv2"

  return (
    <div className={classNames("text-body-secondary text-sm")}>
      <div
        className={classNames(
          "bg-grey-800 flex w-full items-center gap-6 border-transparent px-7 py-6",
          detailRows.length ? "rounded-t-sm" : "rounded"
        )}
      >
        <div className="text-xl">
          <TokenLogo tokenId={tokenId} />
        </div>
        <div className="flex grow flex-col justify-center gap-2 pr-8">
          <div className="flex justify-between font-bold text-white">
            <div className="flex items-center">
              <ChainLogo className="mr-2" id={chainOrNetwork.id} />
              <span className="mr-2">{chainOrNetwork.name}</span>
              <CopyAddressButton networkId={chainOrNetwork.id} />
              <Suspense>
                <SendFundsButton symbol={symbol} networkId={chainOrNetwork.id} shouldClose />
              </Suspense>
            </div>
          </div>
          <div className="text-body-secondary flex justify-between text-xs">
            <div>{networkType}</div>
          </div>
        </div>
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
  const { account } = useSelectedAccount()
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
        isLastBalance && "rounded-b-sm"
      )}
    >
      {/* only show address when we're viewing balances for all accounts */}
      {!account && (
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
              status.status === "fetching" && "animate-pulse transition-opacity"
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
}: {
  row: DetailRow
  isLastRow?: boolean
  status: BalancesStatus
  symbol: string
}) => (
  <div
    className={classNames(
      "bg-black-secondary flex w-full items-center gap-8 px-7 py-6",
      isLastRow && "rounded-b-sm"
    )}
  >
    <div className="flex grow flex-col justify-center gap-2 overflow-hidden">
      <div className="font-bold text-white">{row.title}</div>
      {!!row.address && (
        <div className="text-xs">
          <PortfolioAccount address={row.address} />
        </div>
      )}
      {!row.address && row.description && (
        <div className="overflow-hidden text-ellipsis whitespace-nowrap text-xs">
          {row.description}
        </div>
      )}
    </div>
    <div
      className={classNames(
        "flex flex-col flex-nowrap justify-center gap-2 whitespace-nowrap text-right",
        status.status === "fetching" && "animate-pulse transition-opacity"
      )}
    >
      <div className={classNames("font-bold", row.locked ? "text-body-secondary" : "text-white")}>
        <Tokens amount={row.tokens} symbol={symbol} isBalance />
        {row.locked ? (
          <>
            {" "}
            <LockIcon className="lock inline align-baseline" />
          </>
        ) : null}
        {status.status === "stale" ? (
          <>
            {" "}
            <StaleBalancesIcon className="inline align-baseline" staleChains={status.staleChains} />
          </>
        ) : null}
      </div>
      <div className="text-xs">
        {row.fiat === null ? "-" : <Fiat amount={row.fiat} isBalance />}
      </div>
    </div>
  </div>
)

type AssetsTableProps = {
  balances: Balances
  symbol: string
}

const NoTokens = ({ symbol }: { symbol: string }) => {
  const { t } = useTranslation()
  const { account } = useSelectedAccount()
  const { open } = useCopyAddressModal()
  const { genericEvent } = useAnalytics()

  const handleCopy = useCallback(() => {
    open({
      address: account?.address,
      qr: true,
    })
    genericEvent("open receive", { from: "asset details" })
  }, [account?.address, genericEvent, open])

  const showBuyCrypto = useIsFeatureEnabled("BUY_CRYPTO")
  const handleBuyCryptoClick = useCallback(async () => {
    await api.modalOpen({ modalType: "buy" })
    window.close()
  }, [])

  return (
    <FadeIn>
      <div className="bg-field text-body-secondary leading-base rounded-sm p-10 text-center text-sm">
        <div>
          {account
            ? t("You don't have any {{symbol}} in this account", { symbol })
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

export const PopupAssetDetails = ({ balances, symbol }: AssetsTableProps) => {
  const { balancesByChain: rows } = useAssetDetails(balances)
  const hasBalance = useMemo(
    () => rows.some(([, balances]) => balances.each.some((b) => b.total.planck > 0n)),
    [rows]
  )

  if (!hasBalance) return <NoTokens symbol={symbol} />

  return (
    <FadeIn>
      <div className="flex flex-col gap-8">
        {rows.map(([chainId, bal]) => (
          <ChainTokenBalances key={chainId} chainId={chainId} balances={bal} />
        ))}
      </div>
    </FadeIn>
  )
}
