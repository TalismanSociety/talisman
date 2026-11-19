import {
  DISCORD_TALISMAN_URL,
  MNEMONIC_BACKUP_DOCS_URL,
  PRIVACY_POLICY_URL,
  RELEASE_NOTES_URL,
  TALISMAN_DOCS_URL_PREFIX,
  TERMS_OF_USE_URL,
} from "@common/constants"
import {
  ActivityIcon,
  ArrowDownIcon,
  BarChartIcon,
  BookIcon,
  BookOpenIcon,
  ClockIcon,
  CodeIcon,
  CoinsIcon,
  CompassIcon,
  CreditCardIcon,
  DiscordIcon,
  DollarSignIcon,
  EyePlusIcon,
  FileTextIcon,
  FlagIcon,
  GitPullRequestIcon,
  GlobeIcon,
  HeadsetIcon,
  ImageIcon,
  InfoIcon,
  KeyIcon,
  LayersIcon,
  Link2Icon,
  LinkIcon,
  LockIcon,
  MapIcon,
  MaximizeIcon,
  PencilIcon,
  PlusCircleIcon,
  PlusIcon,
  PlusSquareIcon,
  PolkadotIcon,
  PolkadotVaultIcon,
  QrIcon,
  RepeatIcon,
  SecretIcon,
  SendIcon,
  SettingsIcon,
  ShieldIcon,
  SlidersIcon,
  StarsIcon,
  TaoIcon,
  UploadIcon,
  UsbIcon,
  UserPlusIcon,
  UsersIcon,
  ZapIcon,
} from "@talismn/icons"
import { isNotNil } from "@talismn/util"
import type { TFunction } from "i18next"

import type { AModeShortcut, AModeShortcutGroup, AModeShortcuts } from "./types"

type EntryBase = Pick<AModeShortcut, "id" | "label" | "icon" | "badge" | "disabledReason"> & {
  disabled?: boolean
}

export type AModeRouteEntry = EntryBase & {
  dashboardPath: string
  /** set when the popup has its own route for it, otherwise the popup opens the dashboard */
  popupPath?: string
}

export type AModeLinkEntry = EntryBase & { url: string }

export type AModeShortcutContext = {
  t: TFunction
  isPopup: boolean
  route: (entry: AModeRouteEntry) => AModeShortcut
  link: (entry: AModeLinkEntry) => AModeShortcut
  /** set when the selected accounts cannot send, swap or buy */
  fundsDisabledReason?: string
  isWatchedSelected: boolean
  hasSelectedAccounts: boolean
  canBuy: boolean
  isBittensorEnabled: boolean
  taoDashboardPath: string
  allBackedUp: boolean
  isLedgerCapable: boolean
  isFirefox: boolean
  actions: {
    send: () => void
    receive: () => void
    swap: () => void
    buy: () => void
    stakeTao: () => void
    helpSupport: () => void
    lock: () => void
    fullscreen: () => void
    quickSettings: () => void
  }
}

const groupOf = (
  id: string,
  title: string,
  shortcuts: (AModeShortcut | null)[]
): AModeShortcutGroup => ({ id, title, shortcuts: shortcuts.filter(isNotNil) })

