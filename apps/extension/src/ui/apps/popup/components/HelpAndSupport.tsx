import { DISCORD_TALISMAN_URL, SUPPORT_EMAIL_URL } from "@common/constants"
import { ChevronLeftIcon, DiscordIcon, LockIcon, MailIcon } from "@talismn/icons"
import { Button } from "@ui/components/Button"
import { IconButton } from "@ui/components/IconButton"
import { useTranslation } from "react-i18next"

import { PopupContent, PopupFooter } from "../Layout/PopupLayout"

const openDiscord = () => window.open(DISCORD_TALISMAN_URL, "_blank")
const openSupportEmail = () => window.open(SUPPORT_EMAIL_URL, "_blank")

export const HelpAndSupport = ({ onBack }: { onBack: () => void }) => {
  const { t } = useTranslation()

  return (
    <div className="flex size-full flex-col bg-black">
      <header className="relative flex h-32 shrink-0 items-center justify-center px-12">
        <IconButton className="absolute left-12" onClick={onBack} aria-label={t("Back")}>
          <ChevronLeftIcon />
        </IconButton>
        <h1 className="font-bold text-base text-white">{t("Help & Support")}</h1>
      </header>
      <PopupContent>
        <div className="flex h-full flex-col items-center justify-center gap-8 text-center">
          <LockIcon className="text-[3rem] text-primary-500" />
          <h2 className="mt-8 font-bold text-white text-xl">{t("Need help?")}</h2>
          <div className="text-body-secondary">
            <p>{t("Talisman does not store your password.")}</p>
            <p>{t("Never share your keys.")}</p>
            <p>{t("Try again or contact support.")}</p>
          </div>
        </div>
      </PopupContent>
      <PopupFooter className="grid grid-cols-2 gap-8">
        <Button iconLeft={DiscordIcon} onClick={openDiscord}>
          {t("Discord")}
        </Button>
        <Button primary iconLeft={MailIcon} onClick={openSupportEmail}>
          {t("Email")}
        </Button>
      </PopupFooter>
    </div>
  )
}
