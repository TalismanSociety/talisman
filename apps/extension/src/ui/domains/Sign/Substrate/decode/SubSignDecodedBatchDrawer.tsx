import { ChevronLeftIcon, ChevronRightIcon } from "@talismn/icons"
import { SignerPayloadJSON } from "extension-core"
import { FC } from "react"
import { useTranslation } from "react-i18next"
import { Button, Drawer } from "talisman-ui"

import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { ScaleApi } from "@ui/util/scaleApi"

import { useSubSignDecodedBatchDrawer } from "./SubSignDecodedBatchDrawerContext"
import { SubSignDecodedCallContent } from "./SubSignDecodedCallContent"

export const SubSignDecodedBatchDrawer: FC<{ sapi: ScaleApi; payload: SignerPayloadJSON }> = ({
  sapi,
  payload,
}) => {
  const { t } = useTranslation()
  const {
    isOpen,
    currentCall,
    canGoNext,
    canGoPrev,
    goNext,
    goPrev,
    close,
    currentIndex,
    batchItemsCount,
  } = useSubSignDecodedBatchDrawer()

  return (
    <Drawer
      anchor="right"
      isOpen={isOpen && !!currentCall}
      containerId="main"
      onDismiss={close}
      className="bg-black-primary text-body-secondary flex h-full w-full flex-col"
    >
      <div className="flex w-full items-center gap-4 p-8 px-12">
        <div className="text-body grow truncate tabular-nums">
          {t("Batch item {{currentIndex}} of {{batchItemsCount}}", {
            currentIndex: currentIndex + 1,
            batchItemsCount,
          })}
        </div>
        <button
          type="button"
          disabled={!canGoPrev}
          onClick={goPrev}
          className="bg-grey-800 enabled:hover:bg-grey-700 rounded-xs p-2 px-4 disabled:opacity-50"
        >
          <ChevronLeftIcon />
        </button>
        <button
          type="button"
          disabled={!canGoNext}
          onClick={goNext}
          className="bg-grey-800 enabled:hover:bg-grey-700 rounded-xs p-2 px-4 disabled:opacity-50"
        >
          <ChevronRightIcon />
        </button>
      </div>
      <ScrollContainer className="grow px-12">
        {!!currentCall && (
          <SubSignDecodedCallContent decodedCall={currentCall} sapi={sapi} payload={payload} />
        )}
      </ScrollContainer>
      <div className="px-12 pb-10 pt-8">
        <Button fullWidth onClick={close}>
          {t("Close")}
        </Button>
      </div>
    </Drawer>
  )
}
