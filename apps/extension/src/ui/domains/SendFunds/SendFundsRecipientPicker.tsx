import { isEthereumAddress } from "@polkadot/util-crypto"
import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { SearchInput } from "@talisman/components/SearchInput"
import { TalismanHandIcon, UserIcon } from "@talisman/theme/icons"
import { convertAddress } from "@talisman/util/convertAddress"
import { isValidAddress } from "@talisman/util/isValidAddress"
import { useSendFundsWizard } from "@ui/apps/popup/pages/SendFunds/context"
import useAccounts from "@ui/hooks/useAccounts"
import { useAddressBook } from "@ui/hooks/useAddressBook"
import useChain from "@ui/hooks/useChain"
import useToken from "@ui/hooks/useToken"
import { useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { SendFundsAccountsList } from "./SendFundsAccountsList"

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
    return isFromEthereum ? isEthereumAddress(search) : isValidAddress(search)
  }, [from, isFromEthereum, search])

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

  const newAddresses = useMemo(() => {
    const addresses: { address: string }[] = []

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

    return addresses
  }, [
    to,
    allAccounts,
    allContacts,
    isValidAddressInput,
    normalizedSearch,
    normalizedTo,
    search,
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
            (isValidAddressInput && normalizedSearch === normalize(contact.address))
        ),
    [allContacts, isFromEthereum, isValidAddressInput, normalize, normalizedSearch, search]
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
            (isValidAddressInput && normalizedSearch === normalize(account.address))
        )
        .filter((account) => !account.genesisHash || account.genesisHash === chain?.genesisHash),
    [
      allAccounts,
      chain?.genesisHash,
      isFromEthereum,
      isValidAddressInput,
      normalize,
      normalizedFrom,
      normalizedSearch,
      search,
    ]
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
        <div className="grow">
          <SearchInput
            onValidate={handleValidate}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            onChange={setSearch}
            placeholder={t("Enter address")}
          />
        </div>
      </div>
      <ScrollContainer className=" bg-black-secondary border-grey-700 scrollable h-full w-full grow overflow-x-hidden border-t">
        {!!newAddresses.length && (
          <SendFundsAccountsList
            allowZeroBalance
            accounts={newAddresses}
            selected={to}
            onSelect={handleSelect}
          />
        )}
        <SendFundsAccountsList
          allowZeroBalance
          accounts={contacts}
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
          accounts={accounts}
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
      </ScrollContainer>
    </div>
  )
}
