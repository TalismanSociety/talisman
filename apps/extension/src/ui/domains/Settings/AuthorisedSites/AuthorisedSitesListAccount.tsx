import Field from "@talisman/components/Field"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { AccountTypeIcon } from "@ui/domains/Account/AccountTypeIcon"
import { Address } from "@ui/domains/Account/Address"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import { FC } from "react"

export const AuthorisedSitesListAccount: FC<{
  address: string
  isConnected: boolean
  onChange: () => void
}> = ({ address, isConnected, onChange }) => {
  const account = useAccountByAddress(address)

  if (!account) return null

  return (
    <div className="flex h-20 w-full items-center">
      <div className="flex h-20 grow items-center gap-3 overflow-x-hidden">
        <AccountIcon
          className="text-lg"
          address={account.address}
          genesisHash={account.genesisHash}
        />
        <div className="text-body-secondary text-md overflow-x-hidden text-ellipsis whitespace-nowrap">
          {account.name ?? <Address address={account.address} />}
        </div>
        <AccountTypeIcon origin={account.origin} className="text-primary-500 text-md" />
      </div>
      <div>
        <Field.Toggle value={isConnected} onChange={onChange} />
      </div>
    </div>
  )
}
