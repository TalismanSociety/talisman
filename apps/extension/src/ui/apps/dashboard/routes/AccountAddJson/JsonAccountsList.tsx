import { AccountType } from "@core/domains/accounts/types"
import { CheckCircleIcon, LockIcon, UnlockIcon } from "@talisman/theme/icons"
import { shortenAddress } from "@talisman/util/shortenAddress"
import { classNames } from "@talismn/util"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { AccountTypeIcon } from "@ui/domains/Account/AccountTypeIcon"
import { FC, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Checkbox, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

export type JsonImportAccount = {
  id: string
  address: string
  name: string
  genesisHash: string
  origin: AccountType
  selected: boolean
  isLocked: boolean
  isPrivateKeyAvailable: boolean
  isExisting: boolean
}

const JsonAccount: FC<{ account: JsonImportAccount; onSelect: (select: boolean) => void }> = ({
  account,
  onSelect,
}) => {
  const { t } = useTranslation("account-add")
  const handleClick = useCallback(() => {
    onSelect(!account.selected)
  }, [onSelect, account])

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div>
          <button
            tabIndex={-1}
            type="button"
            className="bg-grey-900 text-body enabled:hover:bg-grey-800 flex h-32 w-full shrink-0 cursor-pointer items-center gap-10 rounded-sm px-8 text-left disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleClick}
            disabled={!account.isPrivateKeyAvailable || account.isExisting}
          >
            <AccountIcon
              className="text-xl"
              address={account.address}
              genesisHash={account.genesisHash}
            />
            <div className="flex grow flex-col gap-2">
              <div className=" text-base">
                {account.name} <AccountTypeIcon origin={account.origin as AccountType} />
              </div>
              <div className="text-body-secondary text-sm">{shortenAddress(account.address)}</div>
            </div>
            <div>$6,282.50</div>
            {account.isExisting || !account.isPrivateKeyAvailable ? (
              <div className="w-8 shrink-0"></div>
            ) : account.isLocked ? (
              // text-brand-orange
              <LockIcon className="text-alert-warn shrink-0" />
            ) : (
              <UnlockIcon className="text-primary shrink-0" />
            )}

            {account.isExisting ? (
              <div className="w-[1.92rem] shrink-0 text-center">
                <CheckCircleIcon className="text-primary-500" />
              </div>
            ) : (
              <Checkbox
                readOnly
                checked={account.selected}
                disabled={!account.isPrivateKeyAvailable || account.isExisting}
              />
            )}
          </button>
        </div>
      </TooltipTrigger>
      {account.isExisting ? (
        <TooltipContent>{t("This account already exists.")}</TooltipContent>
      ) : !account.isPrivateKeyAvailable ? (
        <TooltipContent>{t("Private key is not available.")}</TooltipContent>
      ) : null}
    </Tooltip>
  )
}

export const JsonImportAccountsList: FC<{
  accounts: JsonImportAccount[]
  onSelectAccount: (account: string, select: boolean) => void
  onSelectAll: () => void
  onSelectNone: () => void
}> = ({ accounts, onSelectAccount, onSelectAll, onSelectNone }) => {
  const { selected, total } = useMemo(() => {
    const selected = accounts.filter((a) => a.selected).length
    const total = accounts.length
    return { selected, total }
  }, [accounts])

  const handleSelect = useCallback(
    (id: string) => (select: boolean) => {
      onSelectAccount(id, select)
    },
    [onSelectAccount]
  )

  return (
    <div>
      <div className={classNames("flex px-8", accounts.length > 4 && "pr-12")}>
        <div className="grow">
          Selected Accounts <span className="text-primary ml-4">{selected}</span>
          <span className="text-grey-500 text-sm">/{total}</span>
        </div>
        {accounts.length > 1 && (
          <div className="text-grey-500 flex gap-4">
            <button type="button" className="hover:text-grey-400" onClick={onSelectNone}>
              Clear
            </button>
            <div>|</div>
            <button type="button" className="hover:text-grey-400" onClick={onSelectAll}>
              Select all
            </button>
          </div>
        )}
      </div>
      <div
        className={classNames(
          "scrollable scrollable-800 mt-6 flex max-h-[28rem] flex-col gap-4 overflow-y-auto",
          accounts.length > 4 && "pr-4"
        )}
      >
        {accounts.map((acc, i) => (
          <JsonAccount key={i} account={acc} onSelect={handleSelect(acc.id)} />
        ))}
      </div>
    </div>
  )
}
