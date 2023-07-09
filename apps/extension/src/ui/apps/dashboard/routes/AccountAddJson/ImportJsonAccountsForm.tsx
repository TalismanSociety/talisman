import { AccountType } from "@core/domains/accounts/types"
import { FadeIn } from "@talisman/components/FadeIn"
import { notify, notifyUpdate } from "@talisman/components/Notifications"
import {
  AlertCircleIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  LockIcon,
  UnlockIcon,
} from "@talisman/theme/icons"
import { shortenAddress } from "@talisman/util/shortenAddress"
import { classNames, sleep } from "@talismn/util"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { AccountTypeIcon } from "@ui/domains/Account/AccountTypeIcon"
import Fiat from "@ui/domains/Asset/Fiat"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { useSelectAccountAndNavigate } from "@ui/hooks/useSelectAccountAndNavigate"
import { FC, useCallback, useMemo, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { Button, Checkbox, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { JsonImportAccount, useJsonAccountImport } from "./context"
import { UnlockJsonAccountsButton } from "./UnlockJsonAccountsButton"

const JsonAccount: FC<{ account: JsonImportAccount; onSelect: (select: boolean) => void }> = ({
  account,
  onSelect,
}) => {
  const { t } = useTranslation("admin")
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

export const ImportJsonAccountsForm: FC = () => {
  const { t } = useTranslation("admin")

  const {
    accounts = [],
    canImport,
    selectAccount,
    selectAll,
    selectNone,
    importAccounts,
  } = useJsonAccountImport()

  const { selectedCount, totalCount } = useMemo(() => {
    const selectedCount = accounts.filter((a) => a.selected).length.toString()
    const totalCount = accounts.length.toString()
    return { selectedCount, totalCount }
  }, [accounts])

  const handleSelect = useCallback(
    (id: string) => (select: boolean) => {
      selectAccount(id, select)
    },
    [selectAccount]
  )

  const { setAddress } = useSelectAccountAndNavigate("/portfolio")
  const [isImporting, setIsImporting] = useState(false)

  const handleImportClick = useCallback(async () => {
    setIsImporting(true)

    const count = accounts?.filter((a) => a.selected).length

    const notificationId = notify(
      {
        type: "processing",
        title: t("Importing {{count}} accounts", { count }),
        subtitle: t("Please wait"),
      },
      { autoClose: false }
    )

    // ensure notification has time to display
    await sleep(50)

    try {
      const addresses = await importAccounts()
      setAddress(addresses[0])
      notifyUpdate(notificationId, {
        type: "success",
        title: t("Accounts imported", { count }),
        subtitle: "",
      })
    } catch (err) {
      notifyUpdate(notificationId, {
        type: "error",
        title: t("Error importing account"),
        subtitle: (err as Error)?.message,
      })
    }
    setIsImporting(false)
  }, [accounts, importAccounts, setAddress, t])

  if (!accounts?.length) return null

  return (
    <FadeIn>
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
            <button type="button" className="hover:text-grey-400" onClick={selectNone}>
              {t("Clear")}
            </button>
            <div className="bg-grey-500 h-6 w-0.5"></div>
            <button type="button" className="hover:text-grey-400" onClick={selectAll}>
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
      <div className="mt-16 flex w-full justify-end gap-8">
        <UnlockJsonAccountsButton />
        <Button
          icon={ArrowRightIcon}
          type="button"
          primary
          disabled={!canImport}
          onClick={handleImportClick}
          processing={isImporting}
        >
          {t("Import")}
        </Button>
      </div>
    </FadeIn>
  )
}
