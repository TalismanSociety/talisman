import { getAccountGenesisHash } from "@core"
import { shortenAddress } from "@talisman/util/shortenAddress"
import { ChevronDownIcon, GlobeIcon } from "@talismn/icons"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { AllAccountsIcon } from "@ui/domains/Account/AllAccountsIcon"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { useOpenClose } from "@ui/talisman-ui"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"

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
    [close, setAddress]
  )

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="overflow-hidden rounded-sm bg-grey-850 text-left text-body-secondary text-xs hover:bg-grey-800 hover:text-body"
      >
        <div className="flex size-full items-center gap-4 overflow-hidden px-4">
          {account ? (
            <AccountIcon
              address={account.address}
              genesisHash={getAccountGenesisHash(account)}
              className="shrink-0 text-md"
            />
          ) : (
            <AllAccountsIcon className="shrink-0 text-md" />
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
    [close, setNetworkId]
  )

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="overflow-hidden rounded-sm bg-grey-850 text-left text-body-secondary text-xs hover:bg-grey-800 hover:text-body"
      >
        <div className="flex size-full items-center gap-4 overflow-hidden px-4">
          {network ? (
            <NetworkLogo networkId={network.id} className="shrink-0 text-md" />
          ) : (
            <GlobeIcon className="shrink-0 text-md" />
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
