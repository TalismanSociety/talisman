import { SIGNET_APP_URL, SIGNET_LANDING_URL } from "@extension/shared"
import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { notify } from "@talisman/components/Notifications"
import { Spacer } from "@talisman/components/Spacer"
import { ArrowRightIcon } from "@talismn/icons"
import { signet } from "@ui/util/signet"
import { FC, ReactNode, useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useNavigate } from "react-router-dom"
import { Button, FormFieldContainer, FormFieldInputText } from "talisman-ui"

import { useSignetConnect } from "./context"

const Step: FC<{ step: ReactNode; title: ReactNode; children: ReactNode }> = ({
  step,
  title,
  children,
}) => (
  <div className="text-body-secondary leading-paragraph">
    <div className="flex w-full">
      <div className="w-20 shrink-0 text-center ">{step}</div>
      <div className="text-body grow">{title}</div>
    </div>
    <div className="mt-2 pl-20 text-sm">{children}</div>
  </div>
)

export const ConnectSignetPage = () => {
  const navigate = useNavigate()
  const { signetUrl, signetUrlOrigin, setSignetUrl, setVaults } = useSignetConnect()
  const { t } = useTranslation("admin")
  const [isConnecting, setIsConnecting] = useState(false)

  const handleContinue = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setIsConnecting(true)
      try {
        // handle connect
        const res = await signet.getVaults(signetUrlOrigin)
        if (res && res.length > 0) {
          setVaults(res)
          navigate("accounts")
        } else {
          notify({ type: "error", title: t("Connection failed"), subtitle: "No vault selected" })
        }
      } catch (err) {
        notify({
          type: "error",
          title: t("Connection failed"),
          subtitle:
            err instanceof Error
              ? err.message
              : typeof err === "string"
              ? err
              : "Please try again.",
        })

        // eslint-disable-next-line no-console
        console.error("Failed to connect to Signet", { err })
      } finally {
        setIsConnecting(false)
      }
    },
    [navigate, setVaults, signetUrlOrigin, t]
  )

  // clean up vaults when user clicks "Back" on confirmation page
  useEffect(() => {
    setVaults([])
  }, [setVaults])

  return (
    <>
      <HeaderBlock
        title={t("Import Signet Vault (Multisig wallet)")}
        text={
          <>
            {t(
              "Signet is the Enterprise & Institutional solution from Talisman, once you have set-up a vault in Signet you can connect below. Find out more at "
            )}
            <Link to={SIGNET_LANDING_URL} target="_blank" className="text-primary-500">
              {SIGNET_LANDING_URL}
            </Link>
          </>
        }
      />
      <Spacer large />

      <form onSubmit={handleContinue}>
        <Step step={1} title={t("Enter Signet URL where you have your Signet Vaults setup.")}>
          <FormFieldContainer className="mt-8" label={t("Signet URL")}>
            <FormFieldInputText
              disabled={isConnecting}
              placeholder={SIGNET_APP_URL}
              onChange={(e) => setSignetUrl(e.target.value)}
              value={signetUrl}
            />
          </FormFieldContainer>
        </Step>
        <Spacer large />
        <Step step={2} title={t("Connect and select Vaults to import.")}>
          <Button
            className="mt-8"
            primary
            icon={ArrowRightIcon}
            onClick={handleContinue}
            processing={isConnecting}
            disabled={signetUrlOrigin === ""}
          >
            {t("Connect")}
          </Button>
        </Step>
      </form>
    </>
  )
}
