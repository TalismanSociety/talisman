import { BalanceFormatter, Balances, ONE_ALPHA_TOKEN } from "@talismn/balances"
import { TokenId } from "@talismn/chaindata-provider"
import { type TokenRates } from "@talismn/token-rates"
import { classNames } from "@talismn/util"
import { ReactNode, Suspense } from "react"

import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { AssetLogo } from "@ui/domains/Asset/AssetLogo"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { type TokenBalances } from "@ui/domains/Portfolio/AssetDetails/useTokenBalances"
import { StakeType } from "@ui/domains/Staking/Bittensor/hooks/useBittensorBondWizard"
import { CHAIN_INFO, DTAO_LOGO, ROOT_NETUID } from "@ui/domains/Staking/Bittensor/utils/constants"
import { BondButton } from "@ui/domains/Staking/Bond/BondButton"
import { type CombinedSubnetData } from "@ui/domains/Staking/hooks/bittensor/dTao/useCombinedSubnetData"
import { useSelectedCurrency } from "@ui/state"

import { calculateTaoFromAlphaStaked } from "../../utils/subtensor"
import { CopyAddressButton } from "../CopyAddressIconButton"
import { AssetPercentageChange } from "../DashboardTokenBalances/AssetPercentageChange"
import { SendFundsTokenButton } from "../SendFundsTokenIconButton"
import { TokenContextMenu } from "../TokenContextMenu"
import { type BalanceDetailRow } from "../useTokenBalances"
import { TokenBalancesDetailRow } from "./TokenBalancesDetailRow"

type BittensorTokenBalanceProps = {
  listKey: string
  groupedStakesByNetuid: BalanceDetailRow[]
  combinedSubnetData: CombinedSubnetData
  tokenBalances: TokenBalances
  tokenRates: TokenRates | null
  balances: Balances
  tokenId: TokenId
}

