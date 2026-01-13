import { CheckIcon, CopyIcon } from "@talismn/icons"
import { cn } from "@talismn/util"
import { type FC, useCallback, useState } from "react"
import { useTranslation } from "react-i18next"

export const CopyToClipboardLinkButton: FC<{ data: string; className?: string }> = ({
  data,
  className,
}) => {
  const { t } = useTranslation()
  const [isCopied, setIsCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(data).then(() => {
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    })
  }, [data])

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn("inline-flex items-center text-body-secondary hover:text-body", className)}
    >
      {isCopied ? (
        <>
          <CheckIcon className="mr-2 inline text-primary" />
          <span className="text-primary">{t("Copied successfully")}</span>
        </>
      ) : (
        <>
          <CopyIcon className="mr-2 inline" />
          <span>{t("Copy to clipboard")}</span>
        </>
      )}
    </button>
  )
}
