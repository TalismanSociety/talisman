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
      case "substrate-native":
      case "evm-native":
      case "sol-native":
        return t("NATIVE")
      case "evm-erc20":
        return "ERC20"
      case "evm-uniswapv2":
        return "UNI V2"

      case "substrate-assets":
        return "HUB"
      case "substrate-dtao":
        return "DTAO"
      case "substrate-foreignassets":
        return "FOREIGN"
      case "substrate-psp22":
        return "PSP22"
      case "substrate-tokens":
        return "ORML"
      case "substrate-hydration":
        return "HYDRATION"

      case "sol-spl":
        return "SPL"
    }
  }, [t, type])

  if (!label) return null

  return (
    <span
      data-testid="component-token-pill"
      className={classNames(
        "text-body-disabled rounded-xs border px-2 py-1 text-[1rem]",
        className,
      )}
    >
      {label}
    </span>
  )
}
