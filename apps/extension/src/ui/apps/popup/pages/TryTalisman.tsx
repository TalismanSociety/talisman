import { ChevronLeftIcon } from "@talismn/icons"
import { IconButton } from "@ui/components/IconButton"
import { TryTalismanContent } from "@ui/domains/Portfolio/GetStarted/TryTalisman/TryTalismanContent"
import { useCallback } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { PopupContent, PopupLayout } from "../Layout/PopupLayout"

const Header = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const goToPortfolio = useCallback(() => {
    return navigate("/portfolio")
  }, [navigate])

  return (
    <header className="my-8 flex h-[2.25rem] w-full shrink-0 items-center justify-between gap-4 px-8">
      <div className="flex-1">
        <IconButton onClick={goToPortfolio}>
          <ChevronLeftIcon />
        </IconButton>
      </div>
      <div className="font-bold">
        <Trans t={t}>
          Try <span className="text-primary">Talisman</span>
        </Trans>
      </div>
      <div className="flex-1 text-right">
        <span />
      </div>
    </header>
  )
}

export const TryTalismanPage = () => (
  <PopupLayout>
    <Header />
    <PopupContent className="px-8">
      <TryTalismanContent />
    </PopupContent>
  </PopupLayout>
)
