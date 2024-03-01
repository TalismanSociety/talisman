import { notify } from "@talisman/components/Notifications"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { provideContext } from "@talisman/util/provideContext"
import { api } from "@ui/api"
import { useAppState } from "@ui/hooks/useAppState"
import { useMnemonic } from "@ui/hooks/useMnemonics"
import { useCallback, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { Button, ModalDialog } from "talisman-ui"
import { Modal } from "talisman-ui"

const useMnemonicSetPvVerifierModalProvider = () => {
  const { isOpen, open: innerOpen, close } = useOpenClose()
  const [currentVerifierMnemonicId] = useAppState("vaultVerifierCertificateMnemonicId")

  const [mnemonicId, setMnemonicId] = useState<string>()
  const mnemonic = useMnemonic(mnemonicId)

  const isVerifier = useCallback(
    (mnemonicId: string) => currentVerifierMnemonicId === mnemonicId,
    [currentVerifierMnemonicId]
  )

  const open = useCallback(
    (mnemonicId?: string) => {
      setMnemonicId(mnemonicId)
      innerOpen()
    },
    [innerOpen]
  )

  return {
    mnemonic,
    isOpen,
    open,
    close,
    isVerifier,
  }
}

export const [MnemonicSetPvVerifierModalProvider, useMnemonicSetPvVerifierModal] = provideContext(
  useMnemonicSetPvVerifierModalProvider
)

export const MnemonicSetPvVerifierModal = () => {
  const { t } = useTranslation("admin")
  const { mnemonic, close, isOpen } = useMnemonicSetPvVerifierModal()
  const [certifierMnemonicId] = useAppState("vaultVerifierCertificateMnemonicId")

  const handleConfirmClick = useCallback(async () => {
    try {
      if (!mnemonic) return
      await api.setVerifierCertMnemonic("existing", { mnemonicId: mnemonic.id })
      close()
    } catch (err) {
      notify({
        type: "error",
        title: t("Failed to change PV verifier"),
        subtitle: (err as Error)?.message ?? "",
      })
    }
  }, [close, mnemonic, t])

  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={close}>
      <ModalDialog title={t("Set as Polkadot Vault Verifier")} onClose={close}>
        <div className="flex flex-col gap-4">
          <p className="text-body-secondary">
            <Trans
              t={t}
              components={{ Highlight: <span className="text-body"></span> }}
              defaults="You are about to set <Highlight>{{name}}</Highlight> as the Polkadot Vault Certifier Certficate. It will then be used to generate QR codes for network updates."
              values={{ name: mnemonic?.name }}
            />
          </p>
          {certifierMnemonicId && (
            <p className="text-body-secondary">
              <Trans
                t={t}
                components={{ Highlight: <span className="text-body"></span> }}
                defaults=" <Highlight>Caution: </Highlight>This will make accounts for networks registered with metadata signed by the current Verifier Certificate in Polkadot Vault unusable."
              />
            </p>
          )}
        </div>
        <div className="mt-12 grid grid-cols-2 gap-8">
          <Button onClick={close}>{t("Cancel")}</Button>
          <Button primary onClick={handleConfirmClick}>
            {t("Confirm")}
          </Button>
        </div>
      </ModalDialog>
    </Modal>
  )
}
