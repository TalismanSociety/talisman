import { IconButton } from "@talisman/components/IconButton"
import { ChevronLeftIcon } from "@talisman/theme/icons"
import { FC, ReactNode, useCallback } from "react"
import { useNavigate } from "react-router-dom"

type SendFundsLayoutProps = {
  title?: ReactNode
  withBackLink?: boolean
  children?: ReactNode
}

export const SendFundsLayout: FC<SendFundsLayoutProps> = ({ title, children, withBackLink }) => {
  const navigate = useNavigate()

  const handleBackClick = useCallback(() => {
    navigate(-1)
  }, [navigate])

  return (
    <div id="send-funds-main" className="relative flex h-full w-full flex-col">
      <div className="flex h-32 min-h-[6.4rem] w-full items-center px-12">
        <div className="w-12">
          {withBackLink && window.history.length > 1 && (
            <IconButton className="text-lg" onClick={handleBackClick}>
              <ChevronLeftIcon />
            </IconButton>
          )}
        </div>
        <div className="text-body-secondary grow text-center">{title}</div>
        <div className="w-12"></div>
      </div>
      <div className="w-full grow overflow-hidden">{children}</div>
    </div>
  )
}
