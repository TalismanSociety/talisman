import { isAccountCompatibleWithNetwork } from "@core/domains/accounts/helpers"
import type { Account } from "@core/domains/keyring/exports"
import { getAccountGenesisHash, isAccountAddressSs58 } from "@core/domains/keyring/exports"
import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { SearchInput } from "@talisman/components/SearchInput"
import { shortenAddress } from "@talisman/util/shortenAddress"
import { encodeAnyAddress, normalizeAddress } from "@talismn/crypto"
import { CheckCircleIcon, ChevronRightIcon, CopyIcon, QrIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { useAccounts } from "@ui/state/accounts"
import { useNetworkByGenesisHash } from "@ui/state/chaindata"
import { IconButton } from "@ui/talisman-ui/components/IconButton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/talisman-ui/components/Tooltip"
import {
  type FC,
  type PropsWithChildren,
  type ReactNode,
  useCallback,
  useMemo,
  useState,
} from "react"
import { useTranslation } from "react-i18next"

import { AccountIcon } from "../Account/AccountIcon"
import { AccountTypeIcon } from "../Account/AccountTypeIcon"
import { CopyAddressLayout } from "./CopyAddressLayout"
import { useCopyAddressWizard } from "./useCopyAddressWizard"

type AccountRowProps = {
  account: Account
  selected: boolean
  onClick?: () => void
  disabled?: boolean
}

const AccountRowContainer: FC<
  { onClick?: () => void; isSelected?: boolean } & PropsWithChildren
> = ({ onClick, isSelected, children }) => {
  const className = useMemo(
    () =>
      classNames(
        "flex h-[5.8rem] w-full items-center gap-4 px-12 text-left hover:bg-grey-750 focus:bg-grey-700",
        isSelected && "bg-grey-800",
        "text-body-secondary hover:text-body"
      ),

    [isSelected]
  )

  return onClick ? (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  ) : (
    <div className={className}>{children}</div>
  )
}

const AccountRow: FC<AccountRowProps> = ({ account, selected }) => {
  const { t } = useTranslation()
  const { setAddress, copySpecific, network } = useCopyAddressWizard()
  const accountChain = useNetworkByGenesisHash(getAccountGenesisHash(account))

  const formatted = useMemo(
    () => encodeAnyAddress(account.address, { ss58Format: accountChain?.prefix }),
    [account.address, accountChain?.prefix]
  )

  const isCopiable = useMemo(() => {
    return !isAccountAddressSs58(account) || !!getAccountGenesisHash(account)
  }, [account])

  const handleCopyClick = useCallback(() => {
    copySpecific(formatted, network?.id)
  }, [copySpecific, formatted, network?.id])

  const handleSelectClick = useCallback(() => {
    setAddress(account.address)
  }, [account.address, setAddress])

  return (
    <AccountRowContainer onClick={isCopiable ? undefined : handleSelectClick}>
      <AccountIcon
        address={account.address}
        genesisHash={getAccountGenesisHash(account)}
        className="text-xl"
      />
      <div className="mr-2 flex grow flex-col items-start gap-2 overflow-hidden">
        <div className="flex w-full items-center gap-3 overflow-hidden text-body">
          <div className="truncate text-body">
            {account.name ?? shortenAddress(formatted, 6, 6)}
          </div>
          <AccountTypeIcon className="inline-block text-primary" type={account.type} />
          {selected && <CheckCircleIcon />}
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="text-left text-body-secondary text-xs">
              {shortenAddress(formatted, 10, 10)}
            </div>
          </TooltipTrigger>
          <TooltipContent>{formatted}</TooltipContent>
        </Tooltip>
      </div>
      <div className="flex gap-6">
        {isCopiable ? (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <IconButton className="text-md" onClick={handleSelectClick}>
                  <QrIcon />
                </IconButton>
              </TooltipTrigger>
              <TooltipContent>{t("Show QR code")}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <IconButton className="mr-2 text-md" onClick={handleCopyClick}>
                  <CopyIcon />
                </IconButton>
              </TooltipTrigger>
              <TooltipContent>{t("Copy to clipboard")}</TooltipContent>
            </Tooltip>
          </>
        ) : (
          <ChevronRightIcon className="text-lg" />
        )}
      </div>
    </AccountRowContainer>
  )
}

type AccountsListProps = {
  accounts: Account[]
  selected?: string | null
  onSelect?: (address: string) => void
  header?: ReactNode
}

export const AccountsList: FC<AccountsListProps> = ({ selected, accounts, onSelect, header }) => {
  const { t } = useTranslation()
  const handleAccountClick = useCallback(
    (address: string) => () => {
      onSelect?.(address)
    },
    [onSelect]
  )

  return (
    <div>
      {!!header && <div className="mt-8 mb-4 px-12 font-bold text-body-secondary">{header}</div>}
      {accounts?.map((account) => (
        <AccountRow
          selected={account.address === selected}
          key={account.address}
          account={account}
          onClick={handleAccountClick(account.address)}
        />
      ))}
      {!accounts?.length && (
        <div className="flex h-[5.8rem] w-full items-center px-12 text-left text-body-secondary">
          {t("No account matches your search")}
        </div>
      )}
    </div>
  )
}

export const CopyAddressAccountForm = () => {
  const { address, setAddress, network, addresses } = useCopyAddressWizard()
  const { t } = useTranslation()
  const [search, setSearch] = useState("")

  const allAccounts = useAccounts()

  const accounts = useMemo(
    () =>
      allAccounts
        .filter((account) => !search || account.name?.toLowerCase().includes(search))
        .filter((account) => !network || isAccountCompatibleWithNetwork(network, account))
        // if a folder is selected in portfolio, filter to accounts in that folder
        .filter(
          (account) =>
            !addresses?.length ||
            addresses.map((a) => normalizeAddress(a)).includes(normalizeAddress(account.address))
        ),
    [allAccounts, network, search, addresses]
  )

  return (
    <CopyAddressLayout title={t("Select account")}>
      <div className="flex h-full min-h-full w-full flex-col overflow-hidden">
        <div className="flex min-h-fit w-full items-center gap-8 px-12 pb-8">
          <div className="grow">
            <SearchInput onChange={setSearch} placeholder={t("Search by account name")} />
          </div>
        </div>
        <ScrollContainer className="scrollable h-full w-full grow overflow-x-hidden border-grey-700 border-t bg-black-secondary">
          <AccountsList accounts={accounts} selected={address} onSelect={setAddress} />
        </ScrollContainer>
      </div>
    </CopyAddressLayout>
  )
}
