import { ChevronDownIcon, GlobeIcon } from "@talismn/icons"
import { useCallback, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useOpenClose } from "talisman-ui"

import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import { usePortfolioNavigation } from "@ui/domains/Portfolio/usePortfolioNavigation"
import { TxHistoryList, TxHistoryProvider } from "@ui/domains/Transactions/TxHistory"
import { useTxHistory } from "@ui/domains/Transactions/TxHistory/TxHistoryContext"
import { TxHistoryNetworkPicker } from "@ui/domains/Transactions/TxHistory/TxHistoryNetworkPicker"

import { DashboardLayout } from "../layout"

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
        className="bg-grey-850 hover:bg-grey-800 text-body-secondary hover:text-body h-16 overflow-hidden rounded-sm text-left text-xs"
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

const Header = () => {
  const { t } = useTranslation()

  return (
    <div className="flex w-full items-end justify-between gap-8">
      <div className="flex flex-col gap-2">
        <div className="text-body text-bold text-lg">{t("Recent Activity")}</div>
        <div className="text-body-secondary text-sm">
          {t("Review the latest transactions submitted by Talisman.")}
        </div>
      </div>
      <div>
        <NetworkFilterButton />
      </div>
    </div>
  )
}

const TxHistoryAccountFilter = () => {
  // keep txHistory context in sync with portoflio accounts filter
  const { selectedAccounts } = usePortfolioNavigation()
  const { setAddress } = useTxHistory()

  useEffect(() => {
    setAddress(selectedAccounts.map((account) => account.address) ?? [])
  }, [selectedAccounts, setAddress])

  return null
}

export const TxHistory = () => {
  return (
    <DashboardLayout sidebar="accounts">
      <TxHistoryProvider>
        <TxHistoryAccountFilter />
        <div className="min-w-[60rem]">
          <Header />
          <div className="h-8"></div>
          <TxHistoryList />
        </div>
      </TxHistoryProvider>
    </DashboardLayout>
  )
}
