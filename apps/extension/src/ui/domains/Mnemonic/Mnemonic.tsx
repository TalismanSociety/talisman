import { notify } from "@talisman/components/Notifications"
import { CheckIcon, CopyIcon, EyeIcon, EyeOffIcon } from "@talismn/icons"
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
  const [isCopied, setIsCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await window.navigator.clipboard.writeText(mnemonic)
      setIsCopied(true)
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

  useEffect(() => {
    if (!isCopied) return () => {}

    const timeout = setTimeout(() => {
      setIsCopied(false)
    }, 3000)

    return () => {
      clearTimeout(timeout)
    }
  }, [isCopied])

  return (
    <div>
      {topRight && <div className="flex items-center justify-end py-4 text-sm">{topRight}</div>}
      <div className="bg-black-secondary group relative overflow-hidden rounded p-2">
        <div className="grid min-h-[12.6rem] grid-cols-4 gap-4 p-2">
          {!!mnemonic &&
            mnemonic.split(" ").map((word, i) => (
              <span className="bg-black-tertiary text-body rounded px-8 py-4" key={`mnemonic-${i}`}>
                <span className="text-grey-500 select-none">{i + 1}. </span>
                <span className="notranslate">{word}</span>
              </span>
            ))}
          <button
            type="button"
            onClick={() => setIsRevealed((isRevealed) => !isRevealed)}
            className={classNames(
              "text-body absolute left-0 top-0 flex h-full w-full items-center justify-center rounded-sm transition",
              !isRevealed && "backdrop-blur-md"
            )}
          >
            {!isRevealed && <EyeIcon className="text-xl" />}
            {isRevealed && <EyeOffIcon className="text-xl" />}
          </button>
        </div>
      </div>
      <div className="flex items-center py-4 text-sm">
        <button
          type="button"
          onClick={handleCopy}
          className={"text-body-secondary hover:text-body flex items-center"}
        >
          {isCopied ? (
            <>
              <CheckIcon className="text-primary mr-2 inline" />
              <span className="text-primary">{t("Copied")}</span>
            </>
          ) : (
            <>
              <CopyIcon className="mr-2 inline" />
              <span>{t("Copy to clipboard")}</span>
            </>
          )}
        </button>
        {topRight}
      </div>
    </div>
  )
}
