import { AccountJsonAny } from "@extension/core"
import { Accordion, AccordionIcon } from "@talisman/components/Accordion"
import { InfoIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { AccountsStack } from "@ui/apps/dashboard/routes/Settings/Accounts/AccountIconsStack"
import useAccounts from "@ui/hooks/useAccounts"
import { FC, ReactNode, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useOpenClose } from "talisman-ui"

import { FormattedAddress } from "../Account/FormattedAddress"
import { ConnectedSiteIndicator } from "./ConnectedSiteIndicator"
import { SiteConnectionStatus } from "./types"

const ConnectionStatusContainer: FC<{
  status: SiteConnectionStatus
  className?: string
  children: ReactNode
}> = ({ status, className, children }) => {
  const colors = useMemo(() => {
    switch (status) {
      case "connected":
        return "bg-gradient-to-r from-green-500/50 to-grey-800"
      case "disconnected":
        return "bg-gradient-to-r from-brand-orange/50 to-grey-800"
      case "disabled":
        return "bg-gradient-to-r from-grey-500/50 to-grey-800"
    }
  }, [status])

  return (
    <div className={classNames("rounded-sm p-0.5", colors)}>
      <div className={classNames("overflow-hidden rounded-sm", className)}>{children}</div>
    </div>
  )
}

const ConnectedAccountsSummary: FC<{ connectedAccounts: AccountJsonAny[] }> = ({
  connectedAccounts,
}) => {
  const { t } = useTranslation()
  return (
    <>
      {connectedAccounts.length > 1 && (
        <div className="flex items-center gap-2">
          <AccountsStack accounts={connectedAccounts} />
          <div className="text-body text-xs">
            {t("{{count}} connected", { count: connectedAccounts.length })}
          </div>
        </div>
      )}
      {connectedAccounts.length === 1 && (
        <FormattedAddress
          className="text-body text-xs"
          address={connectedAccounts[0].address}
          noTooltip
        />
      )}
      {!connectedAccounts.length && (
        <div className="text-body-disabled text-xs">{t("Not connected")}</div>
      )}
    </>
  )
}

const ConnectAccountsExpandedContainer: FC<{
  label: string
  status: SiteConnectionStatus
  connectedAddresses: string[]
  infoText: string
  children: ReactNode
}> = ({ label, status, connectedAddresses, infoText, children }) => {
  const accounts = useAccounts()

  const connectedAccounts = useMemo(() => {
    return accounts.filter((account) => connectedAddresses.includes(account.address))
  }, [accounts, connectedAddresses])

  return (
    <ConnectionStatusContainer status={status} className="bg-black">
      <div className="bg-grey-900 px-6 py-3">
        <div className="flex flex-col">
          <div className="border-grey-800 border-b pb-3">
            <div className="text-body-secondary hover:text-body flex w-full py-2">
              <div className="flex w-12 shrink-0">
                <ConnectedSiteIndicator status={status} />
              </div>
              <div className="text-body grow">{label}</div>
              {status !== "disabled" && (
                <ConnectedAccountsSummary connectedAccounts={connectedAccounts} />
              )}
            </div>
          </div>
          <span className="text-grey-600 flex items-center gap-1 pt-3 text-xs">
            <InfoIcon />
            <span>{infoText}</span>
          </span>
        </div>
      </div>
      <div>{children}</div>
    </ConnectionStatusContainer>
  )
}

const ConnectAccountsAccordionContainer: FC<{
  label: string
  status: SiteConnectionStatus
  connectedAddresses: string[]
  infoText: string
  children: ReactNode
}> = ({ label, status, connectedAddresses, infoText, children }) => {
  const { isOpen, toggle } = useOpenClose()
  const accounts = useAccounts()

  const connectedAccounts = useMemo(() => {
    return accounts.filter((account) => connectedAddresses.includes(account.address))
  }, [accounts, connectedAddresses])

  return (
    <ConnectionStatusContainer status={status} className="bg-black">
      <button type="button" onClick={toggle} className="bg-grey-900 w-full px-6 py-3">
        <div className="flex flex-col">
          <div className={"border-grey-800 border-b pb-3"}>
            <div className="flex w-full gap-6 py-2">
              <div className="flex grow items-center gap-3 text-left">
                <ConnectedSiteIndicator status={status} />
                <div className="text-body">{label}</div>
              </div>
              {status !== "disabled" && (
                <ConnectedAccountsSummary connectedAccounts={connectedAccounts} />
              )}
              <AccordionIcon isOpen={isOpen} />
            </div>
          </div>
          <span className="text-grey-600 flex items-center gap-1 pt-3 text-xs">
            <InfoIcon />
            <span>{infoText}</span>
          </span>
        </div>
      </button>
      <Accordion isOpen={isOpen}>{children}</Accordion>
    </ConnectionStatusContainer>
  )
}

export const ConnectAccountsContainer: FC<{
  label: string
  status: SiteConnectionStatus
  connectedAddresses: string[]
  isSingleProvider?: boolean
  infoText: string
  children: ReactNode
}> = ({ label, status, connectedAddresses, infoText, children, isSingleProvider }) => {
  const Container = isSingleProvider
    ? ConnectAccountsExpandedContainer
    : ConnectAccountsAccordionContainer

  return (
    <Container
      label={label}
      status={status}
      connectedAddresses={connectedAddresses}
      infoText={infoText}
    >
      {children}
    </Container>
  )
}
