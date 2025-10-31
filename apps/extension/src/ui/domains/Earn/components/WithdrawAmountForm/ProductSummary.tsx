import { useWithdrawFundsContext } from "../WithdrawFundsProvider"

export const ProductSummary = () => {
  const { product } = useWithdrawFundsContext()

  if (!product) return null

  return (
    <div className="flex w-full items-center justify-between">
      <div className="text-grey-400">Protocol</div>
      <div>{product.providerId || "Unknown"}</div>
    </div>
  )
}
