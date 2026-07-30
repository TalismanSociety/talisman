import type { Balances } from "@talismn/balances"
import type { TokenId } from "@talismn/chaindata-provider"
import { SuspenseTracker } from "@ui/components/SuspenseTracker"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { NetworkName } from "@ui/domains/Networks/NetworkName"
import { BondButton } from "@ui/domains/Staking/Bond/BondButton"
import { useNetworkById, useToken } from "@ui/state/chaindata"
import { cn } from "@ui/util/cn"
import { type ReactNode, Suspense } from "react"
import { useTranslation } from "react-i18next"

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
  const { t } = useTranslation()
  const token = useToken(tokenId)
  const network = useNetworkById(chainOrNetworkId)

  if (!token) return null

  return (
    <div className={cn("text-body-secondary text-sm")}>
      <div
        className={cn(
          "flex w-full items-center gap-4 overflow-hidden border-transparent bg-grey-800 px-7 py-6",
          detailRowsLength ? "rounded-t-sm" : "rounded"
        )}
      >
        <div className="text-xl">
          <TokenLogo tokenId={tokenId} />
        </div>
        <div className="flex grow flex-col justify-center gap-2 overflow-hidden pr-8">
          <div className="flex grow items-center gap-3">
            <div className="truncate font-bold text-body">{token.name}</div>
            <div className="flex items-center">
              <CopyAddressButton networkId={chainOrNetworkId} />
              <BittensorUnstakeButton balances={balances} />
              <Suspense fallback={<SuspenseTracker name="ChainTokenBalances.Buttons" />}>
                <SendFundsTokenButton tokenId={tokenId} shouldClose />
              </Suspense>
              {!!network?.isTestnet && (
                <span className="ml-3 rounded bg-alert-warn/10 px-3 py-1 align-middle font-light text-alert-warn text-tiny">
                  {t("Testnet")}
                </span>
              )}
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
        <div className="size-9.5 shrink-0 empty:hidden">
          <Suspense fallback={<SuspenseTracker name="StakeButton" />}>
            <BondButton balances={balances} />
          </Suspense>
        </div>
        {tokenId && (
          <div className="size-9.5 shrink-0">
            <TokenContextMenu
              tokenId={tokenId}
              className="rounded-full hover:bg-grey-700 focus-visible:bg-grey-700"
            />
          </div>
        )}
      </div>
      {children}
    </div>
  )
}
