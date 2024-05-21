import { Token } from "@talismn/chaindata-provider"
import { classNames } from "@talismn/util"
import { FC, useMemo } from "react"
import { useTranslation } from "react-i18next"

export const TokenTypePill: FC<{ type: Token["type"]; className?: string }> = ({
  type,
  className,
}) => {
  const { t } = useTranslation()

  const label = useMemo(() => {
    switch (type) {
      case "evm-uniswapv2":
        return t("UNIV2")
      case "evm-erc20":
        return t("ERC20")
      case "evm-native":
        return t("Native")
      default:
        // unsupported for now
        return null
    }
  }, [t, type])

  if (!label) return null

  return (
    <span
      className={classNames(
        "text-body-disabled rounded-sm border px-2 py-1 text-[1rem]",
        className
      )}
    >
      {label}
    </span>
  )
}
