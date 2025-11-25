import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"

import { useBittensorBondWizard } from "../hooks/useBittensorBondWizard"

export const BittensorAvailableToUnstake = () => {
  const { dtaoToken, dtaoBalance } = useBittensorBondWizard()

  return (
    <div className="text-body-secondary flex items-center gap-2">
      <TokensAndFiat
        planck={dtaoBalance?.free.planck}
        tokenId={dtaoToken?.id}
        noCountUp
        tokensClassName="text-body"
      />
    </div>
  )
}
