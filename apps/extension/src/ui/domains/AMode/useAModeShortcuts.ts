import { isAccountOwned } from "@core/domains/keyring/exports"
import {
  ActivityIcon,
  ArrowDownIcon,
  BookIcon,
  ClockIcon,
  CoinsIcon,
  CreditCardIcon,
  DollarSignIcon,
  EyeIcon,
  FlagIcon,
  GlobeIcon,
  HeadsetIcon,
  ImageIcon,
  InfoIcon,
  KeyIcon,
  LayersIcon,
  LinkIcon,
  LockIcon,
  PencilIcon,
  PlusIcon,
  QrIcon,
  RepeatIcon,
  SendIcon,
  SettingsIcon,
  ShieldIcon,
  StarsIcon,
  TaoIcon,
  UsbIcon,
  UsersIcon,
} from "@talismn/icons"
import { isNotNil } from "@talismn/util"
import { api } from "@ui/api"
import { useHelpAndSupportDrawerOpenClose } from "@ui/apps/popup/components/Navigation/HelpAndSupportDrawer"
import { useCopyAddressModal } from "@ui/domains/CopyAddress"
import { usePortfolioNavigation } from "@ui/domains/Portfolio/usePortfolioNavigation"
import { useRampsModal } from "@ui/domains/Ramps/useRampsModal"
import { useSwapModal } from "@ui/domains/Swap/hooks/useSwapModal"
import {
  useDefaultTaoDashboardNetworkId,
  useIsBittensorEnabled,
} from "@ui/domains/TaoDashboard/hooks/useIsBittensorEnabled"
import { getTaoDashboardUrl } from "@ui/domains/TaoDashboard/shared/util"
import { useMnemonicsAllBackedUp } from "@ui/hooks/useMnemonicsAllBackedUp"
import { BITTENSOR_NETWORK_ID } from "@ui/state/bittensor"
import { useFeatureFlag } from "@ui/state/remoteConfig"
import { closeIfEmbeddedPopup } from "@ui/util/closeIfEmbeddedPopup"
import { IS_POPUP } from "@ui/util/constants"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import type { AModeShortcut, AModeShortcutGroup, AModeShortcuts } from "./types"

type RouteEntry = Pick<AModeShortcut, "id" | "label" | "icon" | "badge"> & {
  dashboardPath: string
  /** set when the popup has its own route for it, otherwise the popup opens the dashboard */
  popupPath?: string
}

