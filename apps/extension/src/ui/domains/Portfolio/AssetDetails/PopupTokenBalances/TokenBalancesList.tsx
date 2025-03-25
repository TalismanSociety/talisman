import { TokenId } from "@talismn/chaindata-provider"
import { classNames } from "@talismn/util"
import { Balances } from "extension-core"
import { ReactNode, Suspense } from "react"

import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { BondButton } from "@ui/domains/Staking/Bond/BondButton"

import { CopyAddressButton } from "../CopyAddressIconButton"
import { SendFundsTokenButton } from "../SendFundsTokenIconButton"
import { TokenContextMenu } from "../TokenContextMenu"

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
  shouldDisplayStakeBtn?: boolean // TODO: This prop should be removed once dTao stake is implemented
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
  shouldDisplayStakeBtn = true,
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
          <TokenLogo tokenId={tokenId} url={tokenLogoUrl} />
        </div>
        <div className="flex grow flex-col justify-center gap-2 pr-8">
          <div className="flex grow justify-between font-bold text-white">
            <div className="flex items-center">
              <ChainLogo className="mr-2" id={chainOrNetworkId} />
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
        {tokenId && shouldDisplayStakeBtn && (
          <div className="size-[3.8rem] shrink-0 empty:hidden">
            <Suspense fallback={<SuspenseTracker name="StakeButton" />}>
              <BondButton tokenId={tokenId} balances={balances} />
            </Suspense>
          </div>
        )}
        {tokenId && shouldDisplayActionBtns && (
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
