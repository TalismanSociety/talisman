import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { notify } from "@talisman/components/Notifications"
import { Spacer } from "@talisman/components/Spacer"
import { ArrowRightIcon } from "@talismn/icons"
import { signet } from "@ui/util/signet"
import { FC, ReactNode, useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { Button, FormFieldContainer, FormFieldInputText } from "talisman-ui"

import { useSignetConnect } from "./context"
import { SignetVault } from "./types"

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
  const { signetUrl, setSignetUrl, setVaults } = useSignetConnect()
  const { t } = useTranslation("admin")
  const [isConnecting, setIsConnecting] = useState(false)

  const handleContinue = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setIsConnecting(true)
      try {
        // handle connect
        const res = (await signet.getVaults(signetUrl)) as SignetVault[]
        if (res && res.length > 0) {
          setVaults(res)
          navigate("accounts")
        } else {
          notify({ type: "error", title: t("Connection failed"), subtitle: "No vault selected" })
        }
      } catch (err) {
        notify({ type: "error", title: t("Connection failed"), subtitle: (err as Error).message })

        // eslint-disable-next-line no-console
        console.error("Failed to connect to Signet", { err })
      } finally {
        setIsConnecting(false)
      }
    },
    [navigate, setVaults, signetUrl, t]
  )

  const isSignetUrlValid = useMemo(() => {
    try {
      new URL(signetUrl)
      return true
    } catch {
      return false
    }
  }, [signetUrl])

  // clear vaults on mount, only to clean up vaults when user clicks "Back" on confirmation page
  useEffect(() => {
    setVaults([])
    return () => setIsConnecting(false)
  }, [setVaults])

  return (
    <>
      <HeaderBlock
        title={t("Import Signet Vault (Multisig wallet)")}
        text={t(
          "Enter Signet's URL where you have your Signet Vaults setup. You may use a different URL if you are using a self-hosted version of Signet."
        )}
      />
      <Spacer large />

      <form onSubmit={handleContinue}>
        <Step step={1} title={t("Enter Signet URL where you have your Signet Vaults setup.")}>
          <FormFieldContainer className="mt-8" label={t("Signet URL")}>
            <FormFieldInputText
              disabled={isConnecting}
              placeholder={t("https://signet.talisman.xyz")}
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
            disabled={!isSignetUrlValid}
          >
            {t("Connect")}
          </Button>
        </Step>
      </form>
    </>
  )
}