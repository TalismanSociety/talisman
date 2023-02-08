import { notify } from "@talisman/components/Notifications"
import { CheckIcon, CopyIcon } from "@talisman/theme/icons"
import { classNames } from "@talismn/util"
import { MouseEventHandler, useState } from "react"
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
  const [hasCopied, setHasCopied] = useState(false)
  const [hasHovered, setHasHovered] = useState(false)

  return (
    <>
      <span
        className="inline-block py-4 text-sm"
        onClick={() => {
          if (hasHovered && !hasCopied) {
            window.navigator.clipboard.writeText(mnemonic)
            notify({
              title: "Copied to clipboard",
              type: "success",
            })
          }
        }}
      >
        <span className={classNames(hasHovered ? "text-white" : "text-black", "cursor-pointer")}>
          <CopyIcon className="mr-2 inline" /> <span>Copy to clipboard</span>
        </span>
      </span>

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
              className="bg-black-tertiary text-body-secondary mx-2 my-2 rounded-lg py-3 px-4"
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
