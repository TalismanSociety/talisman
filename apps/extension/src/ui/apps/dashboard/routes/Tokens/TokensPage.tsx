import { EthNetwork, EthNetworkId, Network, NetworkId } from "@talismn/chaindata-provider"
import { PlusIcon } from "@talismn/icons"
import { activeTokensStore } from "extension-core"
import { FC, useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { Button, Dropdown, Modal, ModalDialog, PillButton, useOpenClose } from "talisman-ui"

import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { OptionSwitch } from "@talisman/components/OptionSwitch"
import { SearchInput } from "@talisman/components/SearchInput"
import { Spacer } from "@talisman/components/Spacer"
import { TogglePill } from "@talisman/components/TogglePill"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { DashboardLayout } from "@ui/apps/dashboard/layout"
import { NetworkLogo } from "@ui/domains/Ethereum/NetworkLogo"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useBalancesHydrate, useNetwork, useNetworks } from "@ui/state"

import { PlatformOption, usePlatformOptions } from "../Networks/usePlatformOptions"
import { TokensList } from "./TokensList"

const renderNetwork = (network: Network) => {
  return (
    <div className="flex items-center gap-5">
      <NetworkLogo ethChainId={network.id} className="text-[1.25em]" />
      <span>{network.name}</span>
    </div>
  )
}

const NetworkSelect = ({
  networks,
  selectedId,
  onChange,
}: {
  networks: Network[]
  selectedId: NetworkId | null
  onChange: (networkId: NetworkId) => void
}) => {
  const [selected, setSelected] = useState<Network | undefined>(
    networks.find((n) => n.id === selectedId),
  )

  useEffect(() => {
    // networks may not be loaded on first render
    // handle default selection here
    if (!selected) {
      const defaultNetwork = networks.find((n) => n.id === selectedId)
      if (defaultNetwork) setSelected(defaultNetwork)
    } else if (selectedId !== selected.id) {
      const newSelected = networks.find((n) => n.id === selectedId)
      if (newSelected) {
        setSelected(newSelected)
      } else {
        setSelected(undefined)
      }
    }
  }, [selectedId, networks, selected])

  const handleChange = useCallback(
    (item: Network | null) => {
      if (!item) return
      setSelected(item)
      if (onChange) onChange(item.id)
    },
    [onChange],
  )

  return (
    <Dropdown
      items={networks}
      propertyKey="id"
      renderItem={renderNetwork}
      value={selected}
      onChange={handleChange}
      className="[&>div>button]:h-[4.6rem]"
    />
  )
}

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Settings",
  featureVersion: 1,
  page: "Settings - Tokens",
}

const Content = () => {
  const { t } = useTranslation()
  useBalancesHydrate() // preload

  useAnalyticsPageView(ANALYTICS_PAGE)
  const navigate = useNavigate()
  const location = useLocation()

  const params = useParams()
  const [platform, setPlatform, platformOptions] = usePlatformOptions(
    params.platform as PlatformOption,
  )

  const networks = useNetworks({ platform, activeOnly: true, includeTestnets: true })

  const [isActiveOnly, setIsActiveOnly] = useState(true)
  const [isCustomOnly, setIsCustomOnly] = useState(false)
  const [isHidePools, setIsHidePools] = useState(false)

  const toggleIsActiveOnly = useCallback(() => setIsActiveOnly((prev) => !prev), [])
  const toggleIsCustomOnly = useCallback(() => setIsCustomOnly((prev) => !prev), [])
  const toggleIsHidePools = useCallback(() => setIsHidePools((prev) => !prev), [])

  const networkOptions = useMemo(() => {
    return [
      { id: "ALL", name: t("All active networks") } as EthNetwork,
      ...networks.concat().sort((n1, n2) => n1.name?.localeCompare(n2.name ?? "") ?? 0),
    ]
  }, [networks, t])
  const [networkId, setNetworkId] = useState<EthNetworkId>("ALL")
  const network = useNetwork(networkId)

  // search value is debounced by SearchInput component
  // keep search value in location state to preserve it when user clicks a token then goes back
  const [search, setSearch] = useState(location.state?.search ?? "")
  useEffect(() => {
    navigate(location.pathname, { replace: true, state: { search } })
  }, [location.pathname, navigate, search])

  const handleAddToken = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Add token button",
    })
    navigate("./add")
  }, [navigate])

  const ocResetAllModal = useOpenClose()

  useEffect(() => {
    // reset selected network if platform changes to an incompatible one
    if (platform !== "all" && networkId && network?.platform !== platform) setNetworkId("ALL")
  }, [platform, networkId, network])

  return (
    <>
      <div className="flex w-full gap-8">
        <HeaderBlock
          title={t("Tokens")}
          className="grow"
          text={t("Enable, add or delete custom tokens.")}
        />
        <Button primary iconLeft={PlusIcon} small onClick={handleAddToken}>
          {t("Add custom token")}
        </Button>
      </div>
      <Spacer small />
      <OptionSwitch
        options={platformOptions.map(({ value, label }) => [value, label] as const)}
        className="text-xs [&>div]:h-full"
        defaultOption={platform}
        onChange={setPlatform}
      />
      <div className="h-4"></div>
      <NetworkSelect networks={networkOptions} onChange={setNetworkId} selectedId={networkId} />
      <div className="h-4"></div>
      <div className="flex gap-4">
        <SearchInput
          initialValue={search}
          onChange={setSearch}
          placeholder={t("Search tokens")}
          containerClassName="rounded-sm"
        />
      </div>
      <div className="h-4"></div>
      <div className="flex justify-end gap-4">
        <div className="grow">
          <PillButton className="h-16" onClick={() => ocResetAllModal.open()}>
            {t("Reset active states")}
          </PillButton>
        </div>
        <TogglePill
          label={t("Active only")}
          checked={isActiveOnly}
          onChange={toggleIsActiveOnly}
          disabled={!!search}
        />
        <TogglePill
          label={t("Custom only")}
          checked={isCustomOnly}
          onChange={toggleIsCustomOnly}
          disabled={!!search}
        />
        <TogglePill
          label={t("Enable pools")}
          checked={!isHidePools}
          onChange={toggleIsHidePools}
          disabled={!!search}
        />
      </div>
      <Spacer />
      <TokensList
        platform={platform}
        isActiveOnly={isActiveOnly}
        isCustomOnly={isCustomOnly}
        isHidePools={isHidePools}
        networkId={networkId}
        search={search}
      />
      <Modal isOpen={ocResetAllModal.isOpen} onDismiss={ocResetAllModal.close}>
        <ResetStatesModalContent onClose={ocResetAllModal.close} />
      </Modal>
    </>
  )
}

export const TokensPage = () => (
  <DashboardLayout sidebar="settings">
    <Content />
  </DashboardLayout>
)

const ResetStatesModalContent: FC<{
  onClose: () => void
}> = ({ onClose }) => {
  const { t } = useTranslation()

  const handleClick = useCallback(async () => {
    activeTokensStore.mutate(() => ({}))
    onClose()
  }, [onClose])

  return (
    <ModalDialog title={t("Reset tokens")} onClose={onClose}>
      <div className="text-body-secondary mb-8 text-sm">
        {t("This will reset active state of all tokens to their Talisman defaults.")}
      </div>

      <div className="mt-4 flex justify-end gap-8">
        <Button onClick={onClose}>{t("Cancel")}</Button>
        <Button primary onClick={handleClick}>
          {t("Reset")}
        </Button>
      </div>
    </ModalDialog>
  )
}
