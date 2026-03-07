import type { SignerPayloadJSON } from "@core"
import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { XIcon } from "@talismn/icons"
import type { DecodedCall, ScaleApi } from "@talismn/sapi"
import { Button, Drawer, IconButton } from "@ui/talisman-ui"
import type { FC } from "react"
import { useTranslation } from "react-i18next"

import { SubSignDecodedCallContent } from "./SubSignDecodedCallContent"

export const SubSignDecodedCallDrawer: FC<{
  sapi: ScaleApi
  decodedCall: DecodedCall
  payload: SignerPayloadJSON
  isOpen: boolean
  onClose: () => void
}> = ({ sapi, decodedCall, payload, isOpen, onClose }) => {
  const { t } = useTranslation()

  return (
    <Drawer
      anchor="right"
      isOpen={isOpen && !!decodedCall}
      containerId="main"
      onDismiss={onClose}
      className="flex h-full w-full flex-col bg-black-primary text-body-secondary"
    >
      <div className="flex w-full items-center gap-4 px-12 py-8">
        <div className="grow truncate text-body tabular-nums">{t("Request content")}</div>
        <IconButton onClick={onClose}>
          <XIcon />
        </IconButton>
      </div>
      <ScrollContainer className="grow px-12">
        {!!decodedCall && (
          <SubSignDecodedCallContent decodedCall={decodedCall} sapi={sapi} payload={payload} />
        )}
      </ScrollContainer>
      <div className="px-12 pt-8 pb-10">
        <Button fullWidth onClick={onClose}>
          {t("Close")}
        </Button>
      </div>
    </Drawer>
  )
}
