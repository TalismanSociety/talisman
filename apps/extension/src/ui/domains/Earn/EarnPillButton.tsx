// import { ZapFastIcon } from "@talismn/icons"
// import { classNames } from "@talismn/util"
// import { FC, useCallback, useMemo, useState } from "react"
// import { useTranslation } from "react-i18next"
// import { useNavigate } from "react-router-dom"

// import { usePortfolioNavigation } from "@ui/domains/Portfolio/usePortfolioNavigation"
// import { useBalances, useToken } from "@ui/state"
// import { IS_POPUP } from "@ui/util/constants"

// import { EarnNetworkPicker } from "./components/EarnNetworkPicker"
// import { useEarnModal } from "./hooks/useEarnModal"
// import { useTokensBySymbol } from "./utils/tokenUtils"

// interface EarnPillButtonProps {
//   tokenId: string
//   onClick?: () => void
//   className?: string
// }

// export const EarnPillButton: FC<EarnPillButtonProps> = ({ tokenId, onClick, className }) => {
//   const { t } = useTranslation()
//   const { open } = useEarnModal()
//   const navigate = useNavigate()
//   const token = useToken(tokenId)
//   const [isNetworkPickerOpen, setIsNetworkPickerOpen] = useState(false)

//   // Get all tokens with the same symbol across different networks
//   const availableTokens = useTokensBySymbol(token?.symbol || "", true)
//   const userBalances = useBalances("owned")
//   const { selectedAccount } = usePortfolioNavigation()

//   // Check if we should show network picker
//   const shouldShowNetworkPicker = useMemo(() => {
//     if (availableTokens.length <= 1) return false

//     // If "All accounts" is selected, show picker if token exists on multiple networks
//     if (!selectedAccount) {
//       return availableTokens.length > 1
//     }

//     // If specific account is selected, check if that account has token on multiple networks
//     const tokensForSelectedAccount = availableTokens.filter((token) => {
//       const balance = userBalances.find({ tokenId: token.id })
//       return balance?.each.some((b) => b.address === selectedAccount.address)
//     })

//     return tokensForSelectedAccount.length > 1
//   }, [availableTokens, selectedAccount, userBalances])

//   const handleClick = useCallback(() => {
//     // Check if we should show network picker
//     if (shouldShowNetworkPicker) {
//       if (IS_POPUP) {
//         // Navigate to network picker page in popup mode
//         navigate(`/select-network?tokenSymbol=${encodeURIComponent(token?.symbol || "")}`)
//       } else {
//         // Show network picker modal in dashboard mode
//         setIsNetworkPickerOpen(true)
//       }
//     } else {
//       // Single network or no multi-network for selected account - proceed directly
//       open({ tokenId })
//     }
//     // Call the optional onClick prop if provided
//     onClick?.()
//   }, [shouldShowNetworkPicker, navigate, token?.symbol, open, tokenId, onClick])

//   const handleNetworkSelect = useCallback(
//     (selectedTokenId: string) => {
//       open({ tokenId: selectedTokenId })
//       setIsNetworkPickerOpen(false)
//     },
//     [open],
//   )

//   const handleNetworkPickerDismiss = useCallback(() => {
//     setIsNetworkPickerOpen(false)
//   }, [])

//   return (
//     <>
//       <button
//         className={classNames(
//           "h-16 rounded-[28px] bg-[#D5FF5C]/10 px-4 text-sm font-light text-[#D5FF5C] hover:bg-[#D5FF5C]/20",
//           className,
//         )}
//         type="button"
//         onClick={handleClick}
//       >
//         <div className="flex items-center gap-2">
//           <ZapFastIcon className="shrink-0 text-base" />
//           <div>{t("Earn")}</div>
//         </div>
//       </button>

//       <EarnNetworkPicker
//         isOpen={isNetworkPickerOpen}
//         tokenSymbol={token?.symbol || ""}
//         onDismiss={handleNetworkPickerDismiss}
//         onSelect={handleNetworkSelect}
//       />
//     </>
//   )
// }
