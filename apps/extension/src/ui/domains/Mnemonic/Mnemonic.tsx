import { notify } from "@talisman/components/Notifications"
import { CopyIcon, CursorClickIcon } from "@talisman/theme/icons"
import { classNames } from "@talismn/util"
import { FC, ReactNode, useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

type MnemonicProps = {
  topRight?: ReactNode
  onReveal?: () => void
  mnemonic: string
}

export const Mnemonic: FC<MnemonicProps> = ({ onReveal, mnemonic, topRight }) => {
  const { t } = useTranslation()
  const [isRevealed, setIsRevealed] = useState(false)

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

  useEffect(() => {
    if (isRevealed) onReveal?.()
  }, [isRevealed, onReveal])

  return (
    <>
      <div className="flex items-center justify-between py-4 text-sm">
        <button
          type="button"
          onClick={handleCopy}
          className={"text-body-secondary hover:text-body"}
        >
          <CopyIcon className="mr-2 inline" /> <span>{t("Copy to clipboard")}</span>
        </button>
        {topRight}
      </div>
      <div className="bg-black-secondary group relative overflow-hidden rounded p-2">
        <div className="grid min-h-[12.6rem] grid-cols-4 gap-4 p-2">
          {!!mnemonic &&
            mnemonic.split(" ").map((word, i) => (
              <span className="bg-black-tertiary text-body rounded px-8 py-4" key={`mnemonic-${i}`}>
                <span className="text-body-disabled select-none">{i + 1}. </span>
                <span>{word}</span>
              </span>
            ))}
          <button
            type="button"
            onClick={() => setIsRevealed(true)}
            className={classNames(
              "text-body absolute left-0 top-0 flex h-full w-full items-center justify-center rounded-sm backdrop-blur-md transition",
              isRevealed && "opacity-0"
            )}
          >
            <CursorClickIcon className="text-xl" />
          </button>
        </div>
      </div>
    </>
  )
}
