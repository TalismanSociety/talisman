import { XIcon } from "@talismn/icons"
import { FC } from "react"
import { useTranslation } from "react-i18next"
import { Button, IconButton, Modal } from "talisman-ui"

import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { DecodedCall, ScaleApi } from "@ui/util/scaleApi"

import { SubSignDecodedCallContent } from "./SubSignDecodedCallContent"

export const SubSignDecodedCallModal: FC<{
  sapi: ScaleApi
  decodedCall: DecodedCall
  isOpen: boolean
  onClose: () => void
}> = ({ sapi, decodedCall, isOpen, onClose }) => {
  const { t } = useTranslation()

  return (
    <Modal
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
        {!!decodedCall && <SubSignDecodedCallContent decodedCall={decodedCall} sapi={sapi} />}
      </ScrollContainer>
      <div className="px-12 pb-10 pt-8">
        <Button fullWidth onClick={onClose}>
          {t("Close")}
        </Button>
      </div>
    </Modal>
  )
}
