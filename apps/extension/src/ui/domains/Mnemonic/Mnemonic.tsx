import { CheckIcon, CopyIcon, EyeIcon, EyeOffIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { notify } from "@ui/components/Notifications"
import { type FC, useCallback, useEffect, useState } from "react"
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
    } catch {
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
    <div className="min-w-[36.25rem]">
      <div className="group relative overflow-hidden rounded bg-black-secondary p-2">
        <div className={`grid min-h-[7.875rem] grid-cols-4 gap-4 p-2`}>
          {!!mnemonic &&
            mnemonic.split(" ").map((word, i) => (
              <span
                className="whitespace-nowrap rounded bg-black-tertiary px-8 py-4 text-body"
                // biome-ignore lint/suspicious/noArrayIndexKey: legacy
                key={`mnemonic-${i}`}
              >
                <span className="select-none text-grey-500">{i + 1}. </span>
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
              "absolute top-0 left-0 flex h-full w-full items-center justify-center rounded-sm text-body transition",
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
          className={"flex items-center text-body-secondary hover:text-body"}
        >
          {isCopied ? (
            <>
              <CheckIcon className="mr-2 inline text-primary" />
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
