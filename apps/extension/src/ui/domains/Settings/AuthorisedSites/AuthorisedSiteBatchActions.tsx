import type { ProviderType } from "@core/domains/sitesAuthorised/types"
import { notify } from "@talisman/components/Notifications"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { api } from "@ui/api"
import { Button } from "@ui/components/Button"
import { Modal } from "@ui/components/Modal"
import { ModalDialog } from "@ui/components/ModalDialog"
import { type FC, type ReactNode, useCallback } from "react"
import { Trans, useTranslation } from "react-i18next"

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
        <ModalDialog onClose={close} title={confirmTitle} className="border border-grey-800">
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

export const AuthorisedSitesBatchActions: FC<{ providerType: ProviderType }> = ({
  providerType,
}) => {
  const { t } = useTranslation()

  const handleForgetAll = useCallback(async () => {
    try {
      return await api.authorizedSitesForgetAll(providerType)
    } catch {
      notify({ type: "error", title: t("Error"), subtitle: t("Failed to forget all sites") })
      return false
    }
  }, [providerType, t])

  const handleDisconnectAll = useCallback(async () => {
    try {
      return await api.authorizedSitesDisconnectAll(providerType)
    } catch {
      notify({ type: "error", title: t("Error"), subtitle: t("Failed to disconnect all sites") })
      return false
    }
  }, [providerType, t])

  return (
    <div className="flex gap-[0.5rem] text-grey-500 text-xs">
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
      <div className="w-0.5 bg-grey-700 py-1"></div>
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
