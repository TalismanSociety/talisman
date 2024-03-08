import { ProviderType } from "@extension/core"
import { Accordion, AccordionIcon } from "@talisman/components/Accordion"
import { Favicon } from "@talisman/components/Favicon"
import useAuthorisedSiteById from "@ui/hooks/useAuthorisedSiteById"
import { FC, useCallback, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { Button, ModalDialog } from "talisman-ui"
import { Modal, useOpenClose } from "talisman-ui"

import { AuthorisedSiteAccount } from "./AuthorisedSiteAccount"

const Title: FC<{ name: string; domain: string }> = ({ name, domain }) => (
  <div className="flex items-center gap-3 text-base">
    <Favicon url={domain} className="text-[2rem]" />
    <div className="ml-2">{name || domain}</div>
  </div>
)

const ConfirmForgetDialog: FC<{
  siteLabel: string
  onConfirm: () => void
  onCancel: () => void
}> = ({ siteLabel, onConfirm, onCancel }) => {
  const { t } = useTranslation("admin")

  return (
    <div className="text-body-secondary text-sm">
      <p className="text-sm">
        <Trans
          t={t}
          defaults="Confirm to forget <Highlight>{{siteLabel}}</Highlight>."
          components={{ Highlight: <span className="text-body" /> }}
          values={{ siteLabel }}
        />
      </p>
      <p className="mt-4 text-sm">
        {t("You can always reconnect to this site by visiting it in the future.")}
      </p>
      <div className="mt-8 grid grid-cols-2 gap-8">
        <Button type="button" onClick={onCancel}>
          {t("Cancel")}
        </Button>
        <Button primary onClick={onConfirm}>
          {t("Forget Site")}
        </Button>
      </div>
    </div>
  )
}

const Rule = () => <div className="mx-[1em] inline-block h-[1em] w-0.5 bg-current"></div>

export const AuthorizedSite: FC<{
  id: string
  provider: ProviderType
}> = ({ id, provider }) => {
  const { t } = useTranslation("admin")
  const { origin, connected, availableAddresses, toggleAll, toggleOne, forget } =
    useAuthorisedSiteById(id, provider)
  const [showForget, setShowForget] = useState(false)
  const hideForget = useCallback(() => setShowForget(false), [])
  const confirmForget = useCallback(() => {
    forget()
    setShowForget(false)
  }, [forget])

  const { toggle, isOpen } = useOpenClose()

  return (
    <div>
      <button
        type="button"
        className=" text-body-secondary hover:text-body bg-grey-850 hover:bg-grey-800 flex h-24 w-full items-center gap-3 rounded-sm px-8 text-left"
        onClick={toggle}
      >
        <div className="text-body">
          <Title name={origin} domain={id} />
        </div>
        <div className="text-body-secondary grow">{origin === "" ? "" : id}</div>
        <div className="text-primary mr-3 shrink-0 text-right">
          {t("{{connectedCount}} of {{totalCount}}", {
            connectedCount: connected?.length ?? 0,
            totalCount: availableAddresses?.length ?? 0,
          })}
        </div>
        <div className="text-lg">
          <AccordionIcon isOpen={isOpen} />
        </div>
      </button>
      <Accordion isOpen={isOpen}>
        <div className="mt-4 flex w-full flex-col gap-2 px-8">
          <div className="text-grey-500 text-right text-xs">
            <button className="hover:text-body" onClick={() => setShowForget(true)}>
              {t("Forget Site")}
            </button>
            <Rule />
            <button className="hover:text-body" onClick={() => toggleAll(false)}>
              {t("Disconnect All")}
            </button>
            {provider !== "ethereum" && (
              <>
                <Rule />
                <button className="hover:text-body" onClick={() => toggleAll(true)}>
                  {t("Connect All")}
                </button>
              </>
            )}
          </div>
          {availableAddresses.map((address) => (
            <AuthorisedSiteAccount
              key={address}
              address={address}
              isConnected={connected.includes(address)}
              onChange={() => toggleOne(address)}
            />
          ))}
        </div>
      </Accordion>
      <Modal isOpen={showForget} onDismiss={hideForget}>
        <ModalDialog title={t("Forget Site")} onClose={hideForget}>
          <ConfirmForgetDialog
            siteLabel={origin ?? id}
            onConfirm={confirmForget}
            onCancel={hideForget}
          />
        </ModalDialog>
      </Modal>
    </div>
  )
}
