import { AlertCircleIcon } from "@talismn/icons"
import { FC, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button, Drawer } from "talisman-ui"

export const ErrorMessageDrawer: FC<{
  message: string | undefined
  containerId: string | undefined
  onDismiss: () => void
}> = ({ message, containerId, onDismiss }) => {
  const { t } = useTranslation()

  // keep message in memory to prevent flickering on slide out
  const [content, setContent] = useState<string>()

  useEffect(() => {
    setContent(message)
  }, [message])

  return (
    <Drawer
      anchor="bottom"
      isOpen={!!content && message === content}
      containerId={containerId}
      onDismiss={onDismiss}
    >
      <div className="bg-grey-800 text-alert-warn flex w-full flex-col items-center gap-4 rounded-t-xl p-12 text-sm">
        <AlertCircleIcon className={"text-[3rem]"} />
        <p className="mt-2">{content}</p>
        <Button className="mt-8 w-full" primary onClick={onDismiss}>
          {t("Dismiss")}
        </Button>
      </div>
    </Drawer>
  )
}
