import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"

import { useBittensorBondWizard } from "../hooks/useBittensorBondWizard"

export const BittensorAvailableToUnstake = () => {
  const { dtaoToken, dtaoBalance } = useBittensorBondWizard()

  return (
    <div className="flex items-center gap-2 text-body-secondary">
      <TokensAndFiat
        planck={dtaoBalance?.free.planck}
        tokenId={dtaoToken?.id}
        noCountUp
        tokensClassName="text-body"
      />
    </div>
  )
}
