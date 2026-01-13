import { wordlist } from "@scure/bip39/wordlists/english"
import { ChevronLeftIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { type FC, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

const WordSlot = ({
  number,
  active = false,
  error = false,
  word = "",
}: {
  number: number
  active?: boolean
  error?: boolean
  word?: string
}) => (
  <span
    className={classNames(
      "whitespace-nowrap rounded-xl bg-black-tertiary px-6 py-3",
      error
        ? "border border-brand-orange border-dashed text-brand-orange"
        : active || word
          ? "border border-body border-solid text-body"
          : "border border-body-secondary border-dashed text-body-secondary"
    )}
  >
    <span className="select-none">{number}. </span>
    <span className="notranslate">{word}</span>
  </span>
)

const WordOption = ({
  selected = false,
  word,
  onClick,
}: {
  selected?: boolean
  word: string
  onClick: () => void
}) => (
  <button
    onClick={onClick}
    disabled={selected}
    className={classNames(
      "rounded-xl bg-black-tertiary px-8 py-3 text-body enabled:hover:bg-grey-700 disabled:text-opacity-20"
    )}
  >
    <span className="notranslate">{word}</span>
  </button>
)

type VerifyProps = {
  mnemonic: string
  onComplete: () => void
  onBack: () => void
  onSkip: () => void
}

export const Verify: FC<VerifyProps> = ({ onComplete, onBack, onSkip, mnemonic }) => {
  const { t } = useTranslation()
  const [matchedDisplayIdx, setMatchedDisplayIdx] = useState<number[]>([])
  const [selectedIndex, setSelectedIndex] = useState<number>()
  const mnemonicWords = useMemo(() => mnemonic?.split(" "), [mnemonic])
  const matchedLength = matchedDisplayIdx.length
  const [errorIndex, setErrorIndex] = useState<number>()

  const decoyWords = useMemo(() => {
    if (!mnemonicWords) return []
    const decoys = []
    while (decoys.length < 12) {
      const index = Math.floor(Math.random() * wordlist.length)
      if (!mnemonicWords.includes(wordlist[index])) decoys.push(wordlist[index])
    }
    return decoys
  }, [mnemonicWords])

  const displayWords = useMemo(() => {
    if (!mnemonicWords) return []
    return [...mnemonicWords, ...decoyWords].sort()
  }, [mnemonicWords, decoyWords])

  const isMatchedWord = useCallback(
    (i: number) => {
      return matchedDisplayIdx.includes(i)
    },
    [matchedDisplayIdx]
  )

  const handleSelectWord = useCallback(
    (displayIdx: number) => {
      if (!mnemonicWords) return
      setErrorIndex(undefined)
      setSelectedIndex(displayIdx)
      const word = displayWords[displayIdx]
      const nextWordToMatch = mnemonicWords[matchedLength]
      if (!isMatchedWord(displayIdx) && nextWordToMatch === word) {
        setMatchedDisplayIdx((prev) => [...prev, displayIdx])
      } else {
        setErrorIndex(matchedLength)
      }
    },
    [displayWords, matchedLength, mnemonicWords, isMatchedWord]
  )

  if (!mnemonic) return <>{t("No Mnemonic Available")}</>

  return (
    <div>
      <div className="flex flex-col gap-12">
        <div className="flex flex-col gap-8">
          <span className="text-body-secondary text-xs">
            {t("Confirm your recovery phrase by selecting the words below.")}
          </span>
          <div className="group relative overflow-hidden rounded bg-black-secondary p-2">
            <div
              className={`grid min-h-[12.6rem] grid-cols-4 ${
                mnemonicWords!.length > 12 && "lg:grid-cols-6"
              } gap-4 p-2`}
            >
              {!!mnemonicWords &&
                mnemonicWords.map((_, i) => (
                  <WordSlot
                    number={i + 1}
                    word={
                      i < matchedLength
                        ? mnemonicWords[i]
                        : i === errorIndex && selectedIndex !== undefined
                          ? displayWords[selectedIndex]
                          : ""
                    }
                    active={matchedLength === i}
                    error={errorIndex === i}
                    key={`mnemonic-${i}`}
                  />
                ))}
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-4 p-2">
            {!!displayWords &&
              displayWords.map((word, i) => (
                <WordOption
                  key={`decoyWords-${i}`}
                  onClick={() => handleSelectWord(i)}
                  word={word}
                  selected={isMatchedWord(i) || selectedIndex === i}
                />
              ))}
          </div>
        </div>
        <div className="flex flex-col gap-6">
          <Button
            primary
            onClick={onComplete}
            disabled={mnemonicWords && matchedDisplayIdx.length < mnemonicWords.length}
            tabIndex={0}
          >
            {t("Complete Verification")}
          </Button>
          <div className="flex w-full items-center justify-between gap-2">
            <div className="w-48">
              <button
                className="flex cursor-pointer items-center gap-2 text-body-secondary hover:text-grey-300"
                onClick={onBack}
                type="button"
              >
                <ChevronLeftIcon />
                <span>{t("Back")}</span>
              </button>
            </div>
            <div className="flex h-11 grow justify-center">
              <button
                className="cursor-pointer gap-5 self-center font-bold text-grey-300 hover:text-body"
                onClick={onSkip}
                type="button"
              >
                {t("Skip Verification")}
              </button>
            </div>
            <div className="w-48"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
