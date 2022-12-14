import { Balances } from "@core/domains/balances/types"
import useAccountByAddress from "@ui/hooks/useAccountByAddress"

import NamedAddress, { NamedAddressOptions } from "./NamedAddress"

export interface IAccountName extends NamedAddressOptions {
  address: string
  balances?: Balances
  className?: string
}

const AccountName = ({ address, ...props }: IAccountName) => {
  const account = useAccountByAddress(address)
  if (!account) return null

  return (
    <NamedAddress
      address={address}
      name={account.name ?? "Unnamed Account"}
      genesisHash={account.genesisHash}
      {...props}
    />
  )
}

export default AccountName
