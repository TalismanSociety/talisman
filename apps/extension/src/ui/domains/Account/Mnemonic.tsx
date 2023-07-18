import { notify } from "@talisman/components/Notifications"
import { CopyIcon } from "@talisman/theme/icons"
import { classNames } from "@talismn/util"
import { MouseEventHandler, useCallback, useState } from "react"
import { useTranslation } from "react-i18next"

type MnemonicProps = {
  onMouseEnter?: MouseEventHandler
  mnemonic: string
}

export const Mnemonic = ({ onMouseEnter, mnemonic }: MnemonicProps) => {
  const { t } = useTranslation()
  const [hasHovered, setHasHovered] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await window.navigator.clipboard.writeText(mnemonic)
      notify({
        title: t("Copied to clipboard"),
        type: "success",
      })
    } catch (err) {
      notify({
        title: t("Failed to copy"),
        type: "error",
      })
    }
  }, [mnemonic, t])

  return (
    <>
      <div className="py-4 text-sm">
        <button
          type="button"
          onClick={handleCopy}
          className={classNames(hasHovered ? "text-white" : "text-black", "cursor-pointer")}
        >
          <CopyIcon className="mr-2 inline" /> <span>{t("Copy to clipboard")}</span>
        </button>
      </div>

      <div
        className="bg-black-secondary group relative h-72 overflow-hidden rounded p-2"
        onMouseEnter={(e) => {
          setHasHovered(true)
          onMouseEnter && onMouseEnter(e)
        }}
      >
        <div className="inline-flex flex-wrap">
          {mnemonic.split(" ").map((word, i) => (
            <span
              className="bg-black-tertiary text-body-secondary mx-2 my-2 inline rounded-sm px-4 py-3"
              key={`mnemonic-${i}`}
            >
              {word}
            </span>
          ))}
          <div className="absolute left-0 top-0 flex h-full w-full items-center justify-center backdrop-blur-md group-hover:hidden">
            <div className="text-xl opacity-60 saturate-0">☝</div>
          </div>
        </div>
      </div>
    </>
  )
}
