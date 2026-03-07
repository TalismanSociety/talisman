import { getAccountGenesisHash } from "@core/domains/keyring/exports"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { AccountTypeIcon } from "@ui/domains/Account/AccountTypeIcon"
import { Address } from "@ui/domains/Account/Address"
import { useAccountByAddress } from "@ui/state/accounts"
import { Toggle } from "@ui/talisman-ui/components/Toggle"
import { type ChangeEventHandler, type FC, useCallback } from "react"

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
          genesisHash={getAccountGenesisHash(account)}
        />
        <div className="truncate text-base text-body-secondary">
          {account.name ?? <Address address={account.address} />}
        </div>
        <AccountTypeIcon type={account.type} className="text-md text-primary-500" />
      </div>
      <Toggle checked={isConnected} onChange={handleChange} />
    </div>
  )
}
