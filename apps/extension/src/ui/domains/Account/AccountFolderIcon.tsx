import { FolderIcon } from "@talisman/theme/icons"

import { AccountsIconContainer } from "./AllAccountsIcon"

export const AccountFolderIcon = ({ className, color }: { className?: string; color?: string }) => (
  <AccountsIconContainer className={className}>
    <FolderIcon className="text-primary w-full" style={{ color }} />
  </AccountsIconContainer>
)
