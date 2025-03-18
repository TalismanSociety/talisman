import { TokenId } from "@talismn/chaindata-provider"
import { classNames } from "@talismn/util"
import { ReactNode, Suspense } from "react"

import { Balances } from "@extension/core"
import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { BondButton } from "@ui/domains/Staking/Bond/BondButton"
import { BalancesStatus } from "@ui/hooks/useBalancesStatus"
import { UseTokenReturnType } from "@ui/state"

import { BalanceSummary } from "../../useTokenBalancesSummary"
import { CopyAddressButton } from "../CopyAddressIconButton"
import { SendFundsTokenButton } from "../SendFundsTokenIconButton"
import { TokenContextMenu } from "../TokenContextMenu"

type TokenBalancesListProps = {
  tokenId: TokenId
  token: UseTokenReturnType
  balances: Balances
  detailRowsLength: number
  chainOrNetworkId: string
  chainOrNetworkName: string
  networkType?: string
  assetPriceInfo?: ReactNode
  summary: BalanceSummary
  status: BalancesStatus
  children: ReactNode
  shouldDisplayChainLogo?: boolean
  symbol: string
}

// TODO: Double check if these props are really needed or not.

export const TokenBalancesList = ({
  tokenId,
  // token,
  balances,
  detailRowsLength,
  chainOrNetworkId,
  chainOrNetworkName,
  networkType,
  assetPriceInfo,
  // summary,
  // status,
  children,
  // shouldDisplayChainLogo = true,
  // symbol,
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
          <TokenLogo tokenId={tokenId} />
        </div>
        <div className="flex grow flex-col justify-center gap-2 pr-8">
          <div className="flex grow justify-between font-bold text-white">
            <div className="flex items-center">
              <ChainLogo className="mr-2" id={chainOrNetworkId} />
              <span className="mr-2 truncate">{chainOrNetworkName}</span>
              <CopyAddressButton networkId={chainOrNetworkId} />
              <Suspense fallback={<SuspenseTracker name="ChainTokenBalances.Buttons" />}>
                <SendFundsTokenButton tokenId={tokenId} shouldClose />
              </Suspense>
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
      {children}
    </div>
  )
}
