import { FolderIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"

import { AccountsIconContainer } from "./AllAccountsIcon"

export const AccountFolderIcon = ({ className, color }: { className?: string; color?: string }) => (
  <AccountsIconContainer className={classNames("rounded-xs", className)}>
    <FolderIcon className="text-primary w-full" style={{ color }} />
  </AccountsIconContainer>
)
