import { Balances } from "@core/domains/balances/types"
import { Address } from "@core/types/base"
import { ChainId, EvmNetworkId } from "@talismn/chaindata-provider"
import { classNames } from "@talismn/util"
import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { AssetBalanceCellValue } from "@ui/domains/Portfolio/AssetBalanceCellValue"
import { NoTokensMessage } from "@ui/domains/Portfolio/NoTokensMessage"
import { Suspense } from "react"
import { useTranslation } from "react-i18next"

import { CopyAddressButton } from "./CopyAddressIconButton"
import { PortfolioAccount } from "./PortfolioAccount"
import { SendFundsButton } from "./SendFundsIconButton"
import { useAssetDetails } from "./useAssetDetails"
import { useChainTokenBalances } from "./useChainTokenBalances"

const AssetState = ({
  title,
  description,
  render,
  address,
}: {
  title: string
  description?: string
  render: boolean
  address?: Address
}) => {
  if (!render) return null
  return (
    <div className="flex h-[6.6rem] flex-col justify-center gap-2 p-8">
      <div className="flex items-baseline gap-4">
        <div className="whitespace-nowrap font-bold text-white">{title}</div>
        {/* show description next to title when address is set */}
        {description && address && (
          <div className="max-w-sm flex-shrink-0 overflow-hidden text-ellipsis whitespace-nowrap text-sm">
            {description}
          </div>
        )}
      </div>
      {address && (
        <div className="text-sm">
          <PortfolioAccount address={address} />
        </div>
      )}
      {/* show description below title when address is not set */}
      {description && !address && (
        <div className="flex-shrink-0 overflow-hidden text-ellipsis whitespace-nowrap text-sm">
          {description}
        </div>
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

  return (
    <div className="mb-8">
      <div
        className={classNames(
          "bg-grey-800 grid grid-cols-[40%_30%_30%]",
          detailRows.length ? "rounded-t" : "rounded"
        )}
      >
        <div className="flex">
          <div className="p-8 text-xl">
            <TokenLogo tokenId={tokenId} />
          </div>
          <div className="flex grow flex-col justify-center gap-2 whitespace-nowrap">
            <div className="base text-body flex items-center font-bold">
              <ChainLogo className="mr-2" id={chainOrNetwork.id} />
              <span className="mr-2">{chainOrNetwork.name}</span>
              <CopyAddressButton networkId={chainOrNetwork.id} />
              <Suspense>
                <SendFundsButton symbol={symbol} networkId={chainOrNetwork.id} />
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
              status.status === "fetching" && "animate-pulse transition-opacity"
            )}
          />
        </div>
        <div>
          <AssetBalanceCellValue
            render
            tokens={summary.availableTokens}
            fiat={summary.availableFiat}
            symbol={symbol}
            tooltip={t("Total Available Balance")}
            balancesStatus={status}
            className={classNames(
              status.status === "fetching" && "animate-pulse transition-opacity"
            )}
          />
        </div>
      </div>
      {detailRows
        .filter((row) => row.tokens.gt(0))
        .map((row, i, rows) => (
          <div
            key={row.key}
            className={classNames(
              "bg-grey-850 grid grid-cols-[40%_30%_30%]",
              rows.length === i + 1 && "rounded-b"
            )}
          >
            <div>
              <AssetState
                title={row.title}
                description={row.description}
                render
                address={row.address}
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
                  status.status === "fetching" && "animate-pulse transition-opacity"
                )}
              />
            </div>
            {!!row.locked && (
              <div>
                {
                  // Show `Unbonding` next to nompool staked balances which are unbonding
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (row.meta as any)?.type === "nompool" && !!(row.meta as any)?.unbonding && (
                    <div
                      className={classNames(
                        "flex h-[6.6rem] flex-col justify-center gap-2 whitespace-nowrap p-8 text-right",
                        status.status === "fetching" && "animate-pulse transition-opacity"
                      )}
                    >
                      <div className="text-body flex items-center justify-end gap-2">
                        <div>{t("Unbonding")}</div>
                      </div>
                      {/* TODO: Show time until funds are unbonded */}
                      {/* <div>4d 14hr 11min</div> */}
                    </div>
                  )
                }
              </div>
            )}
          </div>
        ))}
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
