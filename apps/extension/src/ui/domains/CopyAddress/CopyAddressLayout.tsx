import { ChevronLeftIcon, XIcon } from "@talismn/icons"
import { IconButton } from "@ui/components/IconButton"
import type { FC, PropsWithChildren } from "react"
import { useTranslation } from "react-i18next"

import { useCopyAddressModal } from "./useCopyAddressModal"

type CopyAddressLayoutProps = PropsWithChildren & {
  title: string
  onBack?: () => void
}

export const CopyAddressLayout: FC<CopyAddressLayoutProps> = ({ title, onBack, children }) => {
  const { t } = useTranslation()
  const { close } = useCopyAddressModal()

  return (
    <div
      id="copy-address-modal"
      className="relative flex h-full w-full flex-col overflow-hidden bg-black"
    >
      <div className="flex h-32 w-full shrink-0 items-center px-12">
        {onBack ? (
          <IconButton aria-label={t("Back")} onClick={onBack}>
            <ChevronLeftIcon />
          </IconButton>
        ) : (
          <div className="w-12"></div>
        )}
        <div className="grow text-center text-body-secondary">{title}</div>
        <IconButton onClick={close}>
          <XIcon />
        </IconButton>
      </div>
      <div className="grow overflow-hidden">{children}</div>
    </div>
  )
}
