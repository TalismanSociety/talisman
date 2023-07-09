import { ProviderType } from "@core/domains/sitesAuthorised/types"
import { Accordion, AccordionIcon } from "@talisman/components/Accordion"
import Dialog from "@talisman/components/Dialog"
import { Favicon } from "@talisman/components/Favicon"
import { Modal } from "@talisman/components/Modal"
import { ModalDialog } from "@talisman/components/ModalDialog"
import { ReactComponent as IconAlert } from "@talisman/theme/icons/alert-circle.svg"
import useAuthorisedSiteById from "@ui/hooks/useAuthorisedSiteById"
import { FC, useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import { useOpenClose } from "talisman-ui"

import { AuthorisedSiteAccount } from "./AuthorisedSiteAccount"

const Title: FC<{ name: string; domain: string }> = ({ name, domain }) => (
  <div className="flex items-center gap-3 text-base">
    <Favicon url={domain} className="text-[2rem]" />
    <div className="ml-2">{name || domain}</div>
  </div>
)

const ConfirmForgetDialog: FC<{ onConfirm: () => void; onCancel: () => void }> = ({
  onConfirm,
  onCancel,
}) => {
  const { t } = useTranslation("admin")
  return (
    <Dialog
      icon={<IconAlert />}
      title={t("Are you sure?")}
      text={t("You can always reconnect to this site by visiting it in the future.")}
      confirmText={t("Forget Site")}
      cancelText={t("Cancel")}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
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
        <div className="text-primary mr-3">{connected?.length}</div>
        <div>
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
      <Modal open={showForget} onClose={hideForget}>
        <ModalDialog title={t("Confirm Forget")} onClose={hideForget}>
          <ConfirmForgetDialog onConfirm={confirmForget} onCancel={hideForget} />
        </ModalDialog>
      </Modal>
    </div>
  )
}
