import { LockIcon } from "@talismn/icons"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"

import { useBittensorBondWizard } from "../hooks/useBittensorBondWizard"

export const BittensorAvailableToUnstake = () => {
  const { dtaoToken, availableToUnstakePlancks } = useBittensorBondWizard()

  return (
    <div className="flex items-center gap-2 text-body-secondary">
      <TokensAndFiat
        planck={availableToUnstakePlancks}
        tokenId={dtaoToken?.id}
        noCountUp
        tokensClassName="text-body"
      />
    </div>
  )
}

export const BittensorConvictionLockedRow = () => {
  const { dtaoToken, convictionLock } = useBittensorBondWizard()

  // ghost locks (zero mass, residual conviction) lock nothing — don't render a "0 locked" row
  if (!convictionLock || convictionLock.amount <= 0n) return null

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 whitespace-nowrap">
        <LockIcon className="shrink-0" />
        {convictionLock.label}
      </div>
      <div className="flex items-center gap-2 text-body-secondary">
        <TokensAndFiat
          planck={convictionLock.amount}
          tokenId={dtaoToken?.id}
          noCountUp
          tokensClassName="text-body"
        />
      </div>
    </div>
  )
}
