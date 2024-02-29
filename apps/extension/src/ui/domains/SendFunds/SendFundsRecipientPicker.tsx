import { isEthereumAddress } from "@polkadot/util-crypto"
import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { SearchInput } from "@talisman/components/SearchInput"
import { convertAddress } from "@talisman/util/convertAddress"
import { isValidAddress } from "@talisman/util/isValidAddress"
import { isValidSubstrateAddress } from "@talisman/util/isValidSubstrateAddress"
import { EyeIcon, LoaderIcon, TalismanHandIcon, UserIcon } from "@talismn/icons"
import { useSendFundsWizard } from "@ui/apps/popup/pages/SendFunds/context"
import useAccounts from "@ui/hooks/useAccounts"
import { useAddressBook } from "@ui/hooks/useAddressBook"
import useChain from "@ui/hooks/useChain"
import { useResolveEnsName } from "@ui/hooks/useResolveEnsName"
import useToken from "@ui/hooks/useToken"
import { useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { SendFundsAccount, SendFundsAccountsList } from "./SendFundsAccountsList"

export const SendFundsRecipientPicker = () => {
  const { t } = useTranslation("send-funds")
  const { from, to, set, tokenId } = useSendFundsWizard()
  const [search, setSearch] = useState("")
  const token = useToken(tokenId)
  const chain = useChain(token?.chain?.id)

  const isFromEthereum = useMemo(() => isEthereumAddress(from), [from])

  const allAccounts = useAccounts()
  const { contacts: allContacts } = useAddressBook()

  const isValidAddressInput = useMemo(() => {
    if (!from) return isValidAddress(search)
    return isFromEthereum ? isEthereumAddress(search) : isValidSubstrateAddress(search)
  }, [from, isFromEthereum, search])

  const [ensLookup, { isLookup: isEnsLookup, isFetching: isEnsFetching }] = useResolveEnsName(
    isFromEthereum ? search : undefined
  )

  const normalize = useCallback(
    (addr = "") => {
      if (!addr) return null
      try {
        return isFromEthereum ? addr.toLowerCase() : convertAddress(addr, null)
      } catch (err) {
        return null
      }
    },
    [isFromEthereum]
  )
  const normalizedFrom = useMemo(() => normalize(from), [from, normalize])
  const normalizedTo = useMemo(() => normalize(to), [to, normalize])
  const normalizedSearch = useMemo(() => normalize(search), [search, normalize])
  const normalizedEnsLookup = useMemo(
    () => normalize(ensLookup ?? undefined),
    [ensLookup, normalize]
  )

  const newAddresses = useMemo(() => {
    const addresses: SendFundsAccount[] = []

    if (
      to &&
      allAccounts.every((account) => normalizedTo !== normalize(account.address)) &&
      allContacts.every((contact) => normalizedTo !== normalize(contact.address))
    )
      addresses.push({ address: to })

    if (
      isValidAddressInput &&
      (!to || normalizedSearch !== normalizedTo) &&
      allAccounts.every((account) => normalizedSearch !== normalize(account.address)) &&
      allContacts.every((contact) => normalizedSearch !== normalize(contact.address))
    )
      addresses.push({ address: search })

    if (
      isEnsLookup &&
      ensLookup &&
      (!to || normalizedEnsLookup !== normalizedTo) &&
      allAccounts.every((account) => normalizedEnsLookup !== normalize(account.address)) &&
      allContacts.every((contact) => normalizedEnsLookup !== normalize(contact.address))
    )
      addresses.push({ name: search, address: ensLookup })

    return addresses
  }, [
    to,
    allAccounts,
    allContacts,
    isValidAddressInput,
    normalizedSearch,
    normalizedTo,
    search,
    isEnsLookup,
    ensLookup,
    normalizedEnsLookup,
    normalize,
  ])

  const contacts = useMemo(
    () =>
      allContacts
        .filter((account) => isEthereumAddress(account.address) === isFromEthereum)
        .filter(
          (contact) =>
            !search ||
            contact.name?.toLowerCase().includes(search) ||
            (isValidAddressInput && normalizedSearch === normalize(contact.address)) ||
            (isEnsLookup && ensLookup && normalizedEnsLookup === normalize(contact.address))
        ),
    [
      allContacts,
      ensLookup,
      isEnsLookup,
      isFromEthereum,
      isValidAddressInput,
      normalize,
      normalizedEnsLookup,
      normalizedSearch,
      search,
    ]
  )

  const accounts = useMemo(
    () =>
      allAccounts
        .filter((account) => normalize(account.address) !== normalizedFrom)
        .filter((account) => isEthereumAddress(account.address) === isFromEthereum)
        .filter(
          (account) =>
            !search ||
            account.name?.toLowerCase().includes(search) ||
            (isValidAddressInput && normalizedSearch === normalize(account.address)) ||
            (isEnsLookup && ensLookup && normalizedEnsLookup === normalize(account.address))
        )
        .filter((account) => !account.genesisHash || account.genesisHash === chain?.genesisHash),
    [
      allAccounts,
      chain?.genesisHash,
      ensLookup,
      isEnsLookup,
      isFromEthereum,
      isValidAddressInput,
      normalize,
      normalizedEnsLookup,
      normalizedFrom,
      normalizedSearch,
      search,
    ]
  )

  const { myAccounts, watchedAccounts } = useMemo(
    () => ({
      myAccounts: accounts.filter((account) => account.origin !== "WATCHED" || account.isPortfolio),
      watchedAccounts: accounts.filter(
        (account) => account.origin === "WATCHED" && !account.isPortfolio
      ),
    }),
    [accounts]
  )

  const handleSelect = useCallback(
    (address: string) => {
      set("to", address, true)
    },
    [set]
  )

  const handleValidate = useCallback(() => {
    if (isValidAddressInput) set("to", search, true)
  }, [isValidAddressInput, search, set])

  return (
    <div className="flex h-full min-h-full w-full flex-col overflow-hidden">
      <div className="flex min-h-fit w-full items-center gap-8 px-12 pb-8">
        <div className="font-bold">{t("To")}</div>
        <div className="mx-1 grow overflow-hidden px-1">
          <SearchInput
            onValidate={handleValidate}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            onChange={setSearch}
            placeholder={t("Enter address")}
            after={
              isEnsLookup && isEnsFetching ? (
                <LoaderIcon className="text-body-disabled animate-spin-slow shrink-0" />
              ) : null
            }
          />
        </div>
      </div>
      <ScrollContainer className=" bg-black-secondary border-grey-700 scrollable h-full w-full grow overflow-x-hidden border-t">
        {!!newAddresses.length && (
          <SendFundsAccountsList
            allowZeroBalance
            accounts={newAddresses}
            noFormat // preserve user input chain format
            selected={to}
            onSelect={handleSelect}
          />
        )}
        <SendFundsAccountsList
          allowZeroBalance
          accounts={contacts}
          genesisHash={chain?.genesisHash}
          selected={to}
          onSelect={handleSelect}
          header={
            <>
              <UserIcon className="mr-2 inline align-text-top" />
              <span>{t("Contacts")}</span>
            </>
          }
        />
        <SendFundsAccountsList
          allowZeroBalance
          accounts={myAccounts}
          genesisHash={chain?.genesisHash}
          selected={to}
          onSelect={handleSelect}
          header={
            <>
              <TalismanHandIcon className="mr-2 inline-block align-text-top" />
              {t("My Accounts")}
            </>
          }
          showBalances
          tokenId={tokenId}
          showIfEmpty={!newAddresses.length}
        />
        <SendFundsAccountsList
          allowZeroBalance
          accounts={watchedAccounts}
          genesisHash={chain?.genesisHash}
          selected={to}
          onSelect={handleSelect}
          header={
            <>
              <EyeIcon className="mr-2 inline-block align-text-top" />
              {t("Followed only")}
            </>
          }
          showBalances
          tokenId={tokenId}
        />
      </ScrollContainer>
    </div>
  )
}
