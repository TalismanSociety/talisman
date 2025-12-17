import type { ReactNode } from "react"
import { Token } from "@talismn/chaindata-provider"
import { classNames } from "@talismn/util"
import { Suspense } from "react"

import { SuspenseTracker } from "@talisman/components/SuspenseTracker"

import { BondAccountPillButton } from "../../Bond/BondAccountPillButton"
import { AssetPill } from "./AssetPill"

type BittensorAssetAccountSummaryProps = {
  token: Token | null | undefined
  accountAddress?: string
  onAccountClick: () => void
  suspenseName?: string
  className?: string
  assetLabel: ReactNode
  accountLabel: ReactNode
}

export const BittensorAssetAccountSummary = ({
  token,
  accountAddress,
  onAccountClick,
  suspenseName = "AccountPillButton",
  className,
  assetLabel,
  accountLabel,
}: BittensorAssetAccountSummaryProps) => {
  return (
    <div
      className={classNames(
        "bg-grey-900 leading-paragraph flex flex-col gap-4 rounded p-4 text-sm",
        className,
      )}
    >
      <div className="flex h-16 items-center justify-between gap-4">
        <div className="whitespace-nowrap">{assetLabel}</div>
        <div className="overflow-hidden">{token && <AssetPill token={token} />}</div>
      </div>
      <div className="flex h-16 items-center justify-between gap-4">
        <div className="whitespace-nowrap">{accountLabel}</div>
        <div className="overflow-hidden">
          <Suspense fallback={<SuspenseTracker name={suspenseName} />}>
            <BondAccountPillButton address={accountAddress} onClick={onAccountClick} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
