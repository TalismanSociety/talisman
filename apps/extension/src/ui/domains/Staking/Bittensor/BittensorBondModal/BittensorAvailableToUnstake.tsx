import { Fiat } from "@ui/domains/Asset/Fiat"
import { Tokens } from "@ui/domains/Asset/Tokens"
import { useSelectedCurrency } from "@ui/state"

import { useBittensorBondWizard } from "../hooks/useBittensorBondWizard"

export const BittensorAvailableToUnstake = () => {
  const { dtaoToken, dtaoBalance } = useBittensorBondWizard()
  const currency = useSelectedCurrency()

  return (
    <div className="text-body flex items-center gap-2">
      <Tokens
        amount={dtaoBalance?.free.tokens}
        decimals={dtaoToken?.decimals}
        symbol={dtaoToken?.symbol}
        className="max-w-[15rem] truncate"
      />
      <Fiat amount={dtaoBalance?.free.fiat(currency)} />
    </div>
  )
}
