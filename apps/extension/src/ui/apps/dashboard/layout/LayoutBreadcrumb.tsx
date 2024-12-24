import { ChevronRightIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { FC, Fragment, ReactNode, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { NavLink, To, useLocation } from "react-router-dom"

const useBreadcrumbItems = (): Partial<Record<string, BreadcrumbItemProps[]>> => {
  const { t } = useTranslation()

  // this array contains all entries, instead of being a tree
  // this allows for route structures to be more flexible (ex: account add paths are not under /settings/accounts)
  return useMemo(() => {
    // reusables
    const settings = { label: t("Settings"), to: "/settings/general" }
    const accounts = { label: t("Accounts"), to: "/settings/accounts" }
    const accountsAdd = { label: t("Add Account"), to: "/accounts/add" }
    const securityAndPrivacy = {
      label: t("Security & Privacy"),
      to: "/settings/security-privacy-settings",
    }
    const networksAndTokens = { label: t("Networks & Tokens"), to: "/settings/networks-tokens" }

    return {
      "/settings/accounts": [settings, accounts],
      "/accounts/add": [settings, accounts, accountsAdd],
      "/accounts/add/derived": [
        settings,
        accounts,
        accountsAdd,
        { label: t("New"), to: "/accounts/add/derived" },
      ],
      "/accounts/add/mnemonic": [
        settings,
        accounts,
        accountsAdd,
        { label: t("Recovery Phrase"), to: "/accounts/add/mnemonic" },
      ],
      "/accounts/add/pk": [
        settings,
        accounts,
        accountsAdd,
        { label: t("Private Key"), to: "/accounts/add/pk" },
      ],
      "/accounts/add/json": [
        settings,
        accounts,
        accountsAdd,
        { label: t("JSON"), to: "/accounts/add/json" },
      ],
      "/accounts/add/ledger": [
        settings,
        accounts,
        accountsAdd,
        { label: t("Ledger"), to: "/accounts/add/ledger" },
      ],
      "/accounts/add/qr": [
        settings,
        accounts,
        accountsAdd,
        { label: t("Polkadot Vault"), to: "/accounts/add/qr" },
      ],
      "/accounts/add/signet": [
        settings,
        accounts,
        accountsAdd,
        { label: t("Signet Vault"), to: "/accounts/add/signet" },
      ],
      "/accounts/add/watched": [
        settings,
        accounts,
        accountsAdd,
        { label: t("Watched Account"), to: "/accounts/add/watched" },
      ],

      "/settings/general": [settings],
      "/settings/general/language": [
        settings,
        { label: t("Language"), to: "/settings/general/language" },
      ],
      "/settings/general/currency": [
        settings,
        { label: t("Currency"), to: "/settings/general/currency" },
      ],
      "/settings/address-book": [
        settings,
        { label: t("Address Book"), to: "/settings/address-book" },
      ],
      "/settings/connected-sites": [
        settings,
        { label: t("Connected Sites"), to: "/settings/connected-sites" },
      ],
      "/settings/mnemonics": [
        settings,
        { label: t("Recovery Phrases"), to: "/settings/mnemonics" },
      ],
      "/settings/security-privacy-settings": [settings, securityAndPrivacy],
      "/settings/security-privacy-settings/autolock": [
        settings,
        securityAndPrivacy,
        { label: t("Auto-lock Timer"), to: "/settings/security-privacy-settings/autolock" },
      ],
      "/settings/security-privacy-settings/change-password": [
        settings,
        securityAndPrivacy,
        { label: t("Change Password"), to: "/settings/security-privacy-settings/change-password" },
      ],
      "/settings/networks-tokens": [settings, networksAndTokens],
      "/settings/networks-tokens/asset-discovery": [
        settings,
        networksAndTokens,
        { label: t("Asset Discovery"), to: "/settings/networks-tokens/asset-discovery" },
      ],
      "/settings/networks-tokens/networks": [
        settings,
        networksAndTokens,
        { label: t("Networks"), to: "/settings/networks-tokens/networks" },
      ],
      "/settings/networks-tokens/tokens": [
        settings,
        networksAndTokens,
        { label: t("Tokens"), to: "/settings/networks-tokens/tokens" },
      ],
      "/settings/networks-tokens/qr-metadata": [
        settings,
        networksAndTokens,
        { label: t("Polkadot Vault Metadata"), to: "/settings/networks-tokens/qr-metadata" },
      ],
      "/settings/about": [settings, { label: t("About"), to: "/settings/about" }],
      "/settings/analytics": [settings, { label: t("Usage Settings"), to: "/settings/analytics" }],
    }
  }, [t])
}

const useBreadcrumb = () => {
  const breadcrumbItems = useBreadcrumbItems()
  const location = useLocation()

  return useMemo(() => {
    let path = location.pathname
    while (!breadcrumbItems[path] && path.includes("/")) path = path.slice(0, path.lastIndexOf("/"))
    return breadcrumbItems[path] ?? null
  }, [breadcrumbItems, location])
}

export const LayoutBreadcrumb: FC<{
  className?: string
}> = ({ className }) => {
  const items = useBreadcrumb()

  if (!items) return null

  return (
    <div
      className={classNames(
        "text-body-inactive mb-6 flex max-w-full items-center gap-1 overflow-hidden text-xs",
        className,
      )}
    >
      {items.map(({ label, to }, index) => {
        return (
          <Fragment key={index}>
            <BreadcrumbItem label={label} to={to} selected={index === items.length - 1} />
            {index < items.length - 1 && <ChevronRightIcon />}
          </Fragment>
        )
      })}
    </div>
  )
}

type BreadcrumbItemProps = {
  label: ReactNode
  to: To
}

const BreadcrumbItem: FC<BreadcrumbItemProps & { selected: boolean }> = ({
  label,
  to,
  selected,
}) => {
  return (
    <NavLink
      to={to}
      className={classNames(
        "hover:text-body-secondary flex items-center gap-4 truncate font-normal",
        selected && "!text-body-secondary font-medium",
      )}
    >
      {label}
    </NavLink>
  )
}
