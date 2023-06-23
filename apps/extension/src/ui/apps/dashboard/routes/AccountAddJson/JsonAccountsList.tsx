import { AccountType } from "@core/domains/accounts/types"
import { AlertCircleIcon, CheckCircleIcon, LockIcon, UnlockIcon } from "@talisman/theme/icons"
import { shortenAddress } from "@talisman/util/shortenAddress"
import { Balances } from "@talismn/balances"
import { classNames } from "@talismn/util"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { AccountTypeIcon } from "@ui/domains/Account/AccountTypeIcon"
import Fiat from "@ui/domains/Asset/Fiat"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { FC, useCallback, useMemo } from "react"
import { Trans, useTranslation } from "react-i18next"
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
  balances: Balances
  isLoading: boolean
}

const JsonAccount: FC<{ account: JsonImportAccount; onSelect: (select: boolean) => void }> = ({
  account,
  onSelect,
}) => {
  const { t } = useTranslation("account-add")
  const handleClick = useCallback(() => {
    onSelect(!account.selected)
  }, [onSelect, account])

  const positiveBalances = useMemo(
    () => account.balances.each.filter((b) => b.total.planck > 0),
    [account]
  )

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
            <div className="flex grow flex-col gap-2 overflow-hidden">
              <div className=" overflow-hidden text-ellipsis whitespace-nowrap text-base">
                {account.name} <AccountTypeIcon origin={account.origin as AccountType} />
              </div>
              <div className="text-body-secondary text-sm">{shortenAddress(account.address)}</div>
            </div>
            <div className={classNames(account.isLoading && "animate-pulse")}>
              <Tooltip placement="bottom-end">
                <TooltipTrigger asChild>
                  <div>
                    <Fiat amount={account.balances.sum.fiat("usd").total} />
                  </div>
                </TooltipTrigger>
                {!!positiveBalances.length && (
                  <TooltipContent>
                    <div className="flex flex-col items-end gap-3 p-2">
                      {positiveBalances.map((balance) => (
                        <div key={balance.tokenId}>
                          <TokensAndFiat
                            tokenId={balance.tokenId}
                            planck={balance.total.planck}
                            noTooltip
                            noCountUp
                          />
                        </div>
                      ))}
                    </div>
                  </TooltipContent>
                )}
              </Tooltip>
            </div>
            {account.isExisting || !account.isPrivateKeyAvailable ? (
              <div className="w-8 shrink-0"></div>
            ) : account.isLocked ? (
              <LockIcon className="text-alert-warn shrink-0" />
            ) : (
              <UnlockIcon className="text-primary shrink-0" />
            )}

            {account.isExisting ? (
              <div className="w-[1.92rem] shrink-0 text-center">
                <CheckCircleIcon className="text-primary-500" />
              </div>
            ) : !account.isPrivateKeyAvailable ? (
              <div className="w-[1.92rem] shrink-0 text-center">
                <AlertCircleIcon className="text-alert-warn" />
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
  const { t } = useTranslation("account-add")

  const { selectedCount, totalCount } = useMemo(() => {
    const selectedCount = accounts.filter((a) => a.selected).length.toString()
    const totalCount = accounts.length.toString()
    return { selectedCount, totalCount }
  }, [accounts])

  const handleSelect = useCallback(
    (id: string) => (select: boolean) => {
      onSelectAccount(id, select)
    },
    [onSelectAccount]
  )

  return (
    <div>
      <div className={classNames("flex items-center px-8", accounts.length > 4 && "pr-12")}>
        <div className="grow">
          <Trans
            t={t}
            values={{ selectedCount, totalCount }}
            defaults="Selected accounts <Selected>{{selectedCount}}</Selected><Total>/{{totalCount}}</Total>"
            components={{
              Selected: <span className="text-primary ml-2" />,
              Total: <span className="text-grey-500 text-sm" />,
            }}
          ></Trans>
        </div>
        {accounts.length > 1 && (
          <div className="text-grey-500 flex items-center gap-4">
            <button type="button" className="hover:text-grey-400" onClick={onSelectNone}>
              {t("Clear")}
            </button>
            <div className="bg-grey-500 h-6 w-0.5"></div>
            <button type="button" className="hover:text-grey-400" onClick={onSelectAll}>
              {t("Select all")}
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
      <div className="text-grey-500 mt-6 text-xs">
        {t(
          "During the import stage, the displayed balances may represent only a subset of your account holdings."
        )}
      </div>
    </div>
  )
}
