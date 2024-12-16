import { shortenAddress } from "@talisman/util/shortenAddress"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { Fiat } from "@ui/domains/Asset/Fiat"

import { AccountWithBalance } from "./RampBuyForm"

type RampAccountOptionProps = {
  account: AccountWithBalance
}

export const RampAccountOption = ({ account }: RampAccountOptionProps) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-5">
        <AccountIcon className="!text-xl" address={account.address} />
        <div>
          <div className="text-white">{account.name}</div>
          <div className="text-tiny">{shortenAddress(account.address)}</div>
        </div>
      </div>
      <Fiat amount={account.total} isBalance noCountUp className="text-sm" />
    </div>
  )
}
