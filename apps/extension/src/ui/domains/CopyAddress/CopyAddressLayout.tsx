import { XIcon } from "@talismn/icons"
import { FC, PropsWithChildren } from "react"
import { IconButton } from "talisman-ui"

import { useCopyAddressModal } from "./useCopyAddressModal"

type CopyAddressLayoutProps = PropsWithChildren & {
  title: string
}

export const CopyAddressLayout: FC<CopyAddressLayoutProps> = ({ title, children }) => {
  const { close } = useCopyAddressModal()

  return (
    <div id="copy-address-modal" className="flex h-full w-full flex-col overflow-hidden bg-black">
      <div className="flex h-32 w-full shrink-0 items-center px-12">
        <div className="w-12"></div>
        <div className="text-body-secondary grow text-center">{title}</div>
        <IconButton onClick={close}>
          <XIcon />
        </IconButton>
      </div>
      <div className="grow overflow-hidden">{children}</div>
    </div>
  )
}
