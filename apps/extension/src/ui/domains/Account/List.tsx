import useAccounts from "@ui/hooks/useAccounts"
import Item, { IAccountItemOptions } from "./Item"
import { AddressFormatterModal, AddressFormatterModalProvider } from "./AddressFormatterModal"
import { AccountRenameModal, AccountRenameModalProvider } from "./AccountRenameModal"
import { AccountRemoveModal, AccountRemoveModalProvider } from "./AccountRemoveModal"

export interface IAccountList extends IAccountItemOptions {
  className?: string
}

const AccountList = ({ className, ...options }: IAccountList) => {
  const accounts = useAccounts()

  return (
    <AccountRemoveModalProvider>
      <AccountRenameModalProvider>
        <AddressFormatterModalProvider>
          <div className={className}>
            {accounts.map(({ address }) => (
              <Item key={address} address={address} {...options} />
            ))}
          </div>
          <AddressFormatterModal />
          <AccountRenameModal />
          <AccountRemoveModal />
        </AddressFormatterModalProvider>
      </AccountRenameModalProvider>
    </AccountRemoveModalProvider>
  )
}

export default AccountList
