import { TALISMAN_WEB_APP_URL } from "@core/constants"
import { ProviderType } from "@core/domains/sitesAuthorised/types"
import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { notify } from "@talisman/components/Notifications"
import { Spacer } from "@talisman/components/Spacer"
import { api } from "@ui/api"
import { ProviderTypeSwitch } from "@ui/domains/Site/ProviderTypeSwitch"
import { useAuthorisedSites } from "@ui/hooks/useAuthorisedSites"
import { FC, ReactNode, useCallback, useEffect, useMemo, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { Button, Modal, ModalDialog, useOpenClose } from "talisman-ui"

import { AuthorizedSite } from "./AuthorisedSite"

const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1)

export const BatchActionButton: FC<{
  confirmTitle: ReactNode
  confirmDescription: ReactNode
  confirmBtnText: ReactNode
  children: ReactNode
  className?: string
  handler: () => Promise<boolean>
}> = ({ confirmTitle, confirmDescription, confirmBtnText, children, className, handler }) => {
  const { t } = useTranslation()
  const { isOpen, open, close } = useOpenClose()

  const handlerConfirm = useCallback(async () => {
    if (await handler()) close()
  }, [close, handler])

  return (
    <>
      <button type="button" onClick={open} className={className}>
        {children}
      </button>
      <Modal isOpen={isOpen} onDismiss={close}>
        <ModalDialog onClose={close} title={confirmTitle} className="border-grey-800 border">
          <p className="text-body-secondary">{confirmDescription}</p>
          <div className="mt-8 grid grid-cols-2 gap-8">
            <Button onClick={close}>{t("Cancel")}</Button>
            <Button primary onClick={handlerConfirm}>
              {confirmBtnText}
            </Button>
          </div>
        </ModalDialog>
      </Modal>
    </>
  )
}

const BatchActions: FC<{ providerType: ProviderType }> = ({ providerType }) => {
  const { t } = useTranslation("admin")

  const handleForgetAll = useCallback(async () => {
    try {
      return await api.authorizedSitesForgetAll(providerType)
    } catch (err) {
      notify({ type: "error", title: t("Error"), subtitle: t("Failed to forget all sites") })
      return false
    }
  }, [providerType, t])

  const handleDisconnectAll = useCallback(async () => {
    try {
      return await api.authorizedSitesDisconnectAll(providerType)
    } catch (err) {
      notify({ type: "error", title: t("Error"), subtitle: t("Failed to disconnect all sites") })
      return false
    }
  }, [providerType, t])

  return (
    <div className="text-grey-500 flex gap-[0.5rem] text-xs">
      <BatchActionButton
        confirmTitle={t("Forget All Sites")}
        confirmDescription={
          <Trans
            t={t}
            components={{ Highlight: <span className="text-body"></span> }}
            defaults="Are you sure you want to forget all <Highlight>{{providerType}}</Highlight> sites?"
            values={{ providerType: capitalize(providerType) }}
          />
        }
        confirmBtnText={t("Continue")}
        handler={handleForgetAll}
        className="hover:text-body"
      >
        {t("Forget All Sites")}
      </BatchActionButton>
      <div className="bg-grey-700 w-0.5 py-1"></div>
      <BatchActionButton
        confirmTitle={t("Disconnect All Sites")}
        confirmDescription={
          <Trans
            t={t}
            components={{ Highlight: <span className="text-body"></span> }}
            defaults="Are you sure you want to disconnect from all <Highlight>{{providerType}}</Highlight> sites?"
            values={{ providerType: capitalize(providerType) }}
          />
        }
        confirmBtnText={t("Continue")}
        handler={handleDisconnectAll}
        className="hover:text-body"
      >
        {t("Disconnect All Sites")}
      </BatchActionButton>
    </div>
  )
}

export const AuthorisedSites = () => {
  const { t } = useTranslation("admin")
  const sites = useAuthorisedSites()
  const [providerType, setProviderType] = useState<ProviderType>("polkadot")

  const siteIds = useMemo(() => {
    if (!sites) return []
    return Object.keys(sites).filter((id: string) => {
      const site = sites[id]
      switch (providerType) {
        case "polkadot":
          return !!site.addresses
        case "ethereum":
          return !!site.ethAddresses
        default:
          return false
      }
    })
  }, [providerType, sites])

  const { hasPolkadotSites, hasEthereumSites } = useMemo(
    () => ({
      hasPolkadotSites: Object.values(sites).some((site) => !!site.addresses),
      hasEthereumSites: Object.values(sites).some((site) => !!site.ethAddresses),
    }),
    [sites]
  )

  const showBatchActions = useMemo(
    () =>
      (providerType === "polkadot" && hasPolkadotSites) ||
      (providerType === "ethereum" && hasEthereumSites),
    [hasEthereumSites, hasPolkadotSites, providerType]
  )

  useEffect(() => {
    //when forgetting last ethereum site, force switch to polkadot
    if (providerType === "ethereum" && !hasEthereumSites) setProviderType("polkadot")
  }, [hasEthereumSites, providerType])

  return (
    <>
      <HeaderBlock
        title={t("Connected Sites")}
        text={t("Manage the sites that have access to your accounts")}
      />
      <Spacer large />
      <div className="flex items-center justify-between">
        <div>
          {hasEthereumSites ? (
            <ProviderTypeSwitch
              className="text-xs [&>div]:h-full"
              defaultProvider="polkadot"
              onChange={setProviderType}
            />
          ) : null}
        </div>
        {showBatchActions && <BatchActions providerType={providerType} />}
      </div>
      <Spacer small />
      <div className="flex flex-col gap-4">
        {siteIds.map((id) => (
          <AuthorizedSite key={`${providerType}-${id}`} id={id} provider={providerType} />
        ))}
        {providerType === "polkadot" && !hasPolkadotSites && (
          <div className="bg-grey-850 text-body-secondary w-full rounded p-8">
            <Trans
              t={t}
              components={{
                Link: (
                  // eslint-disable-next-line jsx-a11y/anchor-has-content
                  <a
                    href={TALISMAN_WEB_APP_URL}
                    target="_blank"
                    className="text-grey-200 hover:text-body"
                  ></a>
                ),
              }}
              defaults="You haven't connected to any Polkadot sites yet. Why not start with <Link>Talisman Portal</Link>?"
            ></Trans>
          </div>
        )}
        {sites && !hasEthereumSites && providerType === "ethereum" && (
          // This should never be displayed unless we decide to display the provider switcher without check
          <div className="bg-grey-850 w-full rounded p-8">
            {t("You haven't connected to any Ethereum sites yet.")}
          </div>
        )}
      </div>
    </>
  )
}
