import { AccountJsonAny, isAccountCompatibleWithChain } from "@extension/core"
import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { SearchInput } from "@talisman/components/SearchInput"
import { convertAddress } from "@talisman/util/convertAddress"
import { shortenAddress } from "@talisman/util/shortenAddress"
import { CheckCircleIcon, ChevronRightIcon, CopyIcon, QrIcon } from "@talismn/icons"
import { classNames, isEthereumAddress } from "@talismn/util"
import useAccounts from "@ui/hooks/useAccounts"
import { useChainByGenesisHash } from "@ui/hooks/useChainByGenesisHash"
import { FC, PropsWithChildren, ReactNode, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { IconButton, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { AccountIcon } from "../Account/AccountIcon"
import { AccountTypeIcon } from "../Account/AccountTypeIcon"
import { CopyAddressLayout } from "./CopyAddressLayout"
import { useCopyAddressWizard } from "./useCopyAddressWizard"

type AccountRowProps = {
  account: AccountJsonAny
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
        "hover:bg-grey-750 focus:bg-grey-700 flex h-[5.8rem] w-full items-center gap-4 px-12 text-left",
        isSelected && "bg-grey-800 ",
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
  const { setAddress, copySpecific, chain } = useCopyAddressWizard()
  const accountChain = useChainByGenesisHash(account.genesisHash)

  const formatted = useMemo(
    () => convertAddress(account.address, accountChain?.prefix ?? null),
    [account.address, accountChain?.prefix]
  )

  const canCopySpecific = useMemo(
    () => isEthereumAddress(account.address) || !!accountChain || !!chain,
    [account.address, accountChain, chain]
  )

  const handleCopyClick = useCallback(() => {
    copySpecific(formatted, chain?.id)
  }, [copySpecific, formatted, chain?.id])

  const handleSelectClick = useCallback(() => {
    setAddress(account.address)
  }, [account.address, setAddress])

  return (
    <AccountRowContainer onClick={canCopySpecific ? undefined : handleSelectClick}>
      <AccountIcon
        address={account.address}
        genesisHash={account.genesisHash}
        className="text-xl"
      />
      <div className="mr-2 flex grow flex-col items-start gap-2 overflow-hidden">
        <div className="text-body flex w-full items-center gap-3 overflow-hidden">
          <div className="text-body truncate">
            {account.name ?? shortenAddress(formatted, 6, 6)}
          </div>
          <AccountTypeIcon className="text-primary inline-block" origin={account.origin} />
          {selected && <CheckCircleIcon />}
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="text-body-secondary text-left text-xs">
              {shortenAddress(formatted, 10, 10)}
            </div>
          </TooltipTrigger>
          <TooltipContent>{formatted}</TooltipContent>
        </Tooltip>
      </div>
      <div className="flex gap-6">
        {canCopySpecific ? (
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
                <IconButton className="text-md mr-2" onClick={handleCopyClick}>
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
  accounts: AccountJsonAny[]
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
      {!!header && <div className="text-body-secondary mb-4 mt-8 px-12 font-bold">{header}</div>}
      {accounts?.map((account) => (
        <AccountRow
          selected={account.address === selected}
          key={account.address}
          account={account}
          onClick={handleAccountClick(account.address)}
        />
      ))}
      {!accounts?.length && (
        <div className="text-body-secondary flex h-[5.8rem] w-full items-center px-12 text-left">
          {t("No account matches your search")}
        </div>
      )}
    </div>
  )
}

export const CopyAddressAccountForm = () => {
  const { address, setAddress, chain, evmNetwork } = useCopyAddressWizard()
  const { t } = useTranslation()
  const [search, setSearch] = useState("")

  const allAccounts = useAccounts()

  const accounts = useMemo(
    () =>
      allAccounts
        .filter((account) => !search || account.name?.toLowerCase().includes(search))
        .filter(
          (account) =>
            !chain ||
            (account.type && isAccountCompatibleWithChain(chain, account.type, account.genesisHash))
        )
        .filter((account) => !evmNetwork || account.type === "ethereum"),
    [allAccounts, chain, evmNetwork, search]
  )

  return (
    <CopyAddressLayout title={t("Select account")}>
      <div className="flex h-full min-h-full w-full flex-col overflow-hidden">
        <div className="flex min-h-fit w-full items-center gap-8 px-12 pb-8">
          <div className="grow">
            <SearchInput onChange={setSearch} placeholder={t("Search by account name")} />
          </div>
        </div>
        <ScrollContainer className=" bg-black-secondary border-grey-700 scrollable h-full w-full grow overflow-x-hidden border-t">
          <AccountsList accounts={accounts} selected={address} onSelect={setAddress} />
        </ScrollContainer>
      </div>
    </CopyAddressLayout>
  )
}
