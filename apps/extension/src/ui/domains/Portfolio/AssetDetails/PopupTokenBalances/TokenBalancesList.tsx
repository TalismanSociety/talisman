import { Balances } from "@talismn/balances"
import { TokenId } from "@talismn/chaindata-provider"
import { classNames } from "@talismn/util"
import { ReactNode, Suspense } from "react"

import { SuspenseTracker } from "@talisman/components/SuspenseTracker"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { NetworkName } from "@ui/domains/Networks/NetworkName"
import { BondButton } from "@ui/domains/Staking/Bond/BondButton"
import { useToken } from "@ui/state"

import { BittensorUnstakeButton } from "../BittensorUnstakeButton"
import { CopyAddressButton } from "../CopyAddressIconButton"
import { BittensorValidatorName } from "../DashboardTokenBalances/BittensorValidatorName"
import { SendFundsTokenButton } from "../SendFundsTokenIconButton"
import { TokenContextMenu } from "../TokenContextMenu"

type TokenBalancesListProps = {
  tokenId: TokenId
  balances: Balances
  detailRowsLength: number
  chainOrNetworkId: string
  children: ReactNode
}

export const TokenBalancesList = ({
  tokenId,
  balances,
  detailRowsLength,
  chainOrNetworkId,
  children,
}: TokenBalancesListProps) => {
  const token = useToken(tokenId)

  if (!token) return null

  return (
    <div className={classNames("text-body-secondary text-sm")}>
      <div
        className={classNames(
          "bg-grey-800 flex w-full items-center gap-4 overflow-hidden border-transparent px-7 py-6",
          detailRowsLength ? "rounded-t-sm" : "rounded",
        )}
      >
        <div className="text-xl">
          <TokenLogo tokenId={tokenId} />
        </div>
        <div className="flex grow flex-col justify-center gap-2 overflow-hidden pr-8">
          <div className="flex grow items-center gap-3">
            <div className="text-body truncate font-bold">{token.name}</div>
            <div className="flex items-center">
              <CopyAddressButton networkId={chainOrNetworkId} />
              <BittensorUnstakeButton balances={balances} />
              <Suspense fallback={<SuspenseTracker name="ChainTokenBalances.Buttons" />}>
                <SendFundsTokenButton tokenId={tokenId} shouldClose />
              </Suspense>
            </div>
          </div>
          <div className="flex w-full items-center gap-2 overflow-hidden">
            <NetworkLogo networkId={chainOrNetworkId} />
            <span className="truncate">
              <NetworkName networkId={chainOrNetworkId} />
              {token.type === "substrate-dtao" && (
                <BittensorValidatorName
                  hotkey={token.hotkey}
                  prefix=" | "
                  className="text-body-secondary text-sm"
                />
              )}
            </span>
          </div>
        </div>
        <div className="size-[3.8rem] shrink-0 empty:hidden">
          <Suspense fallback={<SuspenseTracker name="StakeButton" />}>
            <BondButton balances={balances} />
          </Suspense>
        </div>
        {tokenId && (
          <div className="size-[3.8rem] shrink-0">
            <TokenContextMenu
              tokenId={tokenId}
              className="hover:bg-grey-700 focus-visible:bg-grey-700 rounded-full"
            />
          </div>
        )}
      </div>
      {children}
    </div>
  )
}
