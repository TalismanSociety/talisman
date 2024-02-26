import { wordlist } from "@scure/bip39/wordlists/english"
import { ChevronLeftIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { FC, useCallback, useMemo, useState } from "react"
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
      "bg-black-tertiary whitespace-nowrap rounded-xl px-6 py-3",
      error
        ? "text-brand-orange border-brand-orange border border-dashed"
        : active || word
        ? "text-body border-body border border-solid"
        : "text-body-secondary border-body-secondary border border-dashed"
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
      "bg-black-tertiary text-body enabled:hover:bg-grey-700 rounded-xl px-8 py-3 disabled:text-opacity-20"
    )}
  >
    <span className="notranslate">{word}</span>
  </button>
)

type VerifyProps = {
  mnemonic: string
  handleComplete: () => void
  handleBack: () => void
}

export const Verify: FC<VerifyProps> = ({ handleComplete, handleBack, mnemonic }) => {
  const { t } = useTranslation("admin")
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

  if (!mnemonic) return <>No Mnemonic Available</>

  return (
    <div>
      <div className="flex flex-col gap-12">
        <div className="flex flex-col gap-8">
          <span className="text-body-secondary text-xs">
            {t("Confirm your recovery phrase by selecting the words below.")}
          </span>
          <div className="bg-black-secondary group relative overflow-hidden rounded p-2">
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
        <div className="flex flex-col gap-4">
          <Button
            primary
            onClick={handleComplete}
            disabled={mnemonicWords && matchedDisplayIdx.length < mnemonicWords.length}
            tabIndex={0}
          >
            {t("Complete Verification")}
          </Button>
          <button
            className="text-body-secondary hover:text-grey-300 flex cursor-pointer items-center gap-4 text-sm"
            onClick={handleBack}
            type="button"
          >
            <ChevronLeftIcon /> <span>{t("Back")}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
