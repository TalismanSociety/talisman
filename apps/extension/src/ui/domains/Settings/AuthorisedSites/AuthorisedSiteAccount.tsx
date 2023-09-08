import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { AccountTypeIcon } from "@ui/domains/Account/AccountTypeIcon"
import { Address } from "@ui/domains/Account/Address"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import { ChangeEventHandler, FC, useCallback } from "react"
import { Toggle } from "talisman-ui"

export const AuthorisedSiteAccount: FC<{
  address: string
  isConnected: boolean
  onChange: (val: boolean) => void
}> = ({ address, isConnected, onChange }) => {
  const account = useAccountByAddress(address)

  const handleChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      onChange(e.target.checked)
    },
    [onChange]
  )

  if (!account) return null

  return (
    <div className="flex h-20 w-full items-center gap-4">
      <div className="flex h-20 grow items-center gap-4 overflow-x-hidden">
        <AccountIcon
          className="text-lg"
          address={account.address}
          genesisHash={account.genesisHash}
        />
        <div className="text-body-secondary truncate text-base">
          {account.name ?? <Address address={account.address} />}
        </div>
        <AccountTypeIcon origin={account.origin} className="text-primary-500 text-md" />
      </div>
      <Toggle checked={isConnected} onChange={handleChange} />
    </div>
  )
}
