import { ChevronDownIcon, GlobeIcon } from "@talismn/icons"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useOpenClose } from "talisman-ui"

import { shortenAddress } from "@talisman/util/shortenAddress"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { AllAccountsIcon } from "@ui/domains/Account/AllAccountsIcon"
import { ChainLogo } from "@ui/domains/Asset/ChainLogo"

import { TxHistoryAccountPicker } from "./TxHistoryAccountPicker"
import { useTxHistory } from "./TxHistoryContext"
import { TxHistoryNetworkPicker } from "./TxHistoryNetworkPicker"

export const TxHistoryToolbar = () => {
  return (
    <div className="mb-4 grid h-16 shrink-0 grid-cols-2 gap-4 px-8">
      <AccountFilterButton />
      <NetworkFilterButton />
    </div>
  )
}

const AccountFilterButton = () => {
  const { t } = useTranslation()
  const { account, accounts, setAddress } = useTxHistory()
  const { open, close, isOpen } = useOpenClose()

  const handleSelect = useCallback(
    (address: string | null) => {
      setAddress(address ? [address] : null)
      close()
    },
    [close, setAddress],
  )

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="bg-grey-850 hover:bg-grey-800 text-body-secondary hover:text-body overflow-hidden rounded-sm text-left text-xs"
      >
        <div className="flex size-full items-center gap-4 overflow-hidden px-4">
          {account ? (
            <AccountIcon
              address={account?.address}
              genesisHash={account?.genesisHash}
              className="text-md shrink-0"
            />
          ) : (
            <AllAccountsIcon className="text-md shrink-0" />
          )}
          <div className="grow truncate">
            {account ? (account?.name ?? shortenAddress(account.address)) : t("All Accounts")}
          </div>
          <ChevronDownIcon className="shrink-0 text-base" />
        </div>
      </button>
      <TxHistoryAccountPicker
        isOpen={isOpen}
        selectedAddress={account?.address ?? null}
        onSelect={handleSelect}
        onDismiss={close}
        accounts={accounts}
      />
    </>
  )
}

const NetworkFilterButton = () => {
  const { t } = useTranslation()
  const { network, networks, setNetworkId } = useTxHistory()
  const { open, close, isOpen } = useOpenClose()

  const handleSelect = useCallback(
    (networkId: string | null) => {
      setNetworkId(networkId)
      close()
    },
    [close, setNetworkId],
  )

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="bg-grey-850 hover:bg-grey-800 text-body-secondary hover:text-body overflow-hidden rounded-sm text-left text-xs"
      >
        <div className="flex size-full items-center gap-4 overflow-hidden px-4">
          {network ? (
            <ChainLogo id={network.id} className="text-md shrink-0" />
          ) : (
            <GlobeIcon className="text-md shrink-0" />
          )}
          <div className="grow truncate">
            {network ? (network?.name ?? t("Unknown Network")) : t("All Networks")}
          </div>
          <ChevronDownIcon className="shrink-0 text-base" />
        </div>
      </button>
      <TxHistoryNetworkPicker
        isOpen={isOpen}
        selectedNetworkId={network?.id ?? null}
        onSelect={handleSelect}
        onDismiss={close}
        networks={networks}
      />
    </>
  )
}
