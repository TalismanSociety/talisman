import {
  DotNetwork,
  getNetworkGenesisHash,
  isNetworkDot,
  isNetworkEth,
  Network,
} from "@talismn/chaindata-provider"
import {
  decodeSs58Address,
  getAccountPlatformFromAddress,
  isAddressEqual,
  isAddressValid,
  isSs58Address,
} from "@talismn/crypto"
import { EyeIcon, LoaderIcon, TalismanHandIcon, UserIcon, XOctagonIcon } from "@talismn/icons"
import {
  isAccountCompatibleWithNetwork,
  isAccountOwned,
  isAddressCompatibleWithNetwork,
} from "extension-core"
import { useCallback, useMemo, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { Button, Drawer, useOpenClose } from "talisman-ui"

import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { SearchInput } from "@talisman/components/SearchInput"
import { useSendFundsWizard } from "@ui/apps/popup/pages/SendFunds/context"
import { useResolveNsName } from "@ui/hooks/useResolveNsName"
import { useAccounts, useNetworkById, useToken } from "@ui/state"

import { NetworkLogo } from "../Networks/NetworkLogo"
import { SendFundsAccountsList } from "./SendFundsAccountsList"
import { useSendFunds } from "./useSendFunds"

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

  // includes contacts
  const allAccounts = useAccounts("all")

  // consider only accounts that are compatible with the token's network
  const compatibleRecipients = useMemo(() => {
    if (!network) return []
    return allAccounts.filter(
      (account) =>
        isAccountCompatibleWithNetwork(network, account) &&
        !isAddressEqual(account.address, from ?? ""),
    )
  }, [allAccounts, from, network])

  // resolve search
  const matchingAccounts = useMemo(() => {
    const lowerSearch = search.trim().toLowerCase()
    if (!lowerSearch) return compatibleRecipients

    return compatibleRecipients.filter(
      (account) =>
        account.name?.toLowerCase().includes(lowerSearch) ||
        account.address.toLowerCase().includes(lowerSearch),
    )
  }, [compatibleRecipients, search])

  // group results by category
  const [ownedAccounts, watchedAccounts, contacts] = useMemo(() => {
    return [
      matchingAccounts.filter(isAccountOwned),
      matchingAccounts.filter((a) => a.type === "watch-only"),
      matchingAccounts.filter((a) => a.type === "contact"),
    ]
  }, [matchingAccounts])

  const [nsLookup, { isNsLookup, isNsFetching }] = useResolveNsName(search, {
    ens: isNetworkEth(network),
  })

  const newAddress = useMemo<{
    address: string
    name?: string
    ss58FormatError?: boolean
  } | null>(() => {
    if (!search || !network) return null

    // if we have a result in wallet accounts, then address is the one of our accounts
    // => no need to add an entry
    if (matchingAccounts.length) return null

    if (isAddressValid(search) && isAddressCompatibleWithNetwork(network, search)) {
      if (network.platform === "polkadot" && isSs58Address(search)) {
        const [, ss58Format] = decodeSs58Address(search)
        return {
          address: search,
          ss58FormatError: ![42, network.prefix, network.oldPrefix].includes(ss58Format),
        }
      }
      return { address: search }
    }

    if (
      isNsLookup &&
      nsLookup &&
      isAddressValid(nsLookup) &&
      isAddressCompatibleWithNetwork(network, nsLookup)
    ) {
      return { name: search, address: nsLookup }
    }

    return null
  }, [isNsLookup, matchingAccounts.length, network, nsLookup, search])

  const handleSelect = useCallback(
    (address: string) => {
      set("to", address, true)
      setRecipientWarning(undefined)
    },
    [set, setRecipientWarning],
  )

  const [unknownAddress, setUnknownAddress] = useState<string>()
  const handleSelectUnknownAddress = useCallback(
    (address: string) => {
      switch (getAccountPlatformFromAddress(address)) {
        case "polkadot": {
          setUnknownAddress(address)
          open()
          break
        }
        default: {
          handleSelect(address)
          break
        }
      }
    },
    [handleSelect, open],
  )

  const handleSubmitSearch = useCallback(() => {
    if (newAddress && !newAddress.ss58FormatError) set("to", newAddress.address, true)
  }, [newAddress, set])

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
        {isNetworkDot(network) && newAddress?.ss58FormatError ? (
          <AddressFormatError chain={network ?? undefined} />
        ) : (
          <>
            {newAddress && (
              <SendFundsAccountsList
                allowZeroBalance
                accounts={[newAddress]}
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
              accounts={ownedAccounts}
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
