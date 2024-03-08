import { POLKADOT_VAULT_DOCS_URL } from "@extension/shared"
import { HeaderBlock } from "@talisman/components/HeaderBlock"
import {
  MnemonicCreateModal,
  MnemonicCreateModalProvider,
  useMnemonicCreateModal,
} from "@ui/apps/dashboard/routes/Settings/Mnemonics/MnemonicCreateModal"
import { useMnemonics } from "@ui/hooks/useMnemonics"
import { ReactNode, useMemo } from "react"
import { Trans, useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

import { useAccountAddQr } from "./context"
import { MnemonicForm } from "./MnemonicForm"

const VerifierCertificateOption = ({ text, children }: { text: string; children: ReactNode }) => (
  <div className="text-body-secondary grid grid-cols-2 items-center gap-8 text-sm">
    {children}
    <div className="p-2">{text}</div>
  </div>
)

const ConfigureVerifierCertificateMnemonicForm = () => {
  const { t } = useTranslation("admin")
  const { dispatch, state, submit } = useAccountAddQr()
  const mnemonics = useMnemonics()
  const { generateMnemonic } = useMnemonicCreateModal()

  // TODO user should choose which one to pick
  const existingMnemonicId = useMemo(() => {
    const existing = mnemonics.find((s) => ["legacy", "imported", "generated"].includes(s.source))
    if (existing) return existing.id
    return
  }, [mnemonics])

  const canSubmit = useMemo(() => {
    if (state.type !== "CONFIGURE_VERIFIER_CERT") return null
    if (!state.verifierCertificateConfig) return null
    const {
      verifierCertificateConfig: {
        verifierCertificateType,
        verifierCertificateMnemonicId,
        verifierCertificateMnemonic,
      },
    } = state
    return (
      !state.submitting &&
      ((verifierCertificateType &&
        ((verifierCertificateType === "existing" && verifierCertificateMnemonicId) ||
          (verifierCertificateType === "import" && verifierCertificateMnemonic) ||
          (verifierCertificateType === "new" && verifierCertificateMnemonic))) ||
        verifierCertificateType === null)
    )
  }, [state])

  if (state.type !== "CONFIGURE_VERIFIER_CERT") return null

  return (
    <div>
      <HeaderBlock
        className="mb-12"
        title={t("Configure your Polkadot Vault Verifier Certificate Mnemonic")}
        text={t(
          "To use your Polkadot Vault with Talisman, you need to configure your Polkadot Vault Verifier Certificate Mnemonic."
        )}
      />
      {(!state.verifierCertificateConfig ||
        state.verifierCertificateConfig.verifierCertificateType !== "import") && (
        <div className="flex flex-col gap-8">
          <span>{t("Why do I need to do this?")}</span>
          <div className="text-body-secondary text-sm">
            <Trans t={t}>
              Polkadot Vault requires that the specification and the metadata for each chain are
              signed with a 'Verifier Certificate'. Talisman can generate its own Verifier
              Certificate from a mnemonic, enabling you to add networks and update metadata on your
              Polkadot Vault device without needing to trust an external source. If you prefer to
              use an external Verifier Certificate, you can use the Parity or Nova Wallet metadata
              sources, simply by selecting "Don't use a Verifier Certificate Mnemonic" below.
            </Trans>
          </div>
          <span className="text-body-secondary text-sm">
            <a
              href={POLKADOT_VAULT_DOCS_URL}
              target="_blank"
              className="hover:text-primary text-grey-200"
            >
              {t("Read more about Talisman's Polkadot Vault integration here.")}
            </a>
          </span>
          <span>{t("Choose an option")}</span>

          {existingMnemonicId && (
            <VerifierCertificateOption
              text={t(
                "Use this option to use your existing Talisman recovery phrase as your Polkadot Vault Verifier Certificate Mnemonic. Choose this option if you are not sure what to do."
              )}
            >
              <Button
                className="secondary text-sm"
                onClick={() =>
                  dispatch({
                    method: "setVerifierCertType",
                    verifierCertificateType: "existing",
                    verifierCertificateMnemonicId: existingMnemonicId,
                  })
                }
              >
                {t("Use my existing Talisman mnemonic")}
              </Button>
            </VerifierCertificateOption>
          )}
          {!existingMnemonicId && (
            <VerifierCertificateOption
              text={t(
                "Use this option to generate a new recovery phrase as your Polkadot Vault Verifier Certificate Mnemonic. Choose this option if you are not sure what to do."
              )}
            >
              <Button
                className="secondary text-sm"
                onClick={async () => {
                  const mnemonicResult = await generateMnemonic()
                  if (!mnemonicResult) return
                  const { mnemonic, confirmed } = mnemonicResult
                  dispatch({
                    method: "setVerifierCertType",
                    verifierCertificateType: "new",
                    verifierCertificateMnemonic: mnemonic,
                    mnemonicConfirmed: confirmed,
                  })
                }}
              >
                {t("Generate a new mnemonic")}
              </Button>
            </VerifierCertificateOption>
          )}
          <VerifierCertificateOption
            text={t(
              "Import a new recovery phrase to use as your Polkadot Vault Verifier Certificate Mnemonic. You should use this option if you already have a Polkadot Vault account in another instance of Talisman, or you want to use a different mnemonic to your existing Talisman mnemonic."
            )}
          >
            <Button
              className="secondary text-sm"
              onClick={() =>
                dispatch({ method: "setVerifierCertType", verifierCertificateType: "import" })
              }
            >
              {t("Import a mnemonic")}
            </Button>
          </VerifierCertificateOption>
          <VerifierCertificateOption
            text={t(
              "If you don't want to use a Verifier Certificate Mnemonic, you can still use your Polkadot Vault account by leveraging the Parity and Nova Wallet metadata sources, but only on limited chains."
            )}
          >
            <Button
              className="secondary text-sm"
              onClick={() =>
                dispatch({ method: "setVerifierCertType", verifierCertificateType: null })
              }
            >
              {t("Don't use a Verifier Certificate Mnemonic")}
            </Button>
          </VerifierCertificateOption>
          <Button
            type="button"
            fullWidth
            primary
            onClick={() => submit()}
            disabled={!canSubmit}
            processing={state.submitting}
          >
            {t("Import")}
          </Button>
        </div>
      )}
      {state.verifierCertificateConfig?.verifierCertificateType === "import" && (
        <MnemonicForm
          onSubmit={async (data) => {
            await submit(data.mnemonic)
          }}
          onCancel={() =>
            dispatch({ method: "setVerifierCertType", verifierCertificateType: undefined })
          }
        />
      )}
    </div>
  )
}

export const ConfigureVerifierCertificateMnemonic = () => (
  <MnemonicCreateModalProvider>
    <MnemonicCreateModal />
    <ConfigureVerifierCertificateMnemonicForm />
  </MnemonicCreateModalProvider>
)
