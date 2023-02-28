import { isEthereumAddress } from "@polkadot/util-crypto"
import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { TalismanHandIcon, UserIcon } from "@talisman/theme/icons"
import { convertAddress } from "@talisman/util/convertAddress"
import { isValidAddress } from "@talisman/util/isValidAddress"
import { useSendFundsWizard } from "@ui/apps/popup/pages/SendFunds/context"
import useAccounts from "@ui/hooks/useAccounts"
import { useAddressBook } from "@ui/hooks/useAddressBook"
import useBalances from "@ui/hooks/useBalances"
import useChain from "@ui/hooks/useChain"
import useToken from "@ui/hooks/useToken"
import { useCallback, useMemo, useState } from "react"

import { SendFundsAccountsList } from "./SendFundsAccountsList"
import { SendFundsSearchInput } from "./SendFundsSearchInput"

export const SendFundsRecipientPicker = () => {
  const { from, to, set, tokenId } = useSendFundsWizard()
  const [search, setSearch] = useState("")
  const token = useToken()
  const chain = useChain(token?.chain?.id)

  // maintain subscription to balances, as a search filter could close subscriptions from account rows
  useBalances()

  const allAccounts = useAccounts()
  const { contacts: allContacts } = useAddressBook()

  const isValidAddressInput = useMemo(() => {
    if (!from) return isValidAddress(search)
    return isEthereumAddress(from) ? isEthereumAddress(search) : isValidAddress(search)
  }, [from, search])

  const newAddresses = useMemo(() => {
    const isEthereum = isEthereumAddress(from)
    const normalize = (addr: string) =>
      isEthereum ? addr.toLowerCase() : convertAddress(addr, null)

    const addresses: { address: string }[] = []

    if (
      to &&
      allAccounts.every((account) => normalize(to) !== normalize(account.address)) &&
      allContacts.every((contact) => normalize(to) !== normalize(contact.address))
    )
      addresses.push({ address: to })

    if (
      isValidAddressInput &&
      (!to || normalize(search) !== normalize(to)) &&
      allAccounts.every((account) => normalize(search) !== normalize(account.address)) &&
      allContacts.every((contact) => normalize(search) !== normalize(contact.address))
    )
      addresses.push({ address: search })

    return addresses
  }, [from, to, allAccounts, allContacts, isValidAddressInput, search])

  const contacts = useMemo(
    () =>
      allContacts
        .filter(
          (account) => !from || isEthereumAddress(account.address) === isEthereumAddress(from)
        )
        .filter((contact) => !search || contact.name?.toLowerCase().includes(search)),
    [allContacts, from, search]
  )

  const accounts = useMemo(
    () =>
      allAccounts
        .filter((account) => account.address !== from)
        .filter(
          (account) => !from || isEthereumAddress(account.address) === isEthereumAddress(from)
        )
        .filter((account) => !search || account.name?.toLowerCase().includes(search))
        .filter((account) => !account.genesisHash || account.genesisHash === chain?.genesisHash),
    [allAccounts, chain?.genesisHash, from, search]
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
        <div className="font-bold">To</div>
        <div className="grow">
          <SendFundsSearchInput
            onValidate={handleValidate}
            autoFocus
            onChange={setSearch}
            placeholder="Enter address"
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
              <span>Contacts</span>
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
              My Accounts
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
