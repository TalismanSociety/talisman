import { XCircleIcon } from "@talismn/icons"
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
    if (message) setContent(message)
  }, [message])

  return (
    <Drawer
      anchor="bottom"
      isOpen={!!content && message === content}
      containerId={containerId}
      onDismiss={onDismiss}
    >
      <div className="bg-grey-800 flex w-full flex-col items-center gap-4 rounded-t-xl p-12">
        <XCircleIcon className={"text-alert-error text-[3rem]"} />
        <p className="text-body-secondary mt-4">{wrapStrong(content)}</p>
        <Button className="mt-8 w-full" primary onClick={onDismiss}>
          {t("Close")}
        </Button>
      </div>
    </Drawer>
  )
}

const wrapStrong = (text?: string) => {
  if (!text) return text

  const splitter = new RegExp("(<strong>[^<]*?</strong>)", "g")
  const extractor = new RegExp("^<strong>([^<]*?)</strong>$", "g")

  return text.split(splitter).map((str, i) => {
    const match = extractor.exec(str)
    return match ? (
      <strong key={i} className="text-body p-0 font-bold capitalize">
        {match[1]}
      </strong>
    ) : (
      <span key={i}>{str}</span>
    )
  })
}
