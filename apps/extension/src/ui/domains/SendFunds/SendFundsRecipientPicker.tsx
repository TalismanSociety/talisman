import { isEthereumAddress } from "@polkadot/util-crypto"
import { DotNetwork, getNetworkGenesisHash, isTokenEth, Network } from "@talismn/chaindata-provider"
import {
  detectAddressEncoding,
  encodeAnyAddress,
  isAddressValid,
  normalizeAddress,
} from "@talismn/crypto"
import { EyeIcon, LoaderIcon, TalismanHandIcon, UserIcon, XOctagonIcon } from "@talismn/icons"
import {
  Account,
  isAccountCompatibleWithNetwork,
  isAccountPlatformEthereum,
  isAccountPortfolio,
} from "extension-core"
import { useCallback, useMemo, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { Button, Drawer, useOpenClose } from "talisman-ui"

import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { SearchInput } from "@talisman/components/SearchInput"
import { useSendFundsWizard } from "@ui/apps/popup/pages/SendFunds/context"
import { useResolveNsName } from "@ui/hooks/useResolveNsName"
import { useAccounts, useContacts, useNetworkById, useToken } from "@ui/state"

import { NetworkLogo } from "../Networks/NetworkLogo"
import { SendFundsAccount, SendFundsAccountsList } from "./SendFundsAccountsList"
import { ToWarning, useSendFunds } from "./useSendFunds"

const AddressFormatError = ({ chain }: { chain?: DotNetwork }) => {
  const { t } = useTranslation()
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
            ChainLogo: <NetworkLogo className="self-center" networkId={chain?.id} />,
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
  chain?: Network
}) => {
  const { t } = useTranslation()

  const handleProceedClick = useCallback(() => {
    onProceed(address)
    close()
  }, [close, onProceed, address])

  return (
    <Drawer containerId="main" isOpen={isOpen} anchor="bottom" onDismiss={close}>
      <div className="bg-black-tertiary flex max-w-[42rem] flex-col items-center gap-12 rounded-t-xl p-12">
        <div className="flex flex-col gap-4 text-center">
          <p className="px-10 font-bold text-white">
            {t("Sending to the wrong network will result in a loss of funds")}
          </p>
          <p className="text-body-secondary text-sm">
            {t(
              "If you are sending to a centralized exchange, ensure this address is on the correct network.",
            )}
          </p>
          <div className="mt-4 flex items-center justify-between gap-8 text-xs">
            <div className="text-body-secondary">{t("Selected Network")}</div>
            <div className="text-body flex items-center gap-4">
              <NetworkLogo networkId={chain?.id} className="text-md" />
              {chain?.name}
            </div>
          </div>
        </div>
        <div className="grid w-full grid-cols-2 gap-8">
          <Button onClick={close}>{t("Cancel")}</Button>
          <Button primary onClick={handleProceedClick} data-testid="send-funds-proceed-button">
            {t("Proceed")}
          </Button>
        </div>
      </div>
    </Drawer>
  )
}

export const SendFundsRecipientPicker = () => {
  const { t } = useTranslation()
  const { from, to, set, tokenId } = useSendFundsWizard()
  const { setRecipientWarning } = useSendFunds()
  const { open, close, isOpen } = useOpenClose()
  const [search, setSearch] = useState("")
  const token = useToken(tokenId)
  const network = useNetworkById(token?.networkId)

  const isFromEthereum = useMemo(() => isEthereumAddress(from), [from])

  const allAccounts = useAccounts()
  const allContacts = useContacts()

  const isValidAddressInput = useMemo(() => {
    if (!from) return isAddressValid(search)

    return isAddressValid(search) && detectAddressEncoding(from) === detectAddressEncoding(search)
  }, [from, search])

  /**
   * Check if the search input is a valid Substrate address for the current chain.
   * If not a substrate address (ie, any other string, or an ethereum address), it is also valid for the purpose of this check.
   */
  const isValidSubstrateNetworkAddressInput = useMemo(() => {
    if (network?.platform !== "polkadot") return true
    if (!search || search.trim() === "" || !isValidAddressInput) return true
    const isGenericFormat = normalizeAddress(search) === search
    const isChainFormat =
      encodeAnyAddress(search, { ss58Format: network.prefix }) === search ||
      (typeof network.oldPrefix === "number" &&
        encodeAnyAddress(search, { ss58Format: network.oldPrefix }) === search)
    return isChainFormat || isGenericFormat
  }, [network, search, isValidAddressInput])

  const [nsLookup, { isNsLookup, isNsFetching }] = useResolveNsName(search, {
    azns: !!network,
    ens: isFromEthereum,
  })

  const normalize = useCallback(
    (addr = "") => {
      if (!addr) return null
      try {
        return isFromEthereum ? addr.toLowerCase() : normalizeAddress(addr)
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
        .filter(
          (contact) =>
            !contact.genesisHash || contact.genesisHash === getNetworkGenesisHash(network),
        ),
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
      network,
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
        .filter((account) => {
          if (isTokenEth(token)) return isAccountPlatformEthereum(account)
          if (network) return isAccountCompatibleWithNetwork(network, account)
          return false
        })
        .filter(
          (account) =>
            !search ||
            account.name?.toLowerCase().includes(search) ||
            (isValidAddressInput && normalizedSearch === normalize(account.address)) ||
            (isNsLookup && nsLookup && normalizedNsLookup === normalize(account.address)),
        ),
    [
      allAccounts,
      normalize,
      normalizedFrom,
      network,
      token,
      search,
      isValidAddressInput,
      normalizedSearch,
      isNsLookup,
      nsLookup,
      normalizedNsLookup,
    ],
  )

  const { myAccounts, watchedAccounts } = useMemo(() => {
    return accounts.reduce<{ myAccounts: Account[]; watchedAccounts: Account[] }>(
      (acc, curr) => {
        if (curr.type === "contact") return acc
        if (isAccountPortfolio(curr)) acc.myAccounts.push(curr)
        else acc.watchedAccounts.push(curr)
        return acc
      },
      { myAccounts: [], watchedAccounts: [] },
    )
  }, [accounts])

  const handleSelect = useCallback(
    (address: string) => {
      // Azns is the only lookup we use for polkadot addresses. If this changes, we will need to use the NsLookupType here.
      const isAzeroDomainButNotAzero =
        !address.startsWith("0x") && typeof nsLookup === "string" && network?.id !== "aleph-zero"

      const toWarning: ToWarning = isAzeroDomainButNotAzero ? "AZERO_ID" : undefined

      set("to", address, true)
      setRecipientWarning(toWarning)
    },
    [network?.id, nsLookup, set, setRecipientWarning],
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
    if (isValidAddressInput && isValidSubstrateNetworkAddressInput) set("to", search, true)
  }, [isValidAddressInput, isValidSubstrateNetworkAddressInput, search, set])

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
        {!isValidSubstrateNetworkAddressInput && network?.platform === "polkadot" && (
          <AddressFormatError chain={network ?? undefined} />
        )}
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
              genesisHash={getNetworkGenesisHash(network)}
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
              genesisHash={getNetworkGenesisHash(network)}
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
              genesisHash={getNetworkGenesisHash(network)}
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
          chain={network ?? undefined}
        />
      )}
    </div>
  )
}
