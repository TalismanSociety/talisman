import { useEffect } from "react"
import { Navigate, useParams } from "react-router-dom"

import { YieldxyzYieldPositions } from "@ui/domains/Earn/yieldxyz/positions/YieldxyzYieldPositions"
import { useAnalytics } from "@ui/hooks/useAnalytics"

export const DashboardYieldxyzYieldPositionsPage = () => {
  const { pageOpenEvent } = useAnalytics()
  const { yieldId, address } = useParams()
  // const [searchParams] = useSearchParams()

  useEffect(() => {
    pageOpenEvent("earn yieldxyz position", { yieldId })
  }, [pageOpenEvent, yieldId])

  if (!yieldId || !address) return <Navigate to="/earn" replace />

  return <YieldxyzYieldPositions yieldId={yieldId} address={address} />

  // return (
  //   <>
  //     <YieldPositionHeader
  //       yieldId={yieldId}
  //       accountAddress={null}
  //       validatorAddress={validatorAddress}
  //     />
  //     <div className="h-4 shrink-0"></div>
  //     <DashboardYieldPositionDetails
  //       yieldId={yieldId}
  //       accountAddress={null}
  //       validatorAddress={validatorAddress}
  //     />
  //   </>
  // )
}

// const YieldPositionHeader: FC<{
//   yieldId: string | undefined
//   accountAddress: string | null
//   validatorAddress: string | null
// }> = ({ yieldId, accountAddress, validatorAddress }) => {
//   const { t } = useTranslation()
//   const navigate = useNavigate()
//   const [searchParams] = useSearchParams()
//   const position = useYieldxyzPosition(yieldId, accountAddress, validatorAddress)

//   const handleBack = useCallback(() => {
//     // Navigate to earn page while preserving current account/folder selection
//     const params = new URLSearchParams()
//     const currentAccount = searchParams.get("account")
//     const currentFolder = searchParams.get("folder")
//     if (currentAccount) params.set("account", currentAccount)
//     if (currentFolder) params.set("folder", currentFolder)
//     const queryString = params.toString()
//     navigate(`/earn${queryString ? `?${queryString}` : ""}`)
//   }, [navigate, searchParams])

//   if (!position) return null

//   const totalValue = position.totalAmountUsd

//   return (
//     <div className="flex h-[4.4rem] w-full items-center gap-8">
//       <div className="flex h-full grow items-center gap-4 overflow-hidden">
//         <IconButton onClick={handleBack}>
//           <ChevronLeftIcon />
//         </IconButton>
//         <AssetLogo
//           url={
//             (position.balances[0] as unknown as { validator?: { logoURI?: string } })?.validator
//               ?.logoURI ||
//             position.product?.metadata.logoURI ||
//             position.balances[0]?.token.logoURI
//           }
//           className="size-[3.6rem]"
//         />
//         <div className="flex grow flex-col gap-2 overflow-hidden">
//           <div className="text-body flex items-center gap-2 truncate text-sm font-bold">
//             <span className="truncate">{position.displayName}</span>
//             <div className="text-body-secondary border-grey-500 rounded-xs shrink-0 border px-2 py-1 text-[0.8rem]">
//               {(position.product?.mechanics.type || "").toLocaleUpperCase()}
//             </div>
//           </div>
//           <div className="text-body-secondary truncate text-xs">
//             <PortfolioAccount address={position.balances[0]?.address} />
//           </div>
//         </div>
//         <div className="flex shrink-0 flex-col gap-2 text-right">
//           <div className="text-body-secondary text-sm">{t("Total")}</div>
//           <div className="text-body text-base font-bold">
//             <FiatFromUsd amount={totalValue} isBalance />
//           </div>
//         </div>
//       </div>
//     </div>
//   )
// }
