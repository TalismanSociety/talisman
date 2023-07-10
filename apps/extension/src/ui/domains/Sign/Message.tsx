import { classNames } from "@talismn/util"
import { FC, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

type MessageProps = { text: string; className?: string; rows?: number }

export const Message: FC<MessageProps> = ({ text, rows, className }) => {
  const { t } = useTranslation("request")
  const [showAll, setShowAll] = useState(false)
  const { value, canShowAll } = useMemo(() => {
    const shouldTruncate = text.length > 1000
    return {
      value: !shouldTruncate || showAll ? text : text.slice(0, 1000),
      canShowAll: shouldTruncate && !showAll,
    }
  }, [showAll, text])

  const handleShowAll = useCallback(() => {
    setShowAll(true)
  }, [])

  return (
    <>
      <textarea
        readOnly
        rows={rows}
        className={classNames(
          "text-body-secondary bg-grey-800 scrollable scrollable-600",
          "rounded p-6 text-left font-mono",
          className
        )}
        value={value}
      />
      {canShowAll && (
        <div className="text-grey-500 mt-4 flex w-full justify-between text-xs">
          <div>{t("Displaying first 1000 characters only")}</div>
          <div>
            <button type="button" className="hover:text-grey-400" onClick={handleShowAll}>
              {t("Show all")}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
