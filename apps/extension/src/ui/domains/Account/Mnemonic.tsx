import { notify } from "@talisman/components/Notifications"
import { CopyIcon } from "@talisman/theme/icons"
import { classNames } from "@talismn/util"
import { MouseEventHandler, useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import styled from "styled-components"

const SecretText = styled.div`
  position: relative;

  .content {
    filter: blur(10px);
    cursor: pointer;
  }

  &:after {
    content: "☝";
    position: absolute;
    top: calc(50% - 28px); // accounts for height of icon itself
    left: 50%;
    font-size: var(--font-size-large);
    filter: saturate(0);
    opacity: 0.6;
    cursor: pointer;
  }

  &:hover,
  &:focus-within {
    &:after {
      display: none;
    }
    .content {
      filter: blur(0);
      cursor: auto;
    }
  }
`

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
          onClick={handleCopy}
          className={classNames(hasHovered ? "text-white" : "text-black", "cursor-pointer")}
        >
          <CopyIcon className="mr-2 inline" /> <span>{t("Copy to clipboard")}</span>
        </button>
      </div>

      <SecretText
        className="secret bg-black-secondary h-72 rounded p-2"
        onMouseEnter={(e) => {
          setHasHovered(true)
          onMouseEnter && onMouseEnter(e)
        }}
      >
        <div className="content flex flex-wrap">
          {mnemonic.split(" ").map((word, i) => (
            <span
              className="bg-black-tertiary text-body-secondary mx-2 my-2 rounded-lg px-4 py-3"
              key={`mnemonic-${i}`}
            >
              {word}
            </span>
          ))}
        </div>
      </SecretText>
    </>
  )
}