export const buildAModeShortcuts = (ctx: AModeShortcutContext): AModeShortcuts => {
  const { t, isPopup, route, link, actions } = ctx
  const fundsDisabled = !!ctx.fundsDisabledReason
  const funds = { disabled: fundsDisabled, disabledReason: ctx.fundsDisabledReason }
  const unsupported = t("Not supported on this browser")

  const earn = route({
    id: "earn",
    label: t("Earn"),
    icon: StarsIcon,
    dashboardPath: "/earn",
    popupPath: "/earn",
  })
  const buy: AModeShortcut | null = ctx.canBuy
    ? { id: "buy-sell", label: t("Buy/Sell"), icon: CreditCardIcon, onClick: actions.buy, ...funds }
    : null
  const swap: AModeShortcut = {
    id: "swap",
    label: t("Swap"),
    icon: RepeatIcon,
    onClick: actions.swap,
    ...funds,
  }

  const primary: AModeShortcut[] = [
    { id: "send", label: t("Send"), icon: SendIcon, onClick: actions.send, ...funds },
    {
      id: "receive",
      label: ctx.isWatchedSelected ? t("Copy") : t("Receive"),
      icon: ArrowDownIcon,
      onClick: actions.receive,
      disabled: !ctx.hasSelectedAccounts,
    },
    swap,
    buy ?? earn,
  ]

  const page = (id: string, label: string, icon: AModeShortcut["icon"], path: string) =>
    route({ id, label, icon, dashboardPath: path })

  const groups: AModeShortcutGroup[] = [
    groupOf("trade-earn", t("Trade & earn"), [
      buy ? earn : null,
      route({
        id: "earn-positions",
        label: t("Earn positions"),
        icon: BarChartIcon,
        dashboardPath: "/earn/positions",
        popupPath: "/earn/positions",
      }),
      route({
        id: "earn-discover",
        label: t("Discover yield"),
        icon: CompassIcon,
        dashboardPath: "/earn/discover",
        popupPath: "/earn/discover",
      }),
      ctx.isBittensorEnabled
        ? {
            id: "stake-tao",
            label: t("Stake TAO"),
            icon: ZapIcon,
            onClick: actions.stakeTao,
            ...funds,
          }
        : null,
      ctx.isBittensorEnabled
        ? page("trade-tao", t("Trade TAO"), TaoIcon, ctx.taoDashboardPath)
        : null,
      route({
        id: "nfts",
        label: t("NFTs"),
        icon: ImageIcon,
        dashboardPath: "/portfolio/nfts",
        popupPath: "/portfolio/nfts",
      }),
      route({
        id: "defi",
        label: t("DeFi"),
        icon: LayersIcon,
        dashboardPath: "/portfolio/defi",
        popupPath: "/portfolio/defi",
      }),
      route({
        id: "activity",
        label: t("Activity"),
        icon: ActivityIcon,
        dashboardPath: "/tx-history",
        popupPath: "/tx-history",
      }),
    ]),
    groupOf("create-import", t("Create & import"), [
      page("add-account", t("Add account"), PlusIcon, "/accounts/add"),
      page(
        "new-ethereum",
        t("New Ethereum account"),
        PlusCircleIcon,
        "/accounts/add/derived?platform=ethereum"
      ),
      page(
        "new-polkadot",
        t("New Polkadot account"),
        PolkadotIcon,
        "/accounts/add/derived?platform=polkadot"
      ),
      page(
        "new-solana",
        t("New Solana account"),
        UserPlusIcon,
        "/accounts/add/derived?platform=solana"
      ),
      page("import-phrase", t("Import recovery phrase"), KeyIcon, "/accounts/add/mnemonic"),
      page("import-pk", t("Import private key"), SecretIcon, "/accounts/add/pk"),
      page("import-json", t("Import JSON"), UploadIcon, "/accounts/add/json"),
    ]),
    groupOf("connect-manage", t("Connect & manage"), [
      route({
        id: "connect-ledger",
        label: t("Connect Ledger"),
        icon: UsbIcon,
        dashboardPath: "/accounts/add/ledger",
        disabled: !ctx.isLedgerCapable,
        disabledReason: unsupported,
      }),
      page("connect-vault", t("Connect Polkadot Vault"), PolkadotVaultIcon, "/accounts/add/qr"),
      route({
        id: "connect-signet",
        label: t("Connect Signet"),
        icon: Link2Icon,
        dashboardPath: "/accounts/add/signet",
        disabled: ctx.isFirefox,
        disabledReason: unsupported,
      }),
      page(
        "watch-ethereum",
        t("Watch Ethereum"),
        EyePlusIcon,
        "/accounts/add/watched?platform=ethereum"
      ),
      page(
        "watch-polkadot",
        t("Watch Polkadot"),
        EyePlusIcon,
        "/accounts/add/watched?platform=polkadot"
      ),
      page("watch-solana", t("Watch Solana"), EyePlusIcon, "/accounts/add/watched?platform=solana"),
      route({
        id: "manage-accounts",
        label: t("Manage accounts"),
        icon: PencilIcon,
        dashboardPath: "/settings/accounts",
        popupPath: "/manage-accounts",
      }),
      page("address-book", t("Address book"), UsersIcon, "/settings/address-book"),
    ]),
    groupOf("networks-tokens", t("Networks & tokens"), [
      page(
        "manage-networks",
        t("Manage networks"),
        GlobeIcon,
        "/settings/networks-tokens/networks"
      ),
      page("manage-tokens", t("Manage tokens"), CoinsIcon, "/settings/networks-tokens/tokens"),
      page(
        "add-network",
        t("Add custom network"),
        PlusSquareIcon,
        "/settings/networks-tokens/networks/add"
      ),
      page(
        "add-token",
        t("Add custom token"),
        PlusCircleIcon,
        "/settings/networks-tokens/tokens/add"
      ),
      page(
        "vault-metadata",
        t("Polkadot Vault metadata"),
        QrIcon,
        "/settings/networks-tokens/qr-metadata"
      ),
    ]),
    groupOf("security", t("Security"), [
      route({
        id: "recovery-phrases",
        label: t("Recovery phrases"),
        icon: KeyIcon,
        dashboardPath: "/settings/mnemonics",
        badge: !ctx.allBackedUp,
      }),
      page(
        "security-privacy",
        t("Security & privacy"),
        ShieldIcon,
        "/settings/security-privacy-settings"
      ),
      page(
        "change-password",
        t("Change password"),
        LockIcon,
        "/settings/security-privacy-settings/change-password"
      ),
      page("connected-sites", t("Connected sites"), LinkIcon, "/settings/connected-sites"),
      page("auto-lock", t("Auto-lock"), ClockIcon, "/settings/security-privacy-settings/autolock"),
      isPopup
        ? { id: "lock", label: t("Lock wallet"), icon: LockIcon, onClick: actions.lock }
        : null,
    ]),
    groupOf("settings", t("Settings"), [
      page("general-settings", t("General settings"), SettingsIcon, "/settings/general"),
      page("language", t("Language"), FlagIcon, "/settings/general/language"),
      page("currency", t("Currency"), DollarSignIcon, "/settings/general/currency"),
      page("analytics", t("Analytics"), BookIcon, "/settings/analytics"),
      isPopup
        ? {
            id: "quick-settings",
            label: t("Quick settings"),
            icon: SlidersIcon,
            onClick: actions.quickSettings,
          }
        : null,
      isPopup
        ? {
            id: "fullscreen",
            label: t("Fullscreen"),
            icon: MaximizeIcon,
            onClick: actions.fullscreen,
          }
        : null,
    ]),
    groupOf("help-about", t("Help & about"), [
      isPopup
        ? {
            id: "help-support",
            label: t("Help & support"),
            icon: HeadsetIcon,
            onClick: actions.helpSupport,
          }
        : null,
      page("about", t("About"), InfoIcon, "/settings/about"),
      link({ id: "docs", label: t("Docs"), icon: CodeIcon, url: TALISMAN_DOCS_URL_PREFIX }),
      link({
        id: "changelog",
        label: t("Changelog"),
        icon: GitPullRequestIcon,
        url: RELEASE_NOTES_URL,
      }),
      link({ id: "discord", label: t("Discord"), icon: DiscordIcon, url: DISCORD_TALISMAN_URL }),
      link({
        id: "privacy-policy",
        label: t("Privacy policy"),
        icon: FileTextIcon,
        url: PRIVACY_POLICY_URL,
      }),
      link({ id: "terms-of-use", label: t("Terms of use"), icon: MapIcon, url: TERMS_OF_USE_URL }),
      link({
        id: "backup-guide",
        label: t("Backup guide"),
        icon: BookOpenIcon,
        url: MNEMONIC_BACKUP_DOCS_URL,
      }),
    ]),
  ]

  const byId = Object.fromEntries(
    [...primary, ...groups.flatMap((group) => group.shortcuts)].map((s) => [s.id, s])
  )

  return { primary, groups, byId }
}
