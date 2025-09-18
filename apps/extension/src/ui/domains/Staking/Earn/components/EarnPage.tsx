import { ChevronLeftIcon } from "@talismn/icons"
import { FC, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate, useSearchParams } from "react-router-dom"
import { IconButton } from "talisman-ui"

import { EarnModalBody } from "../EarnModalBody"
import { useEarnModal } from "../hooks/useEarnModal"

export const EarnPage: FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { close } = useEarnModal()

  // Get tokenId from URL search params
  const tokenId = searchParams.get("tokenId") || ""

  const handleBack = useCallback(() => {
    navigate(-1)
  }, [navigate])

  const handleClose = useCallback(() => {
    close()
    navigate(-1)
  }, [close, navigate])

  return (
    <div className="flex size-full flex-grow flex-col bg-black">
      <header className="flex items-center justify-between p-10">
        <IconButton onClick={handleBack}>
          <ChevronLeftIcon />
        </IconButton>
        <div>{t("Earn")}</div>
        <IconButton onClick={handleClose} className="invisible">
          <ChevronLeftIcon />
        </IconButton>
      </header>
      <div className="flex grow flex-col overflow-hidden px-10 pb-10">
        <EarnModalBody tokenId={tokenId} />
      </div>
    </div>
  )
}
