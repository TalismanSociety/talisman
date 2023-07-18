import { Balances } from "@core/domains/balances/types"
import { FadeIn } from "@talisman/components/FadeIn"
import { ArrowDownIcon, CreditCardIcon, LockIcon } from "@talisman/theme/icons"
import { ChainId, EvmNetworkId } from "@talismn/chaindata-provider"
import { classNames } from "@talismn/util"
import { api } from "@ui/api"
import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import Fiat from "@ui/domains/Asset/Fiat"
import Tokens from "@ui/domains/Asset/Tokens"
import { useCopyAddressModal } from "@ui/domains/CopyAddress"
import { useSelectedAccount } from "@ui/domains/Portfolio/SelectedAccountContext"
import { StaleBalancesIcon } from "@ui/domains/Portfolio/StaleBalancesIcon"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useIsFeatureEnabled } from "@ui/hooks/useFeatures"
import { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { PillButton } from "talisman-ui"

import { CopyAddressButton } from "./CopyAddressIconButton"
import { PortfolioAccount } from "./PortfolioAccount"
import { SendFundsButton } from "./SendFundsIconButton"
import { useAssetDetails } from "./useAssetDetails"
import { useChainTokenBalances } from "./useChainTokenBalances"

type AssetRowProps = {
  chainId: ChainId | EvmNetworkId
  balances: Balances
}

const ChainTokenBalances = ({ chainId, balances }: AssetRowProps) => {
  const { chainOrNetwork, summary, symbol, detailRows, status, networkType } =
    useChainTokenBalances({ chainId, balances })

  // wait for data to load
  if (!chainOrNetwork || !summary || !symbol || balances.count === 0) return null

  return (
    <div className={classNames("text-body-secondary text-sm")}>
      <div
        className={classNames(
          "bg-grey-800 flex w-full items-center gap-6 border-transparent px-7 py-6",
          detailRows.length ? "rounded-t-sm" : "rounded"
        )}
      >
        <div className="text-xl">
          <ChainLogo id={chainOrNetwork.id} />
        </div>
        <div className="flex grow flex-col justify-center gap-2 pr-8">
          <div className="flex justify-between font-bold text-white">
            <div className="flex items-center">
              <span className="mr-2">{chainOrNetwork.name}</span>
              <CopyAddressButton symbol={symbol} networkId={chainOrNetwork.id} />
              <SendFundsButton symbol={symbol} networkId={chainOrNetwork.id} shouldClose />
            </div>
          </div>
          <div className="text-body-secondary flex justify-between text-xs">
            <div>{networkType}</div>
          </div>
        </div>
      </div>
      {detailRows
        .filter((row) => row.tokens.gt(0))
        .map((row, i, rows) => (
          <div
            key={row.key}
            className={classNames(
              "bg-black-secondary flex w-full items-center gap-8 px-7 py-6",
              rows.length === i + 1 && "rounded-b-sm"
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
              <div
                className={classNames(
                  "font-bold",
                  row.locked ? "text-body-secondary" : "text-white"
                )}
              >
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
                    <StaleBalancesIcon
                      className="inline align-baseline"
                      staleChains={status.staleChains}
                    />
                  </>
                ) : null}
              </div>
              <div className="text-xs">
                {row.fiat === null ? "-" : <Fiat currency="usd" amount={row.fiat} isBalance />}
              </div>
            </div>
          </div>
        ))}
    </div>
  )
}

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
      mode: "receive",
      address: account?.address,
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
            {t("Receive")}
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
  const { balancesByChain: rows, isLoading } = useAssetDetails(balances)
  const hasBalance = useMemo(
    () => rows.some(([, balances]) => balances.each.some((b) => b.total.planck > 0n)),
    [rows]
  )

  if (!hasBalance && isLoading) return null
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
