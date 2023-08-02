import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { notify } from "@talisman/components/Notifications"
import { Spacer } from "@talisman/components/Spacer"
import { ArrowRightIcon } from "@talisman/theme/icons"
import { DashboardLayout } from "@ui/apps/dashboard/layout/DashboardLayout"
import { dcentCall } from "@ui/util/dcent"
import DcentWebConnector from "dcent-web-connector"
import { FC, ReactNode, useCallback, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { Button } from "talisman-ui"

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

export const ConnectDcentBridgePage = () => {
  const { t } = useTranslation("admin")
  const navigate = useNavigate()
  const [isConnecting, setIsConnecting] = useState(false)

  const handleContinueClick = useCallback(async () => {
    setIsConnecting(true)
    try {
      await dcentCall(DcentWebConnector.getDeviceInfo)
      navigate("./accounts")
    } catch (err) {
      setIsConnecting(false)
      notify({ type: "error", title: t("Connection failed"), subtitle: (err as Error).message })

      // eslint-disable-next-line no-console
      console.error("Failed to connect to D'CENT bridge", { err })
    }
  }, [navigate, t])

  return (
    <DashboardLayout withBack centered>
      <HeaderBlock
        title={t("Connect D'CENT Biometric Wallet")}
        text={t(
          "Before proceeding with the connection between Talisman Wallet and D'CENT Biometric Wallet, please carefully read and follow the instructions below to ensure a smooth and secure experience."
        )}
      />
      <Spacer large />
      <Step step={1} title={t("Install D'CENT Bridge on your computer")}>
        <Trans
          t={t}
          components={{
            DownloadLink: (
              // eslint-disable-next-line jsx-a11y/anchor-has-content
              <a
                className="text-body underline"
                target="_blank"
                href="https://bridge.dcentwallet.com/v2/download"
              />
            ),
          }}
          defaults="The D'CENT bridge is essential for secure communication between your device and Talisman. <DownloadLink>Download D'CENT Bridge</DownloadLink>"
        />
      </Step>
      <Spacer large />
      <Step step={2} title={t("Connect and Unlock your D'CENT Biometric Wallet")}>
        {t(
          "Ensure that your D'CENT Biometric Wallet is properly plugged into a USB port on your computer. Before continuing, make sure that your device is unlocked.            "
        )}
      </Step>
      <Spacer large />
      <Spacer large />
      <div className="text-right">
        <Button
          primary
          icon={ArrowRightIcon}
          onClick={handleContinueClick}
          processing={isConnecting}
        >
          {t("Continue")}
        </Button>
      </div>
    </DashboardLayout>
  )
}
