import { isEthereumAddress } from "@polkadot/util-crypto"
import { EyeIcon, LoaderIcon, TalismanHandIcon, UserIcon, XOctagonIcon } from "@talismn/icons"
import { isValidSubstrateAddress } from "@talismn/util"
import { AccountType, Chain, SubstrateLedgerAppType } from "extension-core"
import { isValidAddress } from "extension-shared"
import { useCallback, useMemo, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { Button, Drawer, useOpenClose } from "talisman-ui"

import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { SearchInput } from "@talisman/components/SearchInput"
import { convertAddress } from "@talisman/util/convertAddress"
import { useSendFundsWizard } from "@ui/apps/popup/pages/SendFunds/context"
import { useAddressBook } from "@ui/hooks/useAddressBook"
import { useResolveNsName } from "@ui/hooks/useResolveNsName"
import { useAccounts, useChain, useToken } from "@ui/state"

import { ChainLogo } from "../Asset/ChainLogo"
import { SendFundsAccount, SendFundsAccountsList } from "./SendFundsAccountsList"
import { ToWarning, useSendFunds } from "./useSendFunds"

const AddressFormatError = ({ chain }: { chain?: Chain }) => {
  const { t } = useTranslation("send-funds")
  return (
    <div className="h-min-h-full align-center flex w-full flex-col items-center gap-4 px-12 py-7">
      <XOctagonIcon className="text-brand-orange text-lg" />
      <span className="text-body">{t("Address Format Mismatch")}</span>
      <p className="text-body-secondary mt-4 text-center">
        <Trans
          t={t}
          defaults="The address you've entered is not compatible with the <Chain><ChainLogo />{{chainName}}</Chain> chain. Please enter a compatible address or select a different chain to send on."
          components={{
            Chain: <div className="text-body inline-flex items-baseline gap-1" />,
            ChainLogo: <ChainLogo className="self-center" id={chain?.id} />,
          }}
          values={{ chainName: chain?.name ?? t("Unknown") }}
        />
      </p>
    </div>
  )
}

const UnknownAddressDrawer = ({
  close,
  isOpen,
  onProceed,
  address,
  chain,
}: {
  close: () => void
  isOpen: boolean
  onProceed: (address: string) => void
  address: string
  chain?: Chain
}) => {
  const { t } = useTranslation("send-funds")

  const handleProceedClick = useCallback(() => {
    onProceed(address)
    close()
  }, [close, onProceed, address])

  return (
    <Drawer containerId="main" isOpen={isOpen} anchor="bottom" onDismiss={close}>
      <div className="bg-black-tertiary flex max-w-[42rem] flex-col items-center gap-12 rounded-t-xl p-12">
        <div className="flex flex-col gap-4 text-center">
          <p className="font-bold text-white">{t("Sending to external address")}</p>
          <p className="text-body-secondary text-sm">
            {t(
              "This address is not in your address book. In order to prevent loss of funds, ensure you're sending on the correct network.",
            )}
          </p>
          <div className="flex items-center justify-between gap-8 text-xs">
            <div className="text-body-secondary">{t("Selected Network")}</div>
            <div className="text-body flex items-center gap-4">
              <ChainLogo id={chain?.id} className="text-md" />
              {chain?.name}
            </div>
          </div>
        </div>
        <div className="grid w-full grid-cols-2 gap-8">
          <Button onClick={close}>{t("Cancel")}</Button>
          <Button primary onClick={handleProceedClick}>
            {t("Proceed")}
          </Button>
        </div>
      </div>
    </Drawer>
  )
}

export const SendFundsRecipientPicker = () => {
  const { t } = useTranslation("send-funds")
  const { from, to, set, tokenId } = useSendFundsWizard()
  const { setRecipientWarning } = useSendFunds()
  const { open, close, isOpen } = useOpenClose()
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

  /**
   * Check if the search input is a valid Substrate address for the current chain.
   * If not a substrate address (ie, any other string, or an ethereum address), it is also valid for the purpose of this check.
   */
  const isValidSubstrateNetworkAddressInput = useMemo(() => {
    if (!chain) return true
    if (!search || search.trim() === "" || !isValidAddressInput) return true
    const isGenericFormat = convertAddress(search, null) === search
    const isChainFormat = convertAddress(search, chain.prefix) === search
    if (isValidSubstrateAddress(search)) return isChainFormat || isGenericFormat
    return true
  }, [chain, search, isValidAddressInput])

  const [nsLookup, { isNsLookup, isNsFetching }] = useResolveNsName(search, {
    azns: !!chain,
    ens: isFromEthereum,
  })

  const normalize = useCallback(
    (addr = "") => {
      if (!addr) return null
      try {
        return isFromEthereum ? addr.toLowerCase() : convertAddress(addr, null)
      } catch (err) {
        return null
      }
    },
    [isFromEthereum],
  )
  const normalizedFrom = useMemo(() => normalize(from), [from, normalize])
  const normalizedTo = useMemo(() => normalize(to), [to, normalize])
  const normalizedSearch = useMemo(() => normalize(search), [search, normalize])
  const normalizedNsLookup = useMemo(() => normalize(nsLookup ?? undefined), [nsLookup, normalize])

  const contacts = useMemo(
    () =>
      allContacts
        .filter((contact) => isEthereumAddress(contact.address) === isFromEthereum)
        .filter(
          (contact) =>
            !search ||
            contact.name?.toLowerCase().includes(search) ||
            (isValidAddressInput && normalizedSearch === normalize(contact.address)) ||
            (isNsLookup && nsLookup && normalizedNsLookup === normalize(contact.address)),
        )
        .filter((contact) => !contact.genesisHash || contact.genesisHash === chain?.genesisHash),
    [
      allContacts,
      isFromEthereum,
      search,
      isValidAddressInput,
      normalizedSearch,
      normalize,
      isNsLookup,
      nsLookup,
      normalizedNsLookup,
      chain?.genesisHash,
    ],
  )

  const newAddresses = useMemo(() => {
    const addresses: SendFundsAccount[] = []

    if (
      to &&
      allAccounts.every((account) => normalizedTo !== normalize(account.address)) &&
      contacts.every((contact) => normalizedTo !== normalize(contact.address))
    )
      addresses.push({ address: to })

    if (
      isValidAddressInput &&
      isValidSubstrateNetworkAddressInput &&
      (!to || normalizedSearch !== normalizedTo) &&
      allAccounts.every((account) => normalizedSearch !== normalize(account.address)) &&
      contacts.every((contact) => normalizedSearch !== normalize(contact.address))
    )
      addresses.push({ address: search })

    if (
      isNsLookup &&
      nsLookup &&
      (!to || normalizedNsLookup !== normalizedTo) &&
      allAccounts.every((account) => normalizedNsLookup !== normalize(account.address)) &&
      contacts.every((contact) => normalizedNsLookup !== normalize(contact.address))
    )
      addresses.push({ name: search, address: nsLookup })

    return addresses
  }, [
    to,
    allAccounts,
    contacts,
    isValidAddressInput,
    isValidSubstrateNetworkAddressInput,
    normalizedSearch,
    normalizedTo,
    search,
    isNsLookup,
    nsLookup,
    normalizedNsLookup,
    normalize,
  ])

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
            (isNsLookup && nsLookup && normalizedNsLookup === normalize(account.address)),
        )
        .filter((account) => !account.genesisHash || account.genesisHash === chain?.genesisHash)
        .filter(
          (account) =>
            isFromEthereum ||
            // do not send funds to ledger generic accounts on incompatible chains
            chain?.hasCheckMetadataHash ||
            account.ledgerApp !== SubstrateLedgerAppType.Generic,
        ),
    [
      allAccounts,
      normalize,
      normalizedFrom,
      isFromEthereum,
      search,
      isValidAddressInput,
      normalizedSearch,
      isNsLookup,
      nsLookup,
      normalizedNsLookup,
      chain?.genesisHash,
      chain?.hasCheckMetadataHash,
    ],
  )

  const { myAccounts, watchedAccounts } = useMemo(
    () => ({
      myAccounts: accounts.filter(
        (account) =>
          (account.origin !== AccountType.Watched || account.isPortfolio) &&
          account.origin !== AccountType.Dcent,
      ),
      watchedAccounts: accounts.filter(
        (account) =>
          (account.origin === AccountType.Watched && !account.isPortfolio) ||
          account.origin === AccountType.Dcent,
      ),
    }),
    [accounts],
  )

  const handleSelect = useCallback(
    (address: string) => {
      // Azns is the only lookup we use for polkadot addresses. If this changes, we will need to use the NsLookupType here.
      const isAzeroDomainButNotAzero =
        !address.startsWith("0x") && typeof nsLookup === "string" && chain?.id !== "aleph-zero"

      const toWarning: ToWarning = isAzeroDomainButNotAzero ? "AZERO_ID" : undefined

      set("to", address, true)
      setRecipientWarning(toWarning)
    },
    [chain?.id, nsLookup, set, setRecipientWarning],
  )

  const [unknownAddress, setUnknownAddress] = useState<string>()
  const handleSelectUnknownAddress = useCallback(
    (address: string) => {
      if (isEthereumAddress(address)) return handleSelect(address)

      setUnknownAddress(address)
      open()
    },
    [handleSelect, open],
  )

  const handleSubmitSearch = useCallback(() => {
    if (isValidAddressInput) set("to", search, true)
  }, [isValidAddressInput, search, set])

  return (
    <div className="flex h-full min-h-full w-full flex-col overflow-hidden">
      <div className="flex min-h-fit w-full items-center gap-8 px-12 pb-8">
        <div className="font-bold">{t("To")}</div>
        <div className="mx-1 grow overflow-hidden px-1">
          <SearchInput
            onSubmit={handleSubmitSearch}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            onChange={setSearch}
            placeholder={t("Enter address")}
            after={
              isNsLookup && isNsFetching ? (
                <LoaderIcon className="text-body-disabled animate-spin-slow shrink-0" />
              ) : null
            }
          />
        </div>
      </div>
      <ScrollContainer className="bg-black-secondary border-grey-700 scrollable h-full w-full grow overflow-x-hidden border-t">
        {!isValidSubstrateNetworkAddressInput && <AddressFormatError chain={chain ?? undefined} />}
        {isValidSubstrateNetworkAddressInput && (
          <>
            {newAddresses.length > 0 && (
              <SendFundsAccountsList
                allowZeroBalance
                accounts={newAddresses}
                noFormat // preserve user input chain format
                selected={to}
                onSelect={handleSelectUnknownAddress}
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
          </>
        )}
      </ScrollContainer>
      {unknownAddress && (
        <UnknownAddressDrawer
          isOpen={isOpen}
          close={close}
          onProceed={handleSelect}
          address={unknownAddress}
          chain={chain ?? undefined}
        />
      )}
    </div>
  )
}
