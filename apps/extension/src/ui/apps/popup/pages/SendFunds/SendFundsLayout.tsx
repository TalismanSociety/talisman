import { ChevronLeftIcon } from "@talismn/icons"
import { type FC, type ReactNode, useCallback } from "react"
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

  const showBackButton = withBackLink && window.history.length > 1

  return (
    <div id="main" className="relative flex h-full w-full flex-col">
      <div className="flex h-32 min-h-32 w-full items-center px-12 text-body-secondary">
        {showBackButton ? (
          <button
            type="button"
            className="flex cursor-pointer items-center text-body-secondary text-lg hover:text-white"
            onClick={handleBackClick}
          >
            <ChevronLeftIcon />
          </button>
        ) : (
          <div className="w-12">&nbsp;</div>
        )}
        <div className="grow text-center">{title}</div>
        <div className="w-12">&nbsp;</div>
      </div>
      <div className="w-full grow overflow-hidden">{children}</div>
    </div>
  )
}
