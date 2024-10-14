import { ChevronRightIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { FC, Fragment, ReactNode, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { NavLink, To, useLocation } from "react-router-dom"

const useBreadcrumbItems = (): Partial<Record<string, BreadcrumbItemProps[]>> => {
  const { t } = useTranslation()

  // this array contains all entries, instead of being a tree
  // this allows for route structures to be more flexible (ex: account add paths are not under /settings/accounts)
  return useMemo(
    () => ({
      "/settings/accounts": [{ label: t("Accounts"), to: "/settings/accounts" }],
      "/accounts/add": [
        { label: t("Accounts"), to: "/settings/accounts" },
        { label: t("Add Account"), to: "/accounts/add" },
      ],
      "/accounts/add/derived": [
        { label: t("Accounts"), to: "/settings/accounts" },
        { label: t("Add Account"), to: "/accounts/add" },
        { label: t("New"), to: "/accounts/add/derived" },
      ],
      "/accounts/add/mnemonic": [
        { label: t("Accounts"), to: "/settings/accounts" },
        { label: t("Add Account"), to: "/accounts/add" },
        { label: t("Recovery Phrase"), to: "/accounts/add/mnemonic" },
      ],
      "/accounts/add/pk": [
        { label: t("Accounts"), to: "/settings/accounts" },
        { label: t("Add Account"), to: "/accounts/add" },
        { label: t("Private Key"), to: "/accounts/add/pk" },
      ],
      "/accounts/add/json": [
        { label: t("Accounts"), to: "/settings/accounts" },
        { label: t("Add Account"), to: "/accounts/add" },
        { label: t("JSON"), to: "/accounts/add/json" },
      ],
      "/accounts/add/ledger": [
        { label: t("Accounts"), to: "/settings/accounts" },
        { label: t("Add Account"), to: "/accounts/add" },
        { label: t("Ledger"), to: "/accounts/add/ledger" },
      ],
      "/accounts/add/qr": [
        { label: t("Accounts"), to: "/settings/accounts" },
        { label: t("Add Account"), to: "/accounts/add" },
        { label: t("Polkadot Vault"), to: "/accounts/add/qr" },
      ],
      "/accounts/add/signet": [
        { label: t("Accounts"), to: "/settings/accounts" },
        { label: t("Add Account"), to: "/accounts/add" },
        { label: t("Signet Vault"), to: "/accounts/add/signet" },
      ],
      "/accounts/add/watched": [
        { label: t("Accounts"), to: "/settings/accounts" },
        { label: t("Add Account"), to: "/accounts/add" },
        { label: t("Watched Account"), to: "/accounts/add/watched" },
      ],

      "/settings/general": [{ label: t("General settings"), to: "/settings/general" }],
      "/settings/general/language": [
        { label: t("General"), to: "/settings/general" },
        { label: t("Language"), to: "/settings/general/language" },
      ],
      "/settings/general/currency": [
        { label: t("General"), to: "/settings/general" },
        { label: t("Currency"), to: "/settings/general/currency" },
      ],
      "/settings/address-book": [{ label: t("Address Book"), to: "/settings/address-book" }],
      "/settings/connected-sites": [
        { label: t("Connected Sites"), to: "/settings/connected-sites" },
      ],
      "/settings/mnemonics": [{ label: t("Recovery Phrases"), to: "/settings/mnemonics" }],
      "/settings/security-privacy-settings": [
        { label: t("Security & Privacy"), to: "/settings/security-privacy-settings" },
      ],
      "/settings/security-privacy-settings/autolock": [
        { label: t("Security & Privacy"), to: "/settings/security-privacy-settings" },
        { label: t("Auto-lock Timer"), to: "/settings/security-privacy-settings/autolock" },
      ],
      "/settings/security-privacy-settings/change-password": [
        { label: t("Security & Privacy"), to: "/settings/security-privacy-settings" },
        { label: t("Change Password"), to: "/settings/security-privacy-settings/change-password" },
      ],
      "/settings/networks-tokens": [
        { label: t("Networks & Tokens"), to: "/settings/networks-tokens" },
      ],
      "/settings/networks-tokens/asset-discovery": [
        { label: t("Networks & Tokens"), to: "/settings/networks-tokens" },
        { label: t("Asset Discovery"), to: "/settings/networks-tokens/asset-discovery" },
      ],
      "/settings/networks-tokens/networks": [
        { label: t("Networks & Tokens"), to: "/settings/networks-tokens" },
        { label: t("Networks"), to: "/settings/networks-tokens/networks" },
      ],
      "/settings/networks-tokens/tokens": [
        { label: t("Networks & Tokens"), to: "/settings/networks-tokens" },
        { label: t("Tokens"), to: "/settings/networks-tokens/tokens" },
      ],
      "/settings/networks-tokens/qr-metadata": [
        { label: t("Networks & Tokens"), to: "/settings/networks-tokens" },
        { label: t("Polkadot Vault Metadata"), to: "/settings/networks-tokens/qr-metadata" },
      ],
      "/settings/about": [{ label: t("About"), to: "/settings/about" }],
      "/settings/analytics": [{ label: t("Usage Settings"), to: "/settings/analytics" }],
    }),
    [t]
  )
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
        className
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
        selected && "!text-body-secondary font-medium"
      )}
    >
      {label}
    </NavLink>
  )
}
