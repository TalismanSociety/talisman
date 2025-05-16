import { classNames } from "@talismn/util"
import { useMemo } from "react"

type AssetPercentageChangeProps = {
  priceChange: string | null | undefined
  isError?: boolean
  isLoading?: boolean
}

export const AssetPercentageChange = ({
  priceChange,
  isLoading,
  isError,
}: AssetPercentageChangeProps) => {
  const num = parseFloat(priceChange || "0")

  const formattedValue = useMemo(() => {
    const truncatedValue = num.toFixed(1)
    return num > 0 ? `+${truncatedValue}` : truncatedValue
  }, [num])

  if (isError) return null

  if (isLoading || !priceChange) {
    return <div className="bg-grey-700 rounded-xs h-[1.6rem] w-[6rem] animate-pulse" />
  }

  return (
    <div className={classNames(num < 0 ? "text-red-500" : "text-green-500")}>{formattedValue}%</div>
  )
}
