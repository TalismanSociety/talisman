import useAccounts from "@ui/hooks/useAccounts"
import Item, { IAccountItemOptions } from "./Item"
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
        <div className={className}>
          {accounts.map(({ address }) => (
            <Item key={address} address={address} {...options} />
          ))}
        </div>

        <AccountRenameModal />
        <AccountRemoveModal />
      </AccountRenameModalProvider>
    </AccountRemoveModalProvider>
  )
}

export default AccountList