export const BittensorTokenBalanceList = ({
  listKey,
  groupedStakesByNetuid,
  combinedSubnetData,
  tokenBalances,
  tokenRates,
  balances,
  tokenId,
}: BittensorTokenBalanceProps) => {
  const currency = useSelectedCurrency()
  const isChainIfo = listKey === CHAIN_INFO
  const isRootStake = Number(listKey) === ROOT_NETUID
  const [fistGroupStake] = groupedStakesByNetuid ?? []
  const { network: chainOrNetwork, token, detailRows, status, networkType } = tokenBalances
  const { subnetData, isError, isLoading, isFetchingNextPage } = combinedSubnetData
  const {
    price_change_1_day,
    subnet_name,
    alpha_in_pool,
    total_tao,
    symbol: subnetTokenSymbol,
  } = subnetData[Number(listKey)] ?? {}

  // wait for data to load
  if (!chainOrNetwork || !token || balances.count === 0) return null

  // Destruct data from the first stake in the group, as the data is the destructed data is the  same for all stakes in the group
  const {
    meta: {
      alphaToTaoRate,
      dynamicInfo: {
        subnetIdentity: { subnetName = subnet_name } = {},
        tokenSymbol = subnetTokenSymbol,
      } = {},
    } = {},
  } = fistGroupStake

  const subnetListName = `${listKey} | ${subnetName} ${tokenSymbol || ""}`.trim()
  const chainName = isRootStake || isChainIfo ? chainOrNetwork.name || "" : subnetListName

  const symbol = isRootStake ? token.symbol : tokenSymbol

  const taoStatsRate = Math.trunc(
    calculateTaoFromAlphaStaked({
      alphaIn: Number(alpha_in_pool),
      taoIn: Number(total_tao),
      alphaStaked: Number(ONE_ALPHA_TOKEN.toString()),
    }),
  ).toString()

  const formatter = new BalanceFormatter(
    BigInt(Number(alphaToTaoRate) > 0 ? alphaToTaoRate : taoStatsRate),
    token?.decimals,
    tokenRates,
  )

  const assetPriceInfo = !isRootStake && !isChainIfo && (
    <div className="flex items-center space-x-2">
      <Fiat amount={formatter?.fiat(currency) ?? 0} noCountUp />
      <AssetPercentageChange
        priceChange={price_change_1_day}
        isError={isError}
        isLoading={isFetchingNextPage || isLoading}
      />
    </div>
  )

  const rowNetworkType = isChainIfo ? networkType : isRootStake ? "Root" : ""

  return (
    <TokenBalancesList
      stakeType={isRootStake || isChainIfo ? "root" : "subnet"}
      netuid={Number(listKey)}
      tokenId={tokenId}
      tokenLogoUrl={!isChainIfo && !isRootStake ? DTAO_LOGO : undefined}
      balances={balances}
      detailRowsLength={detailRows.length}
      chainOrNetworkId={chainOrNetwork.id}
      chainOrNetworkName={chainName}
      assetPriceInfo={assetPriceInfo}
      networkType={rowNetworkType}
      shouldDisplayActionBtns={isChainIfo}
    >
      {groupedStakesByNetuid?.map((row, i, rows) => {
        const { meta: { dynamicInfo = {} } = {}, title } = row

        const balanceDetailSymbol = title.toLowerCase().includes("subnet")
          ? dynamicInfo?.tokenSymbol
          : symbol

        return (
          <TokenBalancesDetailRow
            netuid={Number(listKey)}
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
    </TokenBalancesList>
  )
}

type TokenBalancesListProps = {
  tokenId: TokenId
  tokenLogoUrl?: string
  balances: Balances
  detailRowsLength: number
  chainOrNetworkId: string
  chainOrNetworkName: string
  networkType?: string
  assetPriceInfo?: ReactNode
  children: ReactNode
  shouldDisplayActionBtns?: boolean
  stakeType?: StakeType
  netuid?: number
}

export const TokenBalancesList = ({
  tokenId,
  tokenLogoUrl,
  balances,
  detailRowsLength,
  chainOrNetworkId,
  chainOrNetworkName,
  networkType,
  assetPriceInfo,
  children,
  shouldDisplayActionBtns = true,
  stakeType,
  netuid,
}: TokenBalancesListProps) => {
  return (
    <div className={classNames("text-body-secondary text-sm")}>
      <div
        className={classNames(
          "bg-grey-800 flex w-full items-center gap-6 border-transparent px-7 py-6",
          detailRowsLength ? "rounded-t-sm" : "rounded",
        )}
      >
        <div className="text-xl">
          {tokenLogoUrl ? <AssetLogo url={tokenLogoUrl} /> : <TokenLogo tokenId={tokenId} />}
        </div>
        <div className="flex grow flex-col justify-center gap-2 pr-8">
          <div className="flex grow justify-between font-bold text-white">
            <div className="flex items-center">
              <NetworkLogo className="mr-2" networkId={chainOrNetworkId} />
              <span className="mr-2 truncate">{chainOrNetworkName}</span>
              {shouldDisplayActionBtns && (
                <>
                  <CopyAddressButton networkId={chainOrNetworkId} />
                  <Suspense fallback={<SuspenseTracker name="ChainTokenBalances.Buttons" />}>
                    <SendFundsTokenButton tokenId={tokenId} shouldClose />
                  </Suspense>
                </>
              )}
            </div>
          </div>
          <div className="text-body-secondary flex justify-between text-xs">
            {assetPriceInfo && assetPriceInfo}
            {networkType && <div>{networkType}</div>}
          </div>
        </div>
        {tokenId && (
          <div className="size-[3.8rem] shrink-0 empty:hidden">
            <Suspense fallback={<SuspenseTracker name="StakeButton" />}>
              <BondButton
                tokenId={tokenId}
                balances={balances}
                stakeType={stakeType}
                netuid={netuid}
              />
            </Suspense>
          </div>
        )}
        {tokenId && shouldDisplayActionBtns && (
          <TokenContextMenu
            tokenId={tokenId}
            className="hover:bg-grey-700 focus-visible:bg-grey-700 rounded-xs"
          />
        )}
      </div>
      {children}
    </div>
  )
}