export const useAModeShortcuts = (): AModeShortcuts => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { selectedAccounts, selectedAccount } = usePortfolioNavigation()
  const { open: openCopyAddressModal } = useCopyAddressModal()
  const { open: openSwapModal } = useSwapModal()
  const { open: openRampsModal } = useRampsModal()
  const { open: openHelpAndSupport } = useHelpAndSupportDrawerOpenClose()
  const canBuy = useFeatureFlag("BUY_CRYPTO")
  const isBittensorEnabled = useIsBittensorEnabled()
  const taoDashboardNetworkId = useDefaultTaoDashboardNetworkId()
  const allBackedUp = useMnemonicsAllBackedUp()

  const hasOwned = selectedAccounts.some(isAccountOwned)
  const isWatchedSelected = !!selectedAccount && !isAccountOwned(selectedAccount)
  const selectedAddress = selectedAccount?.address

  return useMemo(() => {
    const fundsDisabledReason =
      isWatchedSelected || !hasOwned
        ? t("Cannot send or receive funds on accounts that you don't own")
        : undefined
    const fundsDisabled = !!fundsDisabledReason

    const fromRoute = ({ dashboardPath, popupPath, ...entry }: RouteEntry): AModeShortcut => ({
      ...entry,
      onClick: () => {
        if (!IS_POPUP) navigate(dashboardPath)
        else if (popupPath) navigate(popupPath)
        else {
          api.dashboardOpen(dashboardPath)
          closeIfEmbeddedPopup()
        }
      },
    })

    const earn = fromRoute({
      id: "earn",
      label: t("Earn"),
      icon: StarsIcon,
      dashboardPath: "/earn",
      popupPath: "/earn",
    })

    const buyOrEarn: AModeShortcut = canBuy
      ? {
          id: "buy-sell",
          label: t("Buy/Sell"),
          icon: CreditCardIcon,
          onClick: () => openRampsModal({ entry: "a_mode" }),
          disabled: fundsDisabled,
          disabledReason: fundsDisabledReason,
        }
      : earn

    const primary: AModeShortcut[] = [
      {
        id: "send",
        label: t("Send"),
        icon: SendIcon,
        onClick: () => {
          const opened = api.sendFundsOpen({ entry: "a_mode", from: selectedAddress })
          if (IS_POPUP) opened.then(() => window.close())
        },
        disabled: fundsDisabled,
        disabledReason: fundsDisabledReason,
      },
      {
        id: "receive",
        label: isWatchedSelected ? t("Copy") : t("Receive"),
        icon: ArrowDownIcon,
        onClick: () => openCopyAddressModal({ entry: "a_mode", address: selectedAddress }),
        disabled: !selectedAccounts.length,
      },
      {
        id: "swap",
        label: t("Swap"),
        icon: RepeatIcon,
        onClick: () => openSwapModal({ entry: "a_mode" }),
        disabled: fundsDisabled,
        disabledReason: fundsDisabledReason,
      },
      buyOrEarn,
    ]

    const taoPath = getTaoDashboardUrl(taoDashboardNetworkId ?? BITTENSOR_NETWORK_ID)

    const groups: AModeShortcutGroup[] = [
      {
        id: "trade-earn",
        title: t("Trade & earn"),
        shortcuts: [
          buyOrEarn === earn ? null : earn,
          isBittensorEnabled
            ? fromRoute({
                id: "trade-tao",
                label: t("Trade TAO"),
                icon: TaoIcon,
                dashboardPath: taoPath,
              })
            : null,
          fromRoute({
            id: "nfts",
            label: t("NFTs"),
            icon: ImageIcon,
            dashboardPath: "/portfolio/nfts",
            popupPath: "/portfolio/nfts",
          }),
          fromRoute({
            id: "defi",
            label: t("DeFi"),
            icon: LayersIcon,
            dashboardPath: "/portfolio/defi",
            popupPath: "/portfolio/defi",
          }),
          fromRoute({
            id: "activity",
            label: t("Activity"),
            icon: ActivityIcon,
            dashboardPath: "/tx-history",
            popupPath: "/tx-history",
          }),
        ].filter(isNotNil),
      },
      {
        id: "accounts",
        title: t("Accounts"),
        shortcuts: [
          fromRoute({
            id: "add-account",
            label: t("Add account"),
            icon: PlusIcon,
            dashboardPath: "/accounts/add",
          }),
          fromRoute({
            id: "import-phrase",
            label: t("Import recovery phrase"),
            icon: KeyIcon,
            dashboardPath: "/accounts/add/mnemonic",
          }),
          fromRoute({
            id: "connect-ledger",
            label: t("Connect Ledger"),
            icon: UsbIcon,
            dashboardPath: "/accounts/add/ledger",
          }),
          fromRoute({
            id: "watch-account",
            label: t("Watch account"),
            icon: EyeIcon,
            dashboardPath: "/accounts/add/watched",
          }),
          fromRoute({
            id: "manage-accounts",
            label: t("Manage accounts"),
            icon: PencilIcon,
            dashboardPath: "/settings/accounts",
            popupPath: "/manage-accounts",
          }),
          fromRoute({
            id: "address-book",
            label: t("Address book"),
            icon: UsersIcon,
            dashboardPath: "/settings/address-book",
          }),
        ],
      },
      {
        id: "networks-tokens",
        title: t("Networks & tokens"),
        shortcuts: [
          fromRoute({
            id: "manage-networks",
            label: t("Manage networks"),
            icon: GlobeIcon,
            dashboardPath: "/settings/networks-tokens/networks",
          }),
          fromRoute({
            id: "manage-tokens",
            label: t("Manage tokens"),
            icon: CoinsIcon,
            dashboardPath: "/settings/networks-tokens/tokens",
          }),
          fromRoute({
            id: "vault-metadata",
            label: t("Polkadot Vault metadata"),
            icon: QrIcon,
            dashboardPath: "/settings/networks-tokens/qr-metadata",
          }),
        ],
      },
      {
        id: "security",
        title: t("Security"),
        shortcuts: [
          fromRoute({
            id: "recovery-phrases",
            label: t("Recovery phrases"),
            icon: KeyIcon,
            dashboardPath: "/settings/mnemonics",
            badge: !allBackedUp,
          }),
          fromRoute({
            id: "security-privacy",
            label: t("Security & privacy"),
            icon: ShieldIcon,
            dashboardPath: "/settings/security-privacy-settings",
          }),
          fromRoute({
            id: "connected-sites",
            label: t("Connected sites"),
            icon: LinkIcon,
            dashboardPath: "/settings/connected-sites",
          }),
          fromRoute({
            id: "auto-lock",
            label: t("Auto-lock"),
            icon: ClockIcon,
            dashboardPath: "/settings/security-privacy-settings/autolock",
          }),
          IS_POPUP
            ? {
                id: "lock",
                label: t("Lock wallet"),
                icon: LockIcon,
                onClick: () => {
                  api.lock()
                  window.close()
                },
              }
            : null,
        ].filter(isNotNil),
      },
      {
        id: "settings-help",
        title: t("Settings & help"),
        shortcuts: [
          fromRoute({
            id: "general-settings",
            label: t("General settings"),
            icon: SettingsIcon,
            dashboardPath: "/settings/general",
          }),
          fromRoute({
            id: "language",
            label: t("Language"),
            icon: FlagIcon,
            dashboardPath: "/settings/general/language",
          }),
          fromRoute({
            id: "currency",
            label: t("Currency"),
            icon: DollarSignIcon,
            dashboardPath: "/settings/general/currency",
          }),
          fromRoute({
            id: "analytics",
            label: t("Analytics"),
            icon: BookIcon,
            dashboardPath: "/settings/analytics",
          }),
          fromRoute({
            id: "about",
            label: t("About"),
            icon: InfoIcon,
            dashboardPath: "/settings/about",
          }),
          IS_POPUP
            ? {
                id: "help-support",
                label: t("Help & support"),
                icon: HeadsetIcon,
                onClick: openHelpAndSupport,
              }
            : null,
        ].filter(isNotNil),
      },
    ]

    return { primary, groups }
  }, [
    t,
    navigate,
    hasOwned,
    isWatchedSelected,
    selectedAccounts.length,
    selectedAddress,
    openCopyAddressModal,
    openSwapModal,
    openRampsModal,
    openHelpAndSupport,
    canBuy,
    isBittensorEnabled,
    taoDashboardNetworkId,
    allBackedUp,
  ])
}
