import { classNames } from "@ui/util/cn"
import { type FC, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

type MessageProps = { text: string; className?: string; rows?: number }

export const Message: FC<MessageProps> = ({ text, rows, className }) => {
  const { t } = useTranslation()
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
          "scrollable scrollable-600 bg-grey-800 text-body-secondary",
          "rounded p-6 text-left font-mono",
          className
        )}
        value={value}
      />
      {canShowAll && (
        <div className="mt-4 flex w-full justify-between text-grey-500 text-xs">
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
