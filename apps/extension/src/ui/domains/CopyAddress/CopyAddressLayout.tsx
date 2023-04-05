import { IconButton } from "@talisman/components/IconButton"
import { XIcon } from "@talisman/theme/icons"
import { FC, PropsWithChildren } from "react"

import { useCopyAddressModal } from "./useCopyAddressModal"

type CopyAddressLayoutProps = PropsWithChildren & {
  title: string
}

export const CopyAddressLayout: FC<CopyAddressLayoutProps> = ({ title, children }) => {
  const { close } = useCopyAddressModal()

  return (
    <div className="flex h-[60rem] w-[40rem] flex-col bg-black">
      <div className="flex w-full items-center p-12">
        <div></div>
        <div className="text-body-secondary grow text-center">{title}</div>
        <div>
          <IconButton onClick={close}>
            <XIcon />
          </IconButton>
        </div>
      </div>
      <div className="grow">{children}</div>
    </div>
  )
}
