import { AccountJsonAny } from "@core/domains/accounts/types"
import Field from "@talisman/components/Field"
import { shortenAddress } from "@talisman/util/shortenAddress"
import { classNames } from "@talismn/util"
import { FC } from "react"

import { AccountTypeIcon } from "../Account/AccountTypeIcon"
import AccountAvatar from "../Account/Avatar"

export const ConnectAccountToggleButton: FC<{
  account: AccountJsonAny
  value: boolean
  onChange: () => void
  className?: string
}> = ({ account, value = false, className, onChange }) => {
  return (
    <button
      type="button"
      className={classNames(
        "bg-black-secondary hover:bg-grey-800 flex h-28 w-full items-center gap-5 rounded-sm px-8",
        className
      )}
      onClick={onChange}
    >
      <AccountAvatar address={account.address} genesisHash={account.genesisHash} />
      <div className="text-body-secondary text-md flex grow items-center gap-4 overflow-x-hidden text-left">
        <div className="overflow-x-hidden text-ellipsis whitespace-nowrap text-left">
          {account.name ?? shortenAddress(account.address)}
        </div>
        <div className="shrink-0 pb-1">
          <AccountTypeIcon origin={account.origin} className="text-primary-500" />
        </div>
      </div>
      <Field.Checkbox value={value} small />
    </button>
  )
}
