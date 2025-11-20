import { bind } from "@react-rxjs/core"
import { base58 } from "@talismn/crypto"
import { CheckIcon, CopyIcon } from "@talismn/icons"
import { deserializeTransaction, txToHumanJSON } from "@talismn/solana"
import { cn } from "@talismn/util"
import { WalletTransaction } from "extension-core"
import { log } from "extension-shared"
import { dump as convertToYaml } from "js-yaml"
import { FC, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { BehaviorSubject } from "rxjs"

import { CodeBlock } from "@talisman/components/CodeBlock"

const subjectDisplayMode = new BehaviorSubject<"yaml" | "json">("yaml")
const [useDisplayMode] = bind(subjectDisplayMode.asObservable())

export const TxHistoryDetailsPayloadDisplayMode = () => {
  const displayMode = useDisplayMode()

  return (
    <div>
      <button
        type="button"
        onClick={() => subjectDisplayMode.next("yaml")}
        className={cn(
          "cursor-pointer",
          displayMode === "yaml" ? "text-body" : "hover:text-grey-300 underline",
        )}
      >
        YAML
      </button>{" "}
      /{" "}
      <button
        type="button"
        onClick={() => subjectDisplayMode.next("json")}
        className={cn(
          "cursor-pointer",
          displayMode === "json" ? "text-body" : "hover:text-grey-300 underline",
        )}
      >
        JSON
      </button>
    </div>
  )
}

export const TxHistoryDetailsPayload: FC<{
  tx: WalletTransaction
}> = ({ tx }) => {
  const { t } = useTranslation()
  const displayMode = useDisplayMode()

  const payload = useMemo(() => {
    if (tx.platform === "solana" && typeof tx.payload === "string") {
      try {
        const decoded = decodeSolanaTx(tx.payload)
        return decoded
      } catch (err) {
        log.error("Failed to decode solana tx payload", { err, payload: tx.payload })
        return tx.payload
      }
    }
    return tx.payload
  }, [tx])

  const code = useMemo(() => {
    try {
      switch (displayMode) {
        case "json":
          return JSON.stringify(payload, null, 2)
        case "yaml":
          return convertToYaml(payload)
        default:
          return typeof payload === "string" ? payload : ""
      }
    } catch (err) {
      log.error("Failed to convert payload", { err, payload })
      return t("Failed to parse payload")
    }
  }, [displayMode, payload, t])

  if (!code) return null

  return (
    <div>
      <CodeBlock code={code} />
      <div className="mt-2 text-right">
        <CopyToClipboard data={code} />
      </div>
    </div>
  )
}

const CopyToClipboard: FC<{ data: string; className?: string }> = ({ data, className }) => {
  const { t } = useTranslation()
  const [isCopied, setIsCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(data).then(() => {
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    })
  }, [data])

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn("text-body-secondary hover:text-body inline-flex items-center", className)}
    >
      {isCopied ? (
        <>
          <CheckIcon className="text-primary mr-2 inline" />
          <span className="text-primary">{t("Copied successfully")}</span>
        </>
      ) : (
        <>
          <CopyIcon className="mr-2 inline" />
          <span>{t("Copy to clipboard")}</span>
        </>
      )}
    </button>
  )
}

const decodeSolanaTx = (encoded: string) => {
  // workaround bugged data encoding from older versions of Talisman
  if (encoded.includes(",")) {
    // 1. Convert CSV string -> Uint8Array
    const byteArray = Uint8Array.from(
      encoded.split(",").map((s) => {
        const n = Number(s.trim())
        if (!Number.isInteger(n) || n < 0 || n > 255) {
          throw new Error(`Invalid byte value: "${s}"`)
        }
        return n
      }),
    )

    // 2. Encode as base58
    encoded = base58.encode(byteArray)
  }

  const tx = deserializeTransaction(encoded)
  return txToHumanJSON(tx)
}
