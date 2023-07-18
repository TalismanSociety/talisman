import { POLKADOT_VAULT_DOCS_URL } from "@core/constants"
import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { useHasMnemonic } from "@ui/hooks/useHasMnemonic"
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

export const ConfigureVerifierCertificateMnemonic = () => {
  const { t } = useTranslation("admin")
  const { dispatch, state, submit } = useAccountAddQr()
  const hasMnemonic = useHasMnemonic()

  const canSubmit = useMemo(() => {
    if (state.type !== "CONFIGURE_VERIFIER_CERT") return null
    const { verifierCertificateConfig } = state
    return (
      !state.submitting &&
      verifierCertificateConfig &&
      (verifierCertificateConfig.verifierCertificateType === "talisman" ||
        (verifierCertificateConfig.verifierCertificateType === "new" &&
          verifierCertificateConfig.verifierCertificateMnemonic) ||
        verifierCertificateConfig.verifierCertificateType === null)
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
        state.verifierCertificateConfig.verifierCertificateType !== "new") && (
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

          {hasMnemonic && (
            <VerifierCertificateOption
              text={t(
                "Use this option to use your existing Talisman recovery phrase as your Polkadot Vault Verifier Certificate Mnemonic. Choose this option if you are not sure what to do."
              )}
            >
              <Button
                className="secondary text-sm"
                onClick={() =>
                  dispatch({ method: "setVerifierCertType", verifierCertificateType: "talisman" })
                }
              >
                {t("Use my existing Talisman mnemonic")}
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
                dispatch({ method: "setVerifierCertType", verifierCertificateType: "new" })
              }
            >
              {t("Import a new mnemonic")}
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
      {state.verifierCertificateConfig?.verifierCertificateType === "new" && (
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
