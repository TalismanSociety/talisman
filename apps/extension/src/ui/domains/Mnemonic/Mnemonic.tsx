import { notify } from "@talisman/components/Notifications"
import { CheckIcon, CopyIcon, EyeIcon, EyeOffIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { FC, useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

/**
 * Props for the Mnemonic component
 */
type MnemonicProps = {
  /**
   * A function that is called when the mnemonic is revealed. Optional.
   */
  onReveal?: () => void
  /**
   * The mnemonic to be displayed.
   */
  mnemonic: string
}

type EyeIconTypes = "open" | "closed" | null

export const Mnemonic: FC<MnemonicProps> = ({ onReveal, mnemonic }) => {
  const { t } = useTranslation()
  const [isRevealed, setIsRevealed] = useState(false)
  const [blurOnHover, setBlurOnHover] = useState(false)
  const [iconType, setIconType] = useState<EyeIconTypes>("closed")

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
    <div className="min-w-[58rem]">
      <div className="bg-black-secondary group relative overflow-hidden rounded p-2">
        <div className={`grid min-h-[12.6rem] grid-cols-4 gap-4 p-2`}>
          {!!mnemonic &&
            mnemonic.split(" ").map((word, i) => (
              <span
                className="bg-black-tertiary text-body whitespace-nowrap rounded px-8 py-4"
                key={`mnemonic-${i}`}
              >
                <span className="text-grey-500 select-none">{i + 1}. </span>
                <span className="notranslate">{word}</span>
              </span>
            ))}
          <button
            type="button"
            onClick={() => {
              setIsRevealed((isRevealed) => !isRevealed)
              setBlurOnHover(isRevealed)
              setIconType(isRevealed ? "open" : null)
            }}
            className={classNames(
              "text-body absolute left-0 top-0 flex h-full w-full items-center justify-center rounded-sm transition",
              !isRevealed && "backdrop-blur-md",
              blurOnHover && isRevealed && "hover:backdrop-blur-md"
            )}
            onMouseLeave={() => {
              if (isRevealed) {
                setBlurOnHover(true)
                setIconType(null)
              }
            }}
            onMouseOver={() => isRevealed && setIconType("closed")}
            onFocus={() => isRevealed && setIconType("closed")}
          >
            {iconType === "open" && <EyeIcon className="text-xl" />}
            {iconType === "closed" && <EyeOffIcon className="text-xl" />}
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
      </div>
    </div>
  )
}
