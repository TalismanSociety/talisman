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
        ? "text-brand-orange border-brand-orange border border-dotted"
        : active || word
        ? "text-body border-body border border-solid"
        : "text-body-secondary border-body-secondary border border-dotted"
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
  onClick: (word: string) => void
}) => (
  <button
    onClick={() => onClick(word)}
    className={classNames(
      "bg-black-tertiary text-body rounded-xl px-8 py-3",
      selected ? "text-opacity-20" : ""
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
  const [matchedWords, setMatchedWords] = useState<string[]>([])
  const [selectedWord, setSelectedWord] = useState<string>()
  const mnemonicWords = useMemo(() => mnemonic?.split(" "), [mnemonic])
  const activeIndex = matchedWords.length
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

  const handleSelectWord = useCallback(
    (word: string) => {
      if (!mnemonicWords) return
      setErrorIndex(undefined)
      setSelectedWord(word)
      if (mnemonicWords[activeIndex] === word) {
        setMatchedWords((prev) => [...prev, word])
      } else {
        setErrorIndex(activeIndex)
      }
    },
    [activeIndex, mnemonicWords]
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
                    word={errorIndex === i ? selectedWord : matchedWords[i]}
                    active={activeIndex === i}
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
                  onClick={handleSelectWord}
                  word={word}
                  selected={matchedWords.includes(word)}
                />
              ))}
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <Button
            primary
            onClick={handleComplete}
            disabled={mnemonicWords && matchedWords.length < mnemonicWords.length}
            tabIndex={0}
          >
            {t("Complete Verification")}
          </Button>
          <div
            className="text-body-secondary flex cursor-pointer items-center gap-4 text-sm"
            onClick={handleBack}
            onKeyDown={handleBack}
            role="button"
            tabIndex={0}
          >
            <ChevronLeftIcon /> <span>{t("Back")}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
