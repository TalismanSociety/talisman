import { XIcon } from "@talismn/icons"
import { SignerPayloadJSON } from "extension-core"
import { FC } from "react"
import { useTranslation } from "react-i18next"
import { Button, Drawer, IconButton } from "talisman-ui"

import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { DecodedCall, ScaleApi } from "@ui/util/scaleApi"

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
      className="bg-black-primary text-body-secondary flex h-full w-full flex-col"
    >
      <div className="flex w-full items-center gap-4 px-12 py-8">
        <div className="text-body grow truncate tabular-nums">{t("Request content")}</div>
        <IconButton onClick={onClose}>
          <XIcon />
        </IconButton>
      </div>
      <ScrollContainer className="grow px-12">
        {!!decodedCall && (
          <SubSignDecodedCallContent decodedCall={decodedCall} sapi={sapi} payload={payload} />
        )}
      </ScrollContainer>
      <div className="px-12 pb-10 pt-8">
        <Button fullWidth onClick={onClose}>
          {t("Close")}
        </Button>
      </div>
    </Drawer>
  )
}
