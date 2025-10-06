import { ArrowDownIcon, ArrowUpIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { useMemo } from "react"

import { RiskAnalysisImageBase, RiskAnalysisPlaceholderImage } from "./RiskAnalysisImageBase"

type AssetImageProps =
  | {
      type: "currency"
      side: "in" | "out"
      imageUrl: string | null | undefined
      name: string
    }
  | {
      type: "nft"
      side: "in" | "out"
      imageUrl: string | null | undefined
      name: string
    }
  | {
      type: "unknown"
      side: "in" | "out"
    }

export const RiskAnalysisAssetImage = (props: AssetImageProps) => {
  const content = useMemo(() => {
    if (props.type === "currency") {
      return (
        <>
          <RiskAnalysisImageBase
            src={props.imageUrl}
            alt={props.name}
            width={40}
            height={40}
            borderRadius="100%"
            type="currency"
          />
        </>
      )
    }

    if (props.type === "nft") {
      return (
        <RiskAnalysisImageBase
          src={props.imageUrl}
          alt={props.name || ""}
          width={40}
          height={40}
          borderRadius={6}
          type="nft"
        />
      )
    }

    return <RiskAnalysisPlaceholderImage type="unknown" width={38} height={38} borderRadius={6} />
  }, [props])

  return (
    <div className="relative">
      {content}

      <div
        className={classNames(
          "absolute -right-4 -top-4 h-10 w-10 rounded-full p-1",
          props.side === "in" && "bg-[#16541D]",
          props.side === "out" && "bg-[#262C54]",
        )}
      >
        {props.side === "in" && <ArrowDownIcon className="text-green h-8 w-8" />}
        {props.side === "out" && <ArrowUpIcon className="h-8 w-8 text-[#6A7AEB]" />}
      </div>
    </div>
  )
}
