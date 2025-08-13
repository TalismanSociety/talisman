import { classNames } from "@talismn/util"
import { FC } from "react"
import { useTranslation } from "react-i18next"

import { MsgSignButtonDot } from "./MsgSignButtonDot"
import { MsgSignButtonEth } from "./MsgSignButtonEth"
import { MsgSignButtonFallback } from "./MsgSignButtonFallback"
import { MsgSignButtonSol } from "./MsgSignButtonSol"
import { MsgSignButtonProps } from "./types"

/**
 * Works only for Solana for now
 *
 * @param param0
 * @returns
 */
export const MsgSignButton: FC<MsgSignButtonProps> = ({
  payload,
  containerId,
  label,
  className,
  disabled,
  onSubmit,
}) => {
  const { t } = useTranslation()

  if (!payload || disabled)
    return (
      <MsgSignButtonFallback
        label={label ?? t("Sign")}
        className={classNames("w-full", className)}
      />
    )

  switch (payload.platform) {
    case "polkadot":
      return (
        <MsgSignButtonDot
          containerId={containerId}
          label={label}
          payload={payload}
          onSubmit={onSubmit}
          className={className}
        />
      )
    case "ethereum":
      return (
        <MsgSignButtonEth
          containerId={containerId}
          label={label}
          payload={payload}
          onSubmit={onSubmit}
          className={className}
        />
      )
    case "solana":
      return (
        <MsgSignButtonSol
          containerId={containerId}
          label={label}
          payload={payload}
          onSubmit={onSubmit}
          className={className}
        />
      )
    default:
      return (
        <MsgSignButtonFallback
          label="Unsupported message type"
          className={classNames("w-full", className)}
        />
      )
  }
}
